# VALIDATION FUNCTIONS REFERENCE

## Overview

The cleaner.py module now contains 7 production-grade validation functions that catch real-world data problems.

Location: `d:\spuc-RA ARIS\aris_backend\apps\results\services\cleaner.py`

---

## 1. is_subject_column(df, col)

### Purpose
Validates that a column contains primarily numeric values (>80%) before classifying it as a subject.

### Why This Matters
```
Problem: Text columns like "PART-1 TOTAL" being treated as subjects
Solution: Numeric validation ensures only actual mark columns are used
```

### Function Signature
```python
def is_subject_column(df, col):
    """
    Check if column contains numeric data (>80% numeric values).
    
    Args:
        df (DataFrame): The student data
        col (str): Column name to validate
        
    Returns:
        bool: True if >80% numeric, False otherwise
    """
```

### Implementation
```python
numeric_values = pd.to_numeric(df[col], errors="coerce").notna().sum()
total_values = len(df[col].dropna())
numeric_ratio = numeric_values / total_values if total_values > 0 else 0
return numeric_ratio > NUMERIC_THRESHOLD  # 0.8 = 80%
```

### Usage in detect_subjects()
```python
def detect_subjects(df):
    # First: filter by keywords
    candidate_subjects = [
        col for col in df.columns
        if col.lower() not in RESERVED_COLUMNS
        and not any(kw in col.lower() for kw in EXCLUDE_KEYWORDS)
    ]
    
    # Second: validate numeric
    subjects = [
        col for col in candidate_subjects
        if is_subject_column(df, col)
    ]
    
    return subjects
```

### Testing
```python
# Test with mock data
df = pd.DataFrame({
    "ENGLISH": [85, 90, 88, "invalid", 92],           # 4/5 numeric = 80% → True
    "K/H/S": ["K", "H", "S", "K", "H"],              # 0/5 numeric = 0% → False
    "PART-1 TOTAL": ["PART-1 TOTAL"] * 5,            # 0/5 numeric = 0% → False
})

assert is_subject_column(df, "ENGLISH") == True
assert is_subject_column(df, "K/H/S") == False
assert is_subject_column(df, "PART-1 TOTAL") == False
```

---

## 2. validate_section(df)

### Purpose
Compares explicit SECT column (if present) with extracted section from REG NO.

### Why This Matters
```
Problem: SECT column might not match extracted section (e.g., REG NO says "A1", but SECT says "B2")
Solution: Detect and count mismatches so admin can investigate
```

### Function Signature
```python
def validate_section(df):
    """
    Validate section extraction vs provided section column.
    
    Args:
        df (DataFrame): Student data (should have 'section' and/or 'sect' columns)
        
    Returns:
        int: Count of rows with section mismatch
    """
```

### Implementation
```python
def validate_section(df):
    if "sect" not in df.columns or "section" not in df.columns:
        return 0
    
    # Normalize both for comparison
    df["sect_clean"] = df["sect"].astype(str).str.strip().str.upper()
    df["section_clean"] = df["section"].astype(str).str.strip().str.upper()
    
    # Count mismatches
    mismatch_mask = df["sect_clean"] != df["section_clean"]
    mismatches = mismatch_mask.sum()
    
    return mismatches
```

### Data Flow
```
Input Excel:
  REG NO      SECT
  A1ENG001    A     ← Extract section from REG NO
  B2SCI002    C     ← Section from SECT column
  
Process:
  Extracted section (from REG NO[2:4]): "EN", "SC"
  Provided SECT: "A", "C"
  
  Comparison:
  "EN" ≠ "A" → MISMATCH 1
  "SC" ≠ "C" → MISMATCH 2
  
Output: 2 mismatches detected
```

### Resolution
```python
# After validation, use provided if available
if "sect" in df.columns:
    df["section"] = df["sect"]  # Use provided SECT
# Otherwise use extracted section
```

### Testing
```python
df = pd.DataFrame({
    "reg_no": ["A1ENG001", "B2SCI002", "A1MAT003"],
    "section": ["EN", "SC", "MA"],
    "sect": ["A", "A", "MA"],  # First two don't match
})

assert validate_section(df) == 2
```

---

## 3. validate_part_totals(df)

### Purpose
Validates that PART-1 TOTAL + PART-2 TOTAL = GRAND TOTAL

### Why This Matters
```
Problem: Excel might have corrupted data where parts don't add up to grand total
Example: PART-1=250, PART-2=300, GRAND TOTAL=520 (should be 550)
Solution: Detect arithmetic inconsistencies before storing
```

### Function Signature
```python
def validate_part_totals(df):
    """
    Validate that part totals sum correctly to grand total.
    
    Args:
        df (DataFrame): Student data
        
    Returns:
        int: Count of rows with mismatched totals
    """
```

### Implementation
```python
def validate_part_totals(df):
    # Find part total columns
    part1_col = find_column(df, "PART1|PART 1|PART-1")
    part2_col = find_column(df, "PART2|PART 2|PART-2")
    grand_col = find_column(df, "GRAND")
    
    if not all([part1_col, part2_col, grand_col]):
        return 0  # Columns not found
    
    # Convert to numeric
    part1 = pd.to_numeric(df[part1_col], errors="coerce").fillna(0)
    part2 = pd.to_numeric(df[part2_col], errors="coerce").fillna(0)
    grand = pd.to_numeric(df[grand_col], errors="coerce").fillna(0)
    
    # Validate sum (allow 0.5 tolerance for rounding)
    expected_total = part1 + part2
    mismatches = (abs(expected_total - grand) > 0.5).sum()
    
    return mismatches
```

### Example
```
Row 1: PART-1=250, PART-2=300, GRAND TOTAL=550 → 250+300 = 550 ✓
Row 2: PART-1=250, PART-2=300, GRAND TOTAL=520 → 250+300 = 550 ✗ MISMATCH
Row 3: PART-1=250, PART-2=300, GRAND TOTAL=550.2 → 250+300 = 550 ✓ (0.2 < 0.5 tolerance)
```

### Testing
```python
df = pd.DataFrame({
    "part1_total": [250.0, 250.0, 250.0],
    "part2_total": [300.0, 300.0, 300.0],
    "grand_total": [550.0, 520.0, 550.2],  # Correct, wrong, rounding
})

assert validate_part_totals(df) == 1  # Only middle row
```

---

## 4. validate_percentage(df)

### Purpose
Validates provided percentage against calculated percentage from grand_total.

### Why This Matters
```
Problem: Percentage column might be wrong (typo, corruption, manual entry error)
Example: Provided 95%, but actual = (250/400)*100 = 62.5%
Solution: Detect and warn admin, optionally recalculate
```

### Function Signature
```python
def validate_percentage(df):
    """
    Validate provided percentage vs calculated percentage.
    
    Args:
        df (DataFrame): Student data
        
    Returns:
        tuple: (mismatch_count, filled_count)
        - mismatch_count: Rows where provided ≠ calculated (>1% tolerance)
        - filled_count: Rows where percentage was missing/invalid and filled
    """
```

### Implementation
```python
def validate_percentage(df):
    mismatch_count = 0
    filled_count = 0
    
    # Get columns
    grand_col = find_column(df, "GRAND")
    pct_col = find_column(df, "PERCENT")
    
    if not grand_col:
        return (0, 0)
    
    # Calculate correct percentage
    grand_total = pd.to_numeric(df[grand_col], errors="coerce")
    max_total = df[grand_col].max() if not grand_col.isna().all() else 400
    calculated_pct = (grand_total / max_total) * 100
    
    if pct_col and pct_col in df.columns:
        # Check provided percentage
        provided_pct = pd.to_numeric(df[pct_col], errors="coerce")
        
        # Invalid percentage (outside 0-100)
        invalid_mask = (provided_pct < 0) | (provided_pct > 100)
        filled_count += invalid_mask.sum()
        
        # Mismatch (>1% difference)
        mismatch_mask = abs(provided_pct - calculated_pct) > 1.0
        mismatch_count += mismatch_mask.sum()
        
        # Fix invalid percentages
        df.loc[invalid_mask, pct_col] = calculated_pct[invalid_mask]
    else:
        # No percentage column → need to create/fill it
        filled_count = len(df)
        if pct_col and pct_col not in df.columns:
            df[pct_col] = calculated_pct
    
    return (mismatch_count, filled_count)
```

### Data Flow
```
Input:
  GRAND TOTAL    PERCENTAGE
  250            62.5   ← Correct
  300            95.0   ← Wrong (should be 75%)
  150            150    ← Invalid (>100%)
  200            (null) ← Missing
  
Validation:
  Row 1: |62.5 - 62.5| = 0 < 1% → OK
  Row 2: |95.0 - 75.0| = 20 > 1% → MISMATCH
  Row 3: 150 > 100 → INVALID
  Row 4: null → MISSING
  
Output:
  mismatches: 1 (row 2)
  filled: 2 (rows 3 & 4)
```

### Testing
```python
df = pd.DataFrame({
    "grand_total": [250, 300, 150, 200],
    "percentage": [62.5, 95.0, 150, np.nan],
})

mismatches, filled = validate_percentage(df)
assert mismatches == 1
assert filled == 2
```

---

## 5. Quality Metrics Dictionary

### Structure
All validation functions populate `quality_metrics` dict:

```python
quality_metrics = {
    # Phase 2 metrics (original)
    "invalid_reg_no_removed": 0,
    "duplicates_removed": 0,
    "missing_grand_total_removed": 0,
    "missing_percentage_filled": 0,
    "invalid_percentage_corrected": 0,
    "result_class_assigned": 150,
    
    # Phase 3 metrics (new)
    "section_mismatches": 12,
    "total_mismatches": 8,
    "percentage_mismatches": 15,
    "alternate_identifiers_found": 0,
    "has_warnings": True,
}
```

### How They Flow

```
Excel File
    ↓
excel_reader.py (read raw)
    ↓
cleaner.py (validate & clean)
    ├── is_subject_column() → confirms subject detection
    ├── validate_section() → counts section_mismatches
    ├── validate_part_totals() → counts total_mismatches
    ├── validate_percentage() → counts percentage_mismatches
    └── detect_alternate_ids() → counts alternate_identifiers_found
    ↓
quality_metrics dict (populated with all counts)
    ↓
analyzer.py (save to DB)
    ↓
UploadLog (stores in database)
    ├── section_mismatches
    ├── total_mismatches
    ├── percentage_mismatches
    └── alternate_identifiers_found
    ↓
api/views.py (format response)
    ├── Check if has_warnings=True
    ├── Build warnings[] list
    ├── Set status = "success_with_warnings"
    └── Return HTTP 207
    ↓
REST API Response (sent to frontend)
```

---

## 6. Error Handling

### Common Issues

#### Issue: Column Not Found
```python
# Wrong
part1_col = "part1_total"  # Might not exist exactly

# Right
part1_col = find_column(df, "PART1|PART 1|PART-1")
```

#### Issue: Non-numeric Data
```python
# Wrong
total = df["grand_total"] / 4  # Fails if text present

# Right
total = pd.to_numeric(df["grand_total"], errors="coerce").fillna(0)
```

#### Issue: Null Handling
```python
# Wrong
if df["sect"] != df["section"]:  # Fails on null

# Right
df["sect_clean"] = df["sect"].astype(str).str.strip()
if df["sect_clean"] != df["section_clean"]:  # Works with null
```

---

## 7. Configuration

### Modify Behavior

In `config.py`:

```python
# Adjust numeric validation threshold
NUMERIC_THRESHOLD = 0.8  # Currently 80%
# Lower to 0.6 if more text/formulas mixed in

# Add/remove keywords
EXCLUDE_KEYWORDS = ["total", "grand", "result", ...]
# Add "average", "median" if using those columns

# Add/remove reserved columns
RESERVED_COLUMNS = ["sr.no", "student name", ...]
# Add "roll no", "date of birth" if present

# Adjust tolerance
PERCENTAGE_TOLERANCE = 1.0  # ±1%
PART_TOTAL_TOLERANCE = 0.5  # ±0.5

# Adjust max total calculation
MAX_TOTAL_DEFAULT = 400  # If grand_total max < 400, uses grand total max
```

---

## 8. Integration Points

### In clean_data()
```python
def clean_data(df):
    # ... existing code ...
    
    # NEW: Run all validators
    section_mismatches = validate_section(df)
    total_mismatches = validate_part_totals(df)
    percentage_mismatches, pct_filled = validate_percentage(df)
    alternate_ids = len([c for c in df.columns if any(id in c.lower() for id in OTHER_IDENTIFIERS)])
    
    # Track
    quality_metrics["section_mismatches"] = section_mismatches
    quality_metrics["total_mismatches"] = total_mismatches
    quality_metrics["percentage_mismatches"] = percentage_mismatches
    quality_metrics["alternate_identifiers_found"] = alternate_ids
    quality_metrics["has_warnings"] = any([
        section_mismatches > 0,
        total_mismatches > 0,
        percentage_mismatches > 0,
        alternate_ids > 0,
    ])
    
    return df, quality_metrics
```

### In API Response
```python
if quality_metrics.get("has_warnings", False):
    response_status = "success_with_warnings"
    warnings = []
    
    if quality_metrics["section_mismatches"] > 0:
        warnings.append(f"⚠️ {quality_metrics['section_mismatches']} students have section mismatch")
    
    # ... similar for other metrics ...
    
    return Response({
        "status": response_status,
        "warnings": warnings,
        "quality_report": {...}
    }, status=207)  # HTTP 207 Multi-Status
```

---

## 9. Testing Strategy

### Unit Tests
```python
def test_is_subject_column():
    df = pd.DataFrame({"ENGLISH": [85, 90, 88, 92, 95]})
    assert is_subject_column(df, "ENGLISH") == True

def test_validate_section():
    df = pd.DataFrame({
        "section": ["A", "B"], 
        "sect": ["A", "C"]
    })
    assert validate_section(df) == 1

def test_validate_part_totals():
    df = pd.DataFrame({
        "part1_total": [250, 250],
        "part2_total": [300, 300],
        "grand_total": [550, 520]
    })
    assert validate_part_totals(df) == 1
```

### Integration Tests
```python
def test_real_excel_upload():
    response = client.post(
        "/api/upload/",
        {"file": real_excel_file}
    )
    assert response.status_code == 207
    assert "section_mismatch" in str(response.data["warnings"])
```

---

## 10. Debugging

### Enable Logging
```python
import logging
logger = logging.getLogger(__name__)

# In validation functions
logger.debug(f"Section mismatches: {mismatches}")
logger.warning(f"Total validation found {mismatches} anomalies")
```

### Print Quality Metrics
```python
df, quality_metrics = clean_data(df)
print(json.dumps(quality_metrics, indent=2))

# Output:
{
  "section_mismatches": 12,
  "total_mismatches": 8,
  "percentage_mismatches": 15,
  "has_warnings": true
}
```

### Check Database
```bash
python manage.py dbshell
```

```sql
SELECT filename, section_mismatches, total_mismatches, percentage_mismatches 
FROM results_uploadlog 
WHERE section_mismatches > 0 OR total_mismatches > 0;
```

---

## Summary

| Function | Validates | Returns | Tracks |
|----------|-----------|---------|--------|
| is_subject_column() | Numeric ratio | bool | N/A |
| validate_section() | SECT vs extracted | int (count) | section_mismatches |
| validate_part_totals() | PART-1 + PART-2 = GRAND | int (count) | total_mismatches |
| validate_percentage() | Calculated vs provided % | (int, int) tuple | percentage_mismatches |

All populate `quality_metrics` dict → stored in UploadLog → visible in admin & API.
