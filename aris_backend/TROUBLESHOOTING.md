# TROUBLESHOOTING GUIDE

## When Your Excel Upload Fails or Shows Low Quality

### Problem 1: "Cannot find registration number column"

**Symptom**: Upload fails with error about registration column

**Diagnosis**:
```
Missing column message will show what was tried:
Cannot find registration number column. Checked: 
reg no, reg_no, register number, registration number, ...
```

**Solution**:

Check your Excel file for column name. The system tries 20+ variations.

**Fix Options**:

1. **Rename column to standard name**: `REG NO`
2. **Add custom column mapping** (advanced):
   - Edit `apps/results/services/config.py`
   - Add your column name to `COLUMN_MAPPINGS["reg_no"]`
   - Restart Django

**Example**:
```python
# If your Excel has "Student Registration"
COLUMN_MAPPINGS = {
    "reg_no": [
        "reg no",
        "student registration",  # Add this
        ...
    ]
}
```

---

### Problem 2: Retention Rate Very Low (< 50%)

**Symptom**: 
```
"retention_rate": 35.2,
"records_processed": 500,
"records_kept": 176
```

**Diagnosis**:

Check which records were removed:

```json
"issues_found": {
    "invalid_registration_numbers": 120,
    "duplicates_removed": 80,
    "missing_grand_total": 100,
    "missing_percentage_filled": 0,
    "invalid_percentage_corrected": 0
}
```

High `invalid_registration_numbers` or `missing_grand_total` = **bad data**

**Solutions by Issue Type**:

#### A. Too many invalid registration numbers (120+)

**Possible causes**:
- Column contains text like "N/A", "-", blank cells
- Registration format is different than expected
- Wrong column is being mapped

**Fixes**:
1. Manually clean Excel before upload
2. Check if registration column is really the reg column
3. Fill/remove invalid registrations

#### B. Too many missing grand_total (100+)

**Possible causes**:
- Grand total column is empty
- Column name not recognized
- Different name for "total" in your school

**Fixes**:
1. Ensure "Total" column exists in Excel
2. Try common variations: "Total Marks", "Aggregate", "GT"
3. Add to column mapping if unique name

#### C. Many duplicates removed (80+)

**Cause**: Students appear in multiple sheets or rows

**Check**:
```bash
python manage.py shell

from apps.results.models import UploadLog
log = UploadLog.objects.latest('id')
print(f"Duplicates: {log.duplicates_removed}")
print(f"This is normal if students in multiple streams")
```

**Solution**: This is often OK - system keeps best record.

---

### Problem 3: Percentage Seems Wrong

**Symptom**: 
- "invalid_percentage_corrected": 25,
- Some students have percentage > 100 or < 0

**Diagnosis**:

System corrected invalid percentages. Check why:

```python
python manage.py shell

from apps.results.models import StudentResult

# Find students with filled-in percentages
filled = StudentResult.objects.filter(percentage_was_filled=True)
print(f"Percentages we calculated: {filled.count()}")

# Check distribution
for s in filled[:5]:
    print(f"{s.reg_no}: {s.grand_total} → {s.percentage}%")
```

**Possible Causes**:

1. **Percentage column was missing** → System calculated from grand_total
2. **Source data wrong** → Percentage > 100 or < 0
3. **Different max_total** → College uses different total (500 vs 600 vs 625)

**Fixes**:

1. Ensure percentage column exists in Excel if using provided percentages
2. Check that max grand_total makes sense for stream (Science 600, Commerce 500)
3. If using calculated percentages - this is expected behavior ✓

---

### Problem 4: Too Many Duplicates Removed (100+)

**Symptom**:
```
"duplicates_removed": 150,
"final_records": 350,
"original_records": 500
```

**Diagnosis**:

System found many students appearing multiple times.

**Check why**:

```python
python manage.py shell

from django.db.models import Count
from apps.results.models import StudentResult

# If you upload same file twice
# Check if duplicates are in same upload or previous upload

# See which students appear multiple times
duplicates = StudentResult.objects \
    .values('reg_no') \
    .annotate(count=Count('id')) \
    .filter(count__gt=1)

print(f"Students with multiple records: {duplicates.count()}")

# See a sample
for dup in duplicates[:3]:
    students = StudentResult.objects.filter(
        reg_no=dup['reg_no']
    ).order_by('-grand_total')
    
    for s in students:
        print(f"{s.reg_no}: {s.grand_total} ({s.created_at})")
```

**Possible Causes**:

1. **Uploaded same file twice** → Delete duplicate upload
2. **Students in both SCIENCE and COMMERCE sheets** → Normal, system deduplicates
3. **Previous uploads not cleared** → Need to reset database

**Fixes**:

1. **If duplicate upload**: Find older upload in admin, delete records from that upload
2. **If multiple sheets**: This is OK - system keeps the better record
3. **If old data**: Clear database and re-upload clean

---

### Problem 5: Admin Shows "INCOMPLETE" for All Students

**Symptom**:
```python
# In Django admin
50 students show result_class = "INCOMPLETE"
```

**Diagnosis**:

No percentage values to derive classification from.

**Cause**:

Percentage column missing AND grand_total invalid/missing

**Fix**:

1. Check Excel has both "Total" and "Percentage" columns
2. Ensure totals are numeric (not text)
3. Re-upload file

---

### Problem 6: Column Mapping Issues

**You get**:
```
Cannot find grand total column. Checked: 
grand total, total, gt, total marks, ...
```

**Your Excel has**:
```
"Marks Out of 1000"  ← System doesn't know this is total
```

**Fix**:

Edit `apps/results/services/config.py`:

```python
COLUMN_MAPPINGS = {
    "grand_total": [
        "grand total",
        "total",
        "gt",
        "total marks",
        "marks out of 1000",  # ← Add this
        "aggregate",
    ]
}
```

Restart Django:
```bash
python manage.py runserver
```

---

### Problem 7: Subject Columns Are Wrong

**Symptom**:

System detects subjects, but some shouldn't be (like "remarks", "notes")

**Diagnosis**:

Columns not in `RESERVED_COLUMNS` are treated as subjects.

**Fix**:

Edit `apps/results/services/config.py`:

```python
RESERVED_COLUMNS = {
    "reg no", "name", "total", "percentage",
    "remarks",  # ← Add this
    "notes",    # ← Add this
}
```

Restart Django.

---

### Problem 8: Result Class Classification Is Wrong

**Symptom**:
```
Student with 75% shows "SECOND CLASS" (should be "FIRST CLASS")
```

**Check your classification**:

```python
python manage.py shell

from apps.results.services.config import RESULT_CLASSIFICATION
print(RESULT_CLASSIFICATION)

# Output:
# {
#   "DISTINCTION": 85,
#   "FIRST_CLASS": 60,
#   "SECOND_CLASS": 50,
#   "PASS": 35,
#   "FAIL": 0,
# }
```

If classification is wrong, edit `apps/results/services/config.py`:

```python
RESULT_CLASSIFICATION = {
    "DISTINCTION": 90,    # Changed from 85
    "FIRST_CLASS": 70,    # Changed from 60
    "SECOND_CLASS": 50,
    "PASS": 40,           # Changed from 35
    "FAIL": 0,
}
```

Restart and re-process students:

```python
python manage.py shell

from apps.results.models import StudentResult
from apps.results.services.cleaner import classify_result

for s in StudentResult.objects.all():
    s.result_class = classify_result(s.percentage)
    s.save(batch_size=100)
```

---

### Problem 9: Performance Issues (Slow Upload)

**Symptom**: Upload takes > 30 seconds for 500 records

**Diagnosis**:

Check logs:
```bash
python manage.py runserver --verbosity 3
# Look for ORM query count
```

**Optimization**:

Already handled in `analyzer.py` with `update_or_create()`.

If still slow, check:

1. **Database size**: `SELECT COUNT(*) FROM results_studentresult;`
2. **Indexes**: Are migrations applied? `python manage.py showmigrations`
3. **File size**: Is Excel file large? (> 10MB not supported)

---

### Problem 10: Upload Success But No Records Saved

**Symptom**:
```
"status": "success",
"records_created": 0,
"final_records": 0
```

**Diagnosis**:

All records were filtered out. Check quality report:

```json
"issues_found": {
    "invalid_registration_numbers": 500,
    "duplicates_removed": 0,
    "missing_grand_total": 0,
}
```

**Cause**: All registration numbers are invalid

**Fixes**:

1. Check registration number format
2. Excel registration column must map to one of: `reg no`, `registration number`, etc.
3. Registration numbers shouldn't be empty/NaN

---

## Debugging Steps

### Debug Any Upload Issue

```bash
# 1. Check the upload in admin
python manage.py shell

from apps.results.models import UploadLog
log = UploadLog.objects.latest('id')

print(f"Status: {log.status}")
print(f"Processed: {log.records_processed}")
print(f"Kept: {log.records_kept}")
print(f"Retention: {log.retention_rate}%")
print(f"Issues:")
print(f"  Invalid reg_no: {log.invalid_reg_no_removed}")
print(f"  Duplicates: {log.duplicates_removed}")
print(f"  Missing total: {log.missing_grand_total_removed}")
print(f"Error: {log.error_message}")

# 2. See what records were saved
from apps.results.models import StudentResult

results = StudentResult.objects.all()
print(f"\nTotal in database: {results.count()}")

# Sample records
for s in results[:3]:
    print(f"{s.reg_no}: {s.grand_total} ({s.result_class})")
```

### Test Cleaner Directly

```python
python manage.py shell

from apps.results.services.cleaner import clean_data, validate_cleaned_data
import pandas as pd

# Load your Excel manually
df = pd.read_excel("path/to/file.xlsx", sheet_name="SCIENCE")

# Try cleaner
try:
    clean_df, metrics = clean_data(df)
    print("✓ Cleaning successful")
    print(f"Before: {len(df)} records")
    print(f"After: {len(clean_df)} records")
    print(f"Retention: {metrics['retention_rate']}%")
    print(metrics)
except Exception as e:
    print(f"✗ Cleaning failed: {e}")
```

---

## When to Contact Support

- Retention rate consistently < 60%
- Column mapping not working despite adding to config
- Database errors after migration
- Performance degradation with time

**Always provide**:
1. Sample Excel file (anonymized)
2. Full error message
3. Retention rate & quality metrics from latest upload
4. Django version: `python manage.py version`
