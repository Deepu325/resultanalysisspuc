# 🏃 QUICK START COMMANDS

## Run the System Right Now

### 1️⃣ Start the Development Server
```bash
cd d:\spuc-RA ARIS\aris_backend
python manage.py runserver
```

**Output should show:**
```
Starting development server at http://127.0.0.1:8000/
Quit the server with CONTROL-C.
```

### 2️⃣ Access the System

**API:** http://127.0.0.1:8000/api/
**Admin:** http://127.0.0.1:8000/admin/

```bash
# Test in another terminal:
curl http://127.0.0.1:8000/api/uploads/
```

### 3️⃣ Upload a Test File

**Option A: Using curl**
```bash
cd d:\spuc-RA ARIS\aris_backend
curl -X POST http://127.0.0.1:8000/api/upload/ \
  -F "file=@test_edge_cases.xlsx"
```

**Option B: Using Python**
```python
import requests

with open('test_edge_cases.xlsx', 'rb') as f:
    files = {'file': f}
    response = requests.post('http://127.0.0.1:8000/api/upload/', files=files)
    print(response.json())
```

**Option C: Using Browser**
1. Visit http://127.0.0.1:8000/admin
2. Login with your superuser credentials
3. Navigate to UploadLog
4. Or use the API frontend interface

### 4️⃣ View Quality Metrics

```bash
# List all uploads with quality metrics
curl http://127.0.0.1:8000/api/uploads/ | python -m json.tool

# Get specific upload details
curl http://127.0.0.1:8000/api/uploads/1/ | python -m json.tool

# List all student results
curl http://127.0.0.1:8000/api/results/ | python -m json.tool
```

### 5️⃣ Check Admin Interface

1. Visit http://127.0.0.1:8000/admin
2. Click "Upload logs" to see files with metrics
3. Click on a file to see detailed metrics
4. Click "Student results" to see imported records

---

## Environment Setup (One-Time)

### If You Haven't Already:

```bash
# Create virtual environment
python -m venv venv
source venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt

# Apply database migrations
python manage.py migrate

# Create superuser (admin account)
python manage.py createsuperuser
# Follow prompts (username, email, password)

# Create test data
python create_test_file.py
```

---

## Troubleshooting Commands

### Database Issues
```bash
# Show current migration status
python manage.py showmigrations

# Run migrations
python manage.py migrate

# Reset database (WARNING: deletes all data!)
python manage.py flush
```

### Django Shell (For Testing)
```bash
python manage.py shell

# Inside shell:
from apps.results.models import StudentResult, UploadLog
print(f"Students: {StudentResult.objects.count()}")
print(f"Uploads: {UploadLog.objects.count()}")

# Check latest upload quality
latest = UploadLog.objects.latest('uploaded_at')
print(f"Quality Score: {latest.data_quality_score}")
print(f"Section Mismatches: {latest.section_mismatches}")
print(f"Percentage Mismatches: {latest.percentage_mismatches}")
```

### Check Installation
```bash
# Verify Django installed
python -c "import django; print(f'Django {django.__version__}')"

# Verify dependencies
pip list | grep -E "Django|djangorestframework|pandas"

# Test imports
python -c "from apps.results.services import cleaner; print('✓ Cleaner OK')"
```

---

## Common Tasks

### Generate Test File with Different Data
```bash
# Edit create_test_file.py to add your test cases
# Then run:
python create_test_file.py
```

### Upload Your Own Excel File
```bash
curl -X POST http://127.0.0.1:8000/api/upload/ \
  -F "file=@your_file.xlsx"
```

### Export Results
```bash
python manage.py dumpdata apps.results.StudentResult > results_export.json
python manage.py dumpdata apps.results.UploadLog > uploads_export.json
```

### Check Specific Results
```bash
# Find records with DISTINCTION
curl "http://127.0.0.1:8000/api/results/?class=DISTINCTION" | python -m json.tool

# Find records from specific upload
curl "http://127.0.0.1:8000/api/results/?upload_id=1" | python -m json.tool
```

---

## Performance Monitoring

### Check Response Times
```bash
# Measure upload performance
import time
start = time.time()
# upload a file
print(f"Upload took: {time.time() - start:.2f}s")
```

### Check Database Stats
```bash
python manage.py shell

from apps.results.models import StudentResult, UploadLog
print(f"Total students: {StudentResult.objects.count()}")
print(f"Total uploads: {UploadLog.objects.count()}")

# Find uploads with warnings
warnings = UploadLog.objects.filter(status='SUCCESS_WITH_WARNINGS')
print(f"Uploads with warnings: {warnings.count()}")
```

---

## Production Deployment (Quick)

### Using Gunicorn
```bash
# Install Gunicorn
pip install gunicorn

# Run production server
export DJANGO_SETTINGS_MODULE=config.settings.prod
gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 4
```

### Using Docker
```bash
# Build image
docker build -t aris-backend .

# Run container
docker run -p 8000:8000 aris-backend
```

---

## Files You Can Test With

### Included Test Files
- `test_edge_cases.xlsx` — 8 records with intentional issues (created by `create_test_file.py`)
- `create_test_file.py` — Script to generate test files
- `test_validation.py` — Script to test full pipeline

### To Test with Your Data
1. Place Excel file in `d:\spuc-RA ARIS\aris_backend`
2. Run: `curl -X POST http://127.0.0.1:8000/api/upload/ -F "file=@yourfile.xlsx"`
3. Check response for quality metrics

---

## API Response Examples

### Successful Upload
```json
{
  "status": "success",
  "quality_report": {
    "data_quality": {
      "retention_rate": 100.0,
      "original_records": 8,
      "final_records": 8,
      "data_quality_score": 87.5
    },
    "issues_found": {
      "invalid_percentage_corrected": 1,
      "section_mismatches": 5
    },
    "classification_summary": {
      "DISTINCTION": 6,
      "FIRST_CLASS": 2
    }
  }
}
```

### Upload with Warnings (HTTP 207)
```json
{
  "status": "success_with_warnings",
  "validation_warnings": {
    "section_conflicts": 5,
    "percentage_corrections": 1
  },
  "quality_report": { ... }
}
```

---

## Logging

### Enable Debug Logging
```python
# In config/settings/dev.py, add:
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'DEBUG',
    },
}
```

### View Logs
```bash
# Django logs go to console when DEBUG=True
python manage.py runserver
# Watch the console output
```

---

## Stop the Server

```bash
# Press Ctrl+C in terminal where server is running
# Or kill the process:
lsof -i :8000  # Find process
kill <PID>     # Kill it
```

---

## Next Steps

✅ **Run Now (Immediate):**
```bash
python manage.py runserver
# Visit http://127.0.0.1:8000
```

✅ **Test Now (Immediate):**
```bash
curl -X POST http://127.0.0.1:8000/api/upload/ -F "file=@test_edge_cases.xlsx"
```

✅ **Deploy Later:**
- Follow DEPLOYMENT_CHECKLIST.md for production

✅ **Integrate Later:**
- Connect your Vite frontend to API endpoints

---

🚀 **You're ready to go!**
