# MIGRATION GUIDE - Defensive Engineering Upgrade

## Overview

This upgrade adds:
- Auto-detection of column names
- Quality metrics tracking
- Smart duplicate resolution
- Auto-derived result classes
- Comprehensive audit trails

## Database Changes

### New Fields in StudentResult

```python
result_class       # CharField: DISTINCTION, FIRST_CLASS, PASS, FAIL, INCOMPLETE
data_completeness_score  # IntegerField: Score (0-50)
percentage_was_filled    # BooleanField: Was % calculated?
```

### Enhanced UploadLog

```python
records_kept              # IntegerField: How many records survived
invalid_reg_no_removed    # IntegerField: Count
duplicates_removed        # IntegerField: Count
missing_grand_total_removed  # IntegerField: Count
missing_percentage_filled # IntegerField: Count
invalid_percentage_corrected # IntegerField: Count
retention_rate            # FloatField: Quality percentage
```

### New Database Indexes

- StudentResult on `result_class` field (for queries by classification)
- UploadLog on `status` field (for filtering uploads)

## Migration Steps

### 1. **Backup Your Database**

```bash
# If using SQLite (development):
cp db.sqlite3 db.sqlite3.backup

# If using production database, follow your provider's backup procedure
```

### 2. **Pull Code Changes**

```bash
git pull origin main  # or your branch
```

### 3. **Create Migrations**

```bash
python manage.py makemigrations
```

This will create files in `apps/results/migrations/` with SQL changes.

### 4. **Review Migration**

```bash
python manage.py sqlmigrate results 0002  # Check the SQL that will run
```

### 5. **Apply Migrations**

```bash
python manage.py migrate
```

This applies the database schema changes. Existing data is preserved:

- `result_class` defaults to "INCOMPLETE" for existing students
- `data_completeness_score` defaults to 0
- `percentage_was_filled` defaults to False
- New UploadLog fields default to 0

### 6. **Populate Result Classes (Optional but Recommended)**

```bash
python manage.py shell
```

```python
from apps.results.models import StudentResult
from apps.results.services.cleaner import classify_result

# Update all existing students with calculated result_class
for student in StudentResult.objects.all():
    if student.percentage:
        student.result_class = classify_result(student.percentage)
        student.save(batch_size=100)
```

### 7. **Update Admin**

Restart Django server:
```bash
python manage.py runserver
```

The admin interface now shows quality metrics for each upload and result.

## Testing After Migration

### 1. Verify Tables Changed

```bash
python manage.py migrate --plan  # See what was applied
```

### 2. Test New Functionality

```python
python manage.py shell

# Check that result_class is populated
from apps.results.models import StudentResult
s = StudentResult.objects.first()
print(f"Result Class: {s.result_class}")

# Check new UploadLog fields
from apps.results.models import UploadLog
log = UploadLog.objects.first()
print(f"Retention Rate: {log.retention_rate}%")
```

### 3. Test Upload with New Code

```bash
# Try uploading a test Excel file
# Check /api/uploads/ for quality metrics
curl http://localhost:8000/api/uploads/ | python -m json.tool
```

## Reverting (If Needed)

If you need to rollback:

```bash
# See migration history
python manage.py showmigrations results

# Rollback to previous migration
python manage.py migrate results 0001  # Goes back 1 step

# Remove new code from server
git checkout HEAD~1  # or your previous commit
```

## Files Changed

### Python Code Changes

| File | Type | Changes |
|------|------|---------|
| `services/config.py` | NEW | Column mappings, result classification |
| `services/cleaner.py` | MODIFIED | Complete rewrite with defensive patterns |
| `services/analyzer.py` | MODIFIED | Returns quality metrics tuple |
| `models.py` | MODIFIED | New fields for quality tracking |
| `api/views.py` | MODIFIED | Returns quality report |
| `api/serializers.py` | MODIFIED | Exposes quality fields |
| `admin.py` | MODIFIED | Shows quality metrics |

### Documentation Files (No Code)

- `DATA_QUALITY.md` - NEW: Quality system explanation
- `DEFENSIVE_ENGINEERING.md` - NEW: Pattern explanations
- `QUICKSTART.md` - UPDATED: Quality metrics info

## Performance Impact

### Positive Changes:
- ✅ More indexes on frequently queried fields
- ✅ Better query performance on result_class, status

### No Negative Changes:
- ✅ Same file processing speed
- ✅ No ORM query count increase
- ✅ Database size increase: ~10-20% (new fields)

## Common Issues During Migration

### Issue: "Table already exists" error

**Cause**: Partial migration from previous attempt

**Fix**:
```bash
python manage.py migrate --fake results 0001
python manage.py migrate results
```

### Issue: "Column does not exist" after migration

**Cause**: Django code loaded before migration complete

**Fix**:
```bash
python manage.py migrate
python manage.py runserver
```

### Issue: Admin shows "has no attribute" errors

**Cause**: Admin.py references fields not yet migrated

**Fix**: Restart Python/Django server after migration

## Data Validation After Migration

### Check result_class distribution

```python
python manage.py shell

from django.db.models import Count
from apps.results.models import StudentResult

distribution = StudentResult.objects.values('result_class').annotate(
    count=Count('id')
).order_by('result_class')

for row in distribution:
    print(f"{row['result_class']}: {row['count']} students")
```

### Check for orphaned records

```python
# Should be 0 - indicates data integrity
orphans = StudentResult.objects.filter(result_class__isnull=True)
print(f"Records without result_class: {orphans.count()}")
```

### Check upload metrics

```python
from apps.results.models import UploadLog

uploads = UploadLog.objects.all()
for u in uploads:
    if u.retention_rate:
        print(f"{u.filename}: {u.retention_rate}% retention")
```

## Post-Migration Tasks

### 1. Update Documentation

- [ ] Update team docs with new column variation support
- [ ] Document expected column names per school
- [ ] Create troubleshooting guide

### 2. Monitor Metrics

- [ ] Check `/api/uploads/` regularly
- [ ] Watch for retention_rate < 70%
- [ ] Alert on high duplicate rates

### 3. Test Real Files

- [ ] Upload sample Excel from each school
- [ ] Verify quality metrics make sense
- [ ] Check result classifications

### 4. Backup & Archive

- [ ] Archive old database
- [ ] Document migration timestamp
- [ ] Update deployment checklist

## Rollback Procedure

If issues arise:

```bash
# 1. Stop application
kill %gunicorn_process%

# 2. Rollback database
python manage.py migrate results 0001

# 3. Revert code
git checkout previous-tag

# 4. Restart
python manage.py runserver
```

## Next Steps

After successful migration:

1. **Monitor** - Watch quality metrics for a week
2. **Adjust** - Tune column mappings if needed
3. **Document** - Update runbooks with new API responses
4. **Train** - Show team the new quality reports

---

**Estimated Migration Time**: 5-10 minutes (mostly waiting for database)  
**Downtime Required**: ~1 minute (during migration)  
**Rollback Time**: 2-3 minutes if needed  

Questions? See DATA_QUALITY.md or DEFENSIVE_ENGINEERING.md
