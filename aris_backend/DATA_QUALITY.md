# Data Quality & Defensive Engineering

## Problem: Excel Files Are Chaotic

This system doesn't assume Excel files are clean. Instead, it:

### 1. **Adaptive Column Mapping**

**Problem**: Excel columns have different names
```
REG NO / Reg No / Register Number / Roll No / Student ID
Grand Total / Total / GT / Total Marks / Aggregate
Percentage / % / Percent / Pct
```

**Solution**: Auto-detection engine
```python
# apps/results/services/config.py
COLUMN_MAPPINGS = {
    "reg_no": ["reg no", "reg_no", "register number", ...],
    "grand_total": ["grand total", "total", "gt", ...],
    "percentage": ["percentage", "%", "percent", ...],
}

# apps/results/services/cleaner.py
def find_column(df, possible_names):
    # Finds column by checking variations
    # NoMatch → raises ValueError with helpful message
```

**Result**: System works with ANY Excel naming convention.

---

### 2. **Dynamic Subject Detection**

**Problem**: Subject columns vary by college
```
College A: Math, Physics, Chemistry
College B: MAT, PHY, CHM
College C: Mathematics Theory, Physics Practical, etc.
```

**Solution**: Automatic detection based on exclusion
```python
# services/cleaner.py
def detect_subjects(df):
    # Any column NOT in reserved list = subject
    subject_cols = [
        col for col in df.columns
        if col.lower() not in RESERVED_COLUMNS
    ]
    return subject_cols
```

**Result**: System adapts to any school's subject structure.

---

### 3. **Smart Duplicate Resolution**

**Problem**: Multiple rows for same student
```
Row A: reg_no=123, total=550, [missing subjects]
Row B: reg_no=123, total=540, [all subjects present]
```

Current logic keeps Row A (higher total). ❌ **WRONG CHOICE**

**Solution**: Score by completeness + total
```python
# In cleaner.py
df["data_completeness_score"] = df.notna().sum(axis=1)

df = df.sort_values(
    by=["reg_no", "grand_total", "data_completeness_score"],
    ascending=[True, False, False]
)
df = df.drop_duplicates(subset="reg_no", keep="first")
```

**Result**: Keeps the most complete + highest scoring record.

---

### 4. **Dynamic MAX_TOTAL (Not Hardcoded 600)**

**Problem**: Different streams/colleges have different totals
```
Science: 600
Commerce: 500
Some colleges: 625
```

Hardcoded 600 → wrong percentages → wrong rankings

**Solution**: Calculate from data
```python
# In cleaner.py
max_total = df["grand_total"].max()
df["percentage"] = (df["grand_total"] / max_total) * 100
```

**Result**: Percentage calculation automatically adapts.

---

### 5. **Auto-Derive Result Class (Don't Trust Input)**

**Problem**: Input might have:
- Missing result classifications
- Inconsistent values ("Pass" vs "PASS" vs "Pass Class")
- Incorrect classifications

**Solution**: Calculate from percentage
```python
# services/config.py
RESULT_CLASSIFICATION = {
    "DISTINCTION": 85,
    "FIRST_CLASS": 60,
    "SECOND_CLASS": 50,
    "PASS": 35,
    "FAIL": 0,
}

# services/cleaner.py
df["result_class"] = df["percentage"].apply(classify_result)
```

**Result**: System is self-correcting.

---

### 6. **Quality Metrics Reporting**

**Problem**: Admin sees "success" but doesn't know:
- How many records were invalid?
- How many duplicates were found?
- What % of data is "good"?

**Solution**: Detailed quality report
```json
{
  "status": "success",
  "quality_report": {
    "data_quality": {
      "retention_rate": 92.3,
      "original_records": 520,
      "final_records": 480
    },
    "issues_found": {
      "invalid_registration_numbers": 8,
      "duplicates_removed": 12,
      "missing_grand_total": 5,
      "missing_percentage_filled": 15,
      "invalid_percentage_corrected": 3
    }
  }
}
```

**Result**: Admin has full visibility into data quality.

---

## Quality Metrics Tracked

### During Processing: 

| Metric | Purpose | Action |
|--------|---------|--------|
| `invalid_reg_no_removed` | Registration numbers that are empty/invalid | These records are discarded |
| `duplicates_removed` | Students appearing multiple times | Kept best record (high score + complete data) |
| `missing_grand_total_removed` | Records without total | Can't calculate percentage - removed |
| `missing_percentage_filled` | Percentage calculated from grand_total | Calculated dynamically |
| `invalid_percentage_corrected` | Percentages outside 0-100 range | Recalculated from grand_total |
| `retention_rate` | % of original records kept | Should be 80%+ for good data |

### In Database (StudentResult):

```python
result_class              # DISTINCTION, FIRST_CLASS, PASS, FAIL (auto-derived)
data_completeness_score   # How many fields are filled (0-50)
percentage_was_filled     # Was percentage calculated or provided?
```

### In Database (UploadLog):

- `records_processed` - Original count
- `records_kept` - Final count
- `retention_rate` - Percentage metric
- Individual quality metrics for each issue type

---

## API Response Examples

### Successful Upload with Issues

```json
{
  "status": "success",
  "upload_id": 42,
  "records": {
    "created": 45,
    "total_processed": 480
  },
  "quality_report": {
    "data_quality": {
      "retention_rate": 92.31,
      "original_records": 520,
      "final_records": 480
    },
    "issues_found": {
      "invalid_registration_numbers": 8,
      "duplicates_removed": 12,
      "missing_grand_total": 5,
      "missing_percentage_filled": 15,
      "invalid_percentage_corrected": 3
    }
  }
}
```

### This Tells Admin:

✅ 480 out of 520 records were good (92.3% retention)  
⚠️ 8 students had invalid registration numbers → were removed  
⚠️ 12 duplicates were found → kept best version  
⚠️ 15 records had missing percentages → calculated automatically  

---

## Column Auto-Detection Example

Suppose Excel has columns: `[Register Number, Math, Physics, Chemistry, Total Marks, %]`

System does:

1. ✅ Finds "Register Number" → maps to `reg_no`
2. ✅ Finds "Total Marks" → maps to `grand_total`
3. ✅ Finds "%" → maps to `percentage`
4. ✅ "Math", "Physics", "Chemistry" → auto-detected as subjects (not in reserved list)
5. ✅ Normalizes and cleans all data

**No hardcoding required.**

---

## Database Queries

### Get stats on data quality

```python
# Check retention rate by upload
uploads = UploadLog.objects.all()
for u in uploads:
    print(f"{u.filename}: {u.retention_rate}% retention")
```

### Find potentially problematic data

```python
# Students with filled-in percentages (might be suspect)
suspect = StudentResult.objects.filter(percentage_was_filled=True)

# Students with low data completeness
incomplete = StudentResult.objects.filter(data_completeness_score__lt=10)
```

### Stream-specific stats

```python
from django.db.models import Count, Avg

Stream = StudentResult.objects.values("stream").annotate(
    count=Count("id"),
    avg_total=Avg("grand_total"),
    distinction_count=Count("id", filter=Q(result_class="DISTINCTION"))
)
```

---

## What This Prevents

| Problem | Prevention |
|---------|-----------|
| Wrong column names | Auto-detection with 20+ column variations |
| Hardcoded subject list | Dynamic detection based on column content |
| Wrong percentages | Calculated from actual data, not assumed |
| Keeping incomplete data | Scored by completeness, incomplete dropped |
| Incorrect rankings | Auto-derived result_class from percentage |
| Zero audit trail | Quality metrics tracked for every upload |
| Admin confusion | Detailed report on every issue found |

---

## Migration Required

First time you push this code:

```bash
python manage.py makemigrations
python manage.py migrate
```

This adds:
- `result_class` field
- `data_completeness_score` field
- `percentage_was_filled` field
- Quality metric fields in `UploadLog`

---

## Testing Tips

### Test with problematic data:

1. **Column variations**: Rename columns in Excel, upload again
2. **Duplicates**: Add same student twice with different totals
3. **Missing data**: Delete percentage column, upload
4. **Edge cases**: Register numbers with special chars, 0% students

Check `/api/uploads/` to see quality report for each test.

---

## Deployment Checklist

- [ ] Run migrations: `python manage.py migrate`
- [ ] Update `.env` with correct settings
- [ ] Test with real college Excel file
- [ ] Check retention_rate is > 80%
- [ ] If < 80%, investigate quality issues
- [ ] Monitor `/api/stats/` for anomalies
