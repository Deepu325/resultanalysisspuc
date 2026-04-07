# QUICK START GUIDE
# ================================================================================

## 1. INITIAL SETUP

# Navigate to backend
cd aris_backend

# Create & activate virtual environment
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Run migrations (includes new quality tracking fields)
python manage.py makemigrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Start server
python manage.py runserver

# Access:
# - Admin: http://localhost:8000/admin
# - API: http://localhost:8000/api/
# - Quality metrics are now tracked on every upload!

## 2. DEVELOPMENT ENVIRONMENT

# Your .env is already configured with:
# - DEBUG=True (for development)
# - FRONTEND_URL=http://localhost:5173 (Vite default)
# - Local SQLite database

## 3. VITE FRONTEND INTEGRATION

# Frontend .env:
VITE_API_URL=http://127.0.0.1:8000/api

# Example API call in Vue/React:
const API = import.meta.env.VITE_API_URL;

fetch(`${API}/upload/`, {
  method: 'POST',
  body: formData
});

## 4. UPLOADING EXCEL FILES

Requirements (Production-Grade Auto-Detection):
- File must have "SCIENCE" and "COMMERCE" sheets
- Sheets need registration number, total marks columns
- Columns can have ANY of these names:
  * REG NO, Reg No, Register Number, Roll No, Student ID, etc.
  * Grand Total, Total, GT, Total Marks, Aggregate, etc.
  * Percentage, %, Percent, Pct, etc.
- System auto-detects & adapts ✅
- File max size: 5MB

Example curl:
curl -X POST http://localhost:8000/api/upload/ \
  -F "file=@results.xlsx"

Response includes quality report:
- retention_rate: What % of records were valid
- invalid_registration_numbers: How many removed
- duplicates_removed: Kept best record for each student
- missing_percentage_filled: How many we calculated
- invalid_percentage_corrected: Data we fixed

👉 Use this to identify problematic Excel files!

## 5. API ENDPOINTS

POST   /api/upload/                 # Upload Excel file
GET    /api/results/                # List all results (with filtering)
GET    /api/results/<reg_no>/       # Get single result
GET    /api/uploads/                # Upload history
GET    /api/stats/                  # Statistics

## 7. DATA QUALITY (CRITICAL!)

Check your upload quality at /api/uploads/

Expected metrics:
- retention_rate: 80-95% is healthy
- duplicates_removed > 0: Normal (students in multiple sheets)
- invalid_percentage_corrected < 5%: Watch for bad data

If retention_rate < 70%:
1. Check Excel file structure
## 9. COMMON ISSUES

Issue: "CORS error" from frontend
Fix: Check FRONTEND_URL in .env matches your frontend URL

Issue: "No such table" error
Fix: Run migrations -> python manage.py migrate

Issue: File upload fails with "Cannot find columns"
Fix: Check DATA_QUALITY.md for column name variations

Issue: retention_rate very low (< 50%)
Fix: Your Excel might have wrong structure. See DATA_QUALITY.md

Issue: "Duplicates removed: 50+"
Fix: Students appearing in multiple sheets. This is normal.
# Run with Gunicorn
pip install gunicorn
gunicorn config.wsgi:application --bind 0.0.0.0:8000

## 7. COMMON ISSUES

Issue: "CORS error" from frontend
Fix: Check FRONTEND_URL in .env matches your frontend URL

Issue: "No such table" error
Fix: Run migrations -> python manage.py migrate

Issue: File upload fails
Fix: Check file size and sheet names (must be SCIENCE, COMMERCE)

Issue: Port 8000 already in use
Fix: python manage.py runserver 8001

## 8. FILE STRUCTURE REMINDER

aris_backend/
├── config/settings/      # Settings files (base, dev, prod)
├── apps/results/         # Main app
│   ├── api/              # API views, serializers, urls
│   ├── services/         # Core logic (excel_reader, cleaner, analyzer)
│   ├── models.py         # Database models
│   └── admin.py          # Django admin setup
├── .env                  # Environment variables
└── manage.py             # Django CLI

# Keep logic out of views!
# Put it in services/ where it belongs.

## 9. IMPORTANT NOTES

✅ Never commit .env to git
✅ Always use environment variables for secrets
✅ Test file uploads with various Excel files
✅ Keep CORS settings strict in production
✅ Monitor file upload sizes
✅ Validate all Excel data before processing

---
For detailed documentation, see README.md
