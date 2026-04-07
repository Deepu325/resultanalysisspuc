# PRODUCTION EDGE CASES - Deep Validation

## What Changed: 7 Hidden Problems Fixed

This update adds **production-grade validation** for edge cases that break naive systems.

### The Real Excel Header
```
SR.NO. | REG NO | SATS NO. | ENROLLMENT NO. | STUDENT NAME | SECT | K/H/S | 
ENGLISH | PART-1 TOTAL | SUB1 | SUB2 | SUB3 | SUB4 | PART-2 TOTAL | 
GRAND TOTAL | RESULT | CLASS | PERCENTAGE
```

Looks clean. **It's dangerous.**

---

## 1. **Multiple Identifier Problem** 🔴

### The Risk
```
REG NO        ✅ (primary key - use this)
SATS NO       ❌ (don't use)  
ENROLLMENT NO ❌ (don't use)
```

If your system accidentally switches to SATS NO:
- 500 students become 500 duplicates
- Analytics explode
- You lose trust

### What System Does Now
✅ **Validates**: Only uses REG NO  
✅ **Warns**: If SATS NO or ENROLLMENT NO detected  
✅ **Tracks**: `alternate_identifiers_found` count  

### API Response
```json
{
  "alternate_identifiers_found": 1,
  "warnings": [
    "⚠️ File contains alternate identifiers (SATS NO, ENROLLMENT NO). Using REG NO only."
  ]
}
```

---

## 2. **Section Mismatch Problem** 🔴

### The Risk
```
Your code: df["section"] = df["reg_no"].str[2:4]  → Extracts "A1"
But Excel also has: SECT = "B2"

Which one is truth?

❌ If wrong: Section analytics become meaningless
```

### What System Does Now
✅ **Validates**: Compares extracted section vs provided SECT  
✅ **Warns**: If they don't match  
✅ **Tracks**: `section_mismatches` count  
✅ **Uses**: Provided SECT if available, else extracted  

### Example
```
Student 123: REG NO = "A1ENG001" → section_extracted = "EN"
           SECT = "A"  
           → MISMATCH DETECTED
```

### API Response
```json
{
  "section_mismatches": 12,
  "warnings": [
    "⚠️ 12 students have section mismatch between provided section and extracted section"
  ]
}
```

**Admin should investigate**: Which is correct?

---

## 3. **Subject Detection Failure** 🔴

### The Risk

Old logic:
```python
subject_cols = [col for col in df.columns if col not in RESERVED_COLUMNS]
```

With real header, this picks up:
```
❌ "PART-1 TOTAL"  ← NOT a subject!
❌ "PART-2 TOTAL"  ← NOT a subject!
✅ "ENGLISH"       ← OK
✅ "SUB1, SUB2..."  ← OK
```

### What System Does Now

**Step 1**: Exclude by keyword
```python
subject_cols = [
    col for col in df.columns
    if col not in RESERVED_COLUMNS
    AND not any(keyword in col.lower() for keyword in EXCLUDE_KEYWORDS)
]
```

**Step 2**: Validate by content (numeric check)
```python
def is_subject_column(df, col):
    numeric_ratio = pd.to_numeric(df[col], errors="coerce").notna().sum() / len(df)
    return numeric_ratio > 0.8  # If > 80% numeric, it's a subject
```

**Result**: PART-1 TOTAL is correctly excluded (text = "PART-1 TOTAL", not numeric)

✅ **Tracks**: Better subject detection  
✅ **Prevents**: Misclassification of totals  

---

## 4. **K/H/S Column Confusion** 🔴

### The Risk
```
Column: "K/H/S"

What is this?
❌ Kannada / Hindi / Sanskrit (language choice - not a subject)
❌ If treated as subject: Every student gets random language code as "marks"
```

### What System Does Now
✅ **Validates**: Numeric check  
✅ **Detects**: K/H/S is mostly text → excludes  
✅ **Prevents**: Misclassification  

---

## 5. **RESULT vs CLASS Conflict** 🔴

### The Risk
```
Excel has: RESULT = "PASS"       CLASS = "FIRST CLASS"

System asks: Which one is truth?

❌ Old: Might trust wrong one
```

### What System Does Now
✅ **Ignores**: Both RESULT and CLASS columns  
✅ **Derives**: From percentage only  
✅ **Prevents**: Confusion  

---

## 6. **Part Totals Mismatch** 🔴

### The Risk
```
PART-1 TOTAL = 250
PART-2 TOTAL = 300
GRAND TOTAL  = 520  ← But 250 + 300 = 550!

Silently wrong data → percentages wrong → rankings wrong
```

### What System Does Now
✅ **Validates**: Calculates PART-1 + PART-2  
✅ **Checks**: Does it equal GRAND TOTAL?  
✅ **Warns**: If mismatch found  
✅ **Tracks**: `total_mismatches` count  

### API Response
```json
{
  "total_mismatches": 8,
  "warnings": [
    "⚠️ 8 students have mismatched part totals (PART-1 + PART-2 ≠ GRAND TOTAL)"
  ]
}
```

---

## 7. **Percentage Validation** 🔴

### The Risk
```
Even if PERCENTAGE column exists:
- It might not match calculated percentage
- Could be wrong: 95% when actual = 78%
- Could be corrupt: "99.5%" or text garbage
```

### What System Does Now
✅ **Calculates**: Correct percentage from grand_total  
✅ **Compares**: With provided percentage  
✅ **Tolerance**: ±1% (allows rounding differences)  
✅ **Warns**: If mismatch > 1%  
✅ **Fixes**: Recalculates if invalid (outside 0-100)  
✅ **Tracks**: `percentage_mismatches` count  

### Example
```
Provided: 78.5%
Calculated: 76.2%
Difference: 2.3% > 1% → MISMATCH DETECTED
```

### API Response
```json
{
  "percentage_mismatches": 15,
  "invalid_percentage_corrected": 3,
  "warnings": [
    "⚠️ 15 students have percentage mismatch with calculated value",
    "⚠️ 3 percentage values were outside 0-100 range and were recalculated"
  ]
}
```

---

## New API Responses

### Success (No Issues)
```json
{
  "status": "success",
  "upload_id": 42,
  "records": {"created": 150, "total_processed": 480},
  "quality_report": {
    "data_quality": {...},
    "issues_found": {
      "section_mismatches": 0,
      "total_mismatches": 0,
      "percentage_mismatches": 0,
      "alternate_identifiers_found": 0
    }
  }
}
```

### Success With Warnings (Expected)
```json
{
  "status": "success_with_warnings",
  "upload_id": 42,
  "records": {"created": 150, "total_processed": 480},
  "quality_report": {
    "data_quality": {...},
    "issues_found": {
      "section_mismatches": 12,
      "total_mismatches": 8,
      "percentage_mismatches": 15,
      "alternate_identifiers_found": 1
    }
  },
  "warnings": [
    "⚠️ 12 students have section mismatch...",
    "⚠️ 8 students have mismatched part totals...",
    "⚠️ 15 students have percentage mismatch...",
    "⚠️ File contains alternate identifiers..."
  ]
}
```

**HTTP Status**: 207 (Multi-Status) - Success but check warnings

---

## Database Tracking

### New UploadLog Fields
```python
section_mismatches          # Section extraction conflicts
total_mismatches            # PART-1 + PART-2 ≠ GRAND TOTAL
percentage_mismatches       # Provided % ≠ Calculated %
alternate_identifiers_found # SATS NO, ENROLLMENT NO present
```

### Example Query
```python
# Find uploads with warnings
problematic = UploadLog.objects.filter(
    section_mismatches__gt=0
) | UploadLog.objects.filter(
    total_mismatches__gt=0
) | UploadLog.objects.filter(
    percentage_mismatches__gt=0
)

for upload in problematic:
    print(f"{upload.filename}: {upload.section_mismatches} section issues")
```

---

## Configuration

### New Variables in config.py

```python
EXCLUDE_KEYWORDS = [
    "total",      # Exclude "PART-1 TOTAL"
    "grand",      # Exclude "GRAND TOTAL"
    "result",     # Exclude "RESULT"
    "class",      # Exclude "CLASS"
    "percentage", # Exclude "PERCENTAGE"
    "percent",
    "grade",
    "rank",
    "remarks",
    "notes",
    "comments",
    "date",
    "time",
]

NUMERIC_THRESHOLD = 0.8  # If > 80% numeric values, it's a subject

OTHER_IDENTIFIERS = [
    "sats no",
    "enrollment number",
    "enrollment no",
]
```

If your school uses different column names:
- Add to `EXCLUDE_KEYWORDS` if they're being misclassified
- Add to `RESERVED_COLUMNS` for metadata columns
- Edit `NUMERIC_THRESHOLD` if boundary subjects exist

---

## Admin Interface

New Admin fieldset: **"Data Validation Warnings"**

Shows:
- section_mismatches
- total_mismatches
- percentage_mismatches
- alternate_identifiers_found

These are **read-only** but highlighted for investigation.

---

## When to Worry

| Metric | Threshold | Action |
|--------|-----------|--------|
| section_mismatches | > 10% | Investigate section extraction |
| total_mismatches | > 5% | Check PART-1 + PART-2 = GRAND TOTAL |
| percentage_mismatches | > 5% | Verify percentage calculation |
| alternate_identifiers_found | > 0 | Only REG NO should be used |

---

## Production Deployment

### New Migration
```bash
python manage.py makemigrations
python manage.py migrate
```

Adds fields:
- UploadLog.section_mismatches
- UploadLog.total_mismatches  
- UploadLog.percentage_mismatches
- UploadLog.alternate_identifiers_found

### Update Status Choices
```python
STATUS_CHOICES = [
    ("PENDING", "Pending"),
    ("SUCCESS", "Success"),
    ("SUCCESS_WITH_WARNINGS", "Success With Warnings"),  # NEW
    ("FAILED", "Failed"),
]
```

---

## Testing

### Test All 7 Edge Cases

```python
# 1. Multiple identifiers
# Add SATS NO column to Excel → should warn

# 2. Section mismatch  
# Extract section: "A1", but SECT = "B2" → should warn

# 3. Subject misdetection
# Keep PART-1 TOTAL in file → should be excluded

# 4. K/H/S column
# Add K/H/S with text values → should be excluded

# 5. RESULT vs CLASS
# Add both columns → should be ignored

# 6. Part totals
# PART-1=250, PART-2=300, GRAND=520 → should warn (250+300≠520)

# 7. Percentage
# Provide 95% but actual=78% → should warn
```

Check `/api/uploads/` response includes all warnings.

---

## This Is Production-Grade

✅ **Assumes**: Data is broken until proven otherwise  
✅ **Validates**: Every assumption  
✅ **Warns**: For suspicious patterns  
✅ **Fixes**: What can be auto-corrected  
✅ **Tracks**: Everything for audit trail  
✅ **Alerts**: Admin to investigate anomalies  

Your system now survives **real-world messy data**.
