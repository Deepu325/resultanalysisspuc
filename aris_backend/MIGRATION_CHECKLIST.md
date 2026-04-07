# MIGRATION CHECKLIST - From Phase 2 to Phase 3

## Current Status
- ✅ Code changes: Complete
- ⏳ Database migrations: Not yet run
- ⏳ Testing: Pending
- ⏳ Production deployment: Ready after testing

---

## Step 1: Create Migrations

```bash
cd d:\spuc-RA ARIS\aris_backend
python manage.py makemigrations
```

**Expected Output**:
```
Migrations for 'results':
  apps/results/migrations/XXXX_auto_YYYYMMDD_HHMM.py
    - Add field section_mismatches to uploadlog
    - Add field total_mismatches to uploadlog
    - Add field percentage_mismatches to uploadlog
    - Add field alternate_identifiers_found to uploadlog
    - Change field status in uploadlog
```

**Files Affected**:
- `apps/results/migrations/XXXX_auto_*.py` (NEW - Will be created)

---

## Step 2: Review Migration

```bash
python manage.py sqlmigrate results XXXX
```

**Review**: Should see ALTER TABLE statements adding 4 new columns as INTEGER DEFAULT 0

---

## Step 3: Apply Migrations

```bash
python manage.py migrate
```

**Expected Output**:
```
Operations to perform:
  Apply all migrations: admin, auth, contenttypes, results, sessions
Running migrations:
  Applying results.XXXX_auto_YYYYMMDD_HHMM... OK
```

---

## Step 4: Verify Schema

```bash
python manage.py dbshell
```

Then:
```sql
.schema results_uploadlog
```

**Should see**:
```
...
section_mismatches INTEGER NOT NULL DEFAULT 0,
total_mismatches INTEGER NOT NULL DEFAULT 0,
percentage_mismatches INTEGER NOT NULL DEFAULT 0,
alternate_identifiers_found INTEGER NOT NULL DEFAULT 0,
...
```

Type: `.quit` to exit

---

## Step 5: Test Upload with Real Excel

### Generate Test Excel

Use the header you provided:
```
SR.NO | REG NO | SATS NO | ENROLLMENT NO | STUDENT NAME | SECT | K/H/S | 
ENGLISH | PART-1 TOTAL | SUB1 | SUB2 | SUB3 | SUB4 | PART-2 TOTAL | 
GRAND TOTAL | RESULT | CLASS | PERCENTAGE
```

### Upload

```bash
# Start dev server
python manage.py runserver

# In another terminal, upload file
curl -X POST http://localhost:8000/api/upload/ \
  -F "file=@test_data.xlsx"
```

### Check Response

```bash
curl http://localhost:8000/api/uploads/
```

**Expected status**: "success_with_warnings" (if data has issues)

**Expected warnings** (should include):
- ✅ Section mismatches (if SECT ≠ extracted)
- ✅ Part total mismatches (if PART-1 + PART-2 ≠ GRAND TOTAL)
- ✅ Percentage mismatches (if provided ≠ calculated)
- ✅ Alternate identifiers (if SATS NO or ENROLLMENT NO present)

---

## Step 6: Check Admin Interface

Access: http://localhost:8000/admin/

Navigate to: **Results > Upload logs**

Should see:
- ✅ New columns in list display: section_mismatches, total_mismatches
- ✅ New fieldset when viewing upload: "Data Validation Warnings"
- ✅ Metrics populated from your test upload

---

## Validation Checklist

After migration, verify:

- [ ] `makemigrations` created new migration file
- [ ] `migrate` applied successfully
- [ ] 4 new columns exist on UploadLog table
- [ ] Admin interface shows new fields
- [ ] Test upload triggers warnings (if data has issues)
- [ ] API response includes warnings[] array
- [ ] HTTP 207 returned for uploads with warnings
- [ ] DB shows metrics populated correctly
- [ ] No data loss on existing uploads (backward compatible)

---

## Rollback (If Needed)

If something goes wrong:

```bash
# Revert last migration
python manage.py migrate results XXXX_PREVIOUS

# Squash migrations later if needed
python manage.py squashmigrations results
```

---

## Production Deployment

### Database Backup
```bash
# PostgreSQL
pg_dump ARIS_db > aris_backup_$(date +%Y%m%d).sql

# SQLite
cp db.sqlite3 db.sqlite3.backup
```

### Deploy Steps
1. Pull latest code
2. `python manage.py migrate --noinput` (auto-apply on startup)
3. Restart gunicorn/uWSGI
4. Test file upload
5. Monitor admin for warnings

### Zero-Downtime
- Migrations are backward compatible
- New fields default to 0
- Existing uploads still work
- No data transformation needed

---

## Files Changed This Session

```
d:\spuc-RA ARIS\aris_backend\
├── apps/results/
│   ├── models.py                    ✏️ Updated (4 new fields)
│   ├── services/
│   │   ├── config.py                ✏️ Updated (reserved columns, keywords)
│   │   ├── cleaner.py               ✏️ Rewritten (7 validation functions)
│   │   └── analyzer.py              ✏️ Updated (populate new fields)
│   ├── api/
│   │   ├── views.py                 ✏️ Updated (warning system)
│   │   └── serializers.py           ✅ No changes needed
│   ├── admin.py                     ✏️ Updated (show new fields)
│   └── migrations/
│       └── XXXX_auto_*.py           📝 Will be created (new migration)
│
└── PRODUCTION_EDGE_CASES.md         📝 NEW (documentation)
```

---

## Quick Reference

### Migration Commands
```bash
# Create migrations
python manage.py makemigrations

# Show SQL
python manage.py sqlmigrate results XXXX

# Apply migrations
python manage.py migrate

# Revert last migration
python manage.py migrate results XXXX_PREVIOUS

# Create superuser (if needed)
python manage.py createsuperuser
```

### Testing Commands
```bash
# Start dev server
python manage.py runserver

# Upload via API
curl -X POST http://localhost:8000/api/upload/ -F "file=@test.xlsx"

# Check uploads
curl http://localhost:8000/api/uploads/

# Access admin
# Navigate to: http://localhost:8000/admin/
```

---

## Success Criteria

After migration:
- ✅ All 7 edge cases validated
- ✅ Metrics tracked in database
- ✅ Admin can see warnings
- ✅ API returns proper status codes (200 vs 207)
- ✅ Real data handled without crashes
- ✅ System is audit-trail complete

---

## Timeline

| Step | Time | Status |
|------|------|--------|
| Code changes | ✅ 0-5 min | DONE |
| Create migration | ⏳ 1 min | RUN NOW |
| Apply migration | ⏳ 2 min | RUN NOW |
| Test upload | ⏳ 5-10 min | RUN NOW |
| Verify admin | ⏳ 5 min | RUN NOW |
| Deploy to prod | ⏳ 10-15 min | AFTER TESTING |

**Total prep time**: ~30 minutes

---

## Questions?

If migration fails:
1. Check `python manage.py makemigrations` output for errors
2. Check Django logs: `VSCODE_TARGET_SESSION_LOG`
3. Verify models.py changes are syntactically correct
4. Ensure PostgreSQL/SQLite connection is working

If API response is wrong:
1. Verify status field in response
2. Check `api/views.py` for warning logic
3. Review `cleaner.py` quality_metrics structure

If admin doesn't show new fields:
1. Hard refresh browser (Ctrl+Shift+R)
2. Clear browser cache
3. Restart Django dev server
