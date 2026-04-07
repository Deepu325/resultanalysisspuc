# 🎓 ARIS Backend - Student Results Management System

## ✅ PRODUCTION-READY & VERIFIED

A **production-grade Django REST API** that handles Excel file uploads with **automatic data cleaning** and **comprehensive quality tracking**.

**All 7 real-world data problems solved** ✨

## 🚀 Quick Start

### 1. Prerequisites
- Python 3.10+
- pip
- Virtual environment (venv)

### 2. Setup

```bash
# Navigate to backend directory
cd aris_backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file with your configuration
# (Copy from .env template and adjust as needed)

# Run migrations
python manage.py makemigrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Run development server
python manage.py runserver
```

## 📁 Project Structure

```
aris_backend/
├── config/                    # Django core configuration
│   ├── settings/
│   │   ├── base.py           # Shared settings
│   │   ├── dev.py            # Development settings
│   │   └── prod.py           # Production settings
│   ├── urls.py               # Main URL router
│   └── wsgi.py               # WSGI application
│
├── apps/
│   └── results/              # Results app
│       ├── api/
│       │   ├── views.py      # API endpoints
│       │   ├── serializers.py
│       │   └── urls.py
│       ├── services/         # Core business logic
│       │   ├── excel_reader.py
│       │   ├── cleaner.py
│       │   └── analyzer.py
│       ├── models.py
│       ├── admin.py
│       └── utils.py
│
├── .env                       # Environment variables
├── manage.py
└── requirements.txt
```

## 🔧 Environment Variables (.env)

```
DEBUG=True                          # Set to False in production
SECRET_KEY=your-secret-key-here     # Use strong key in production
ALLOWED_HOSTS=127.0.0.1,localhost
FRONTEND_URL=http://localhost:5173  # Vite frontend URL
UPLOAD_DIR=uploads/
MAX_FILE_SIZE=5242880               # 5MB in bytes
```

## 📡 API Endpoints

### Upload File
```
POST /api/upload/
Content-Type: multipart/form-data

Parameters:
- file: Excel file (.xlsx or .xls)

Response:
{
    "status": "success",
    "records_created": 150,
    "total_records": 500,
    "upload_id": 1
}
```

### Get All Results
```
GET /api/results/
Query Parameters:
- stream: SCIENCE or COMMERCE
- section: Section code
- search: Search registration number
- ordering: Sort field (default: -grand_total)
- page: Page number
- page_size: Results per page

Response:
{
    "count": 500,
    "page": 1,
    "page_size": 100,
    "results": [...]
}
```

### Get Single Result
```
GET /api/results/<reg_no>/

Response:
{
    "id": 1,
    "reg_no": "17XXXX001",
    "stream": "SCIENCE",
    "section": "A",
    "percentage": 92.5,
    "grand_total": 555,
    "created_at": "2024-01-15T10:00:00Z",
    "updated_at": "2024-01-15T10:00:00Z"
}
```

### Upload History
```
GET /api/uploads/

Response:
[
    {
        "id": 1,
        "filename": "results.xlsx",
        "status": "SUCCESS",
        "records_processed": 150,
        "error_message": null,
        "uploaded_at": "2024-01-15T10:00:00Z"
    }
]
```

### Statistics
```
GET /api/stats/

Response:
{
    "total_records": 500,
    "by_stream": {
        "SCIENCE": {
            "count": 300,
            "average_total": 480.5
        },
        "COMMERCE": {
            "count": 200,
            "average_total": 420.3
        }
    }
}
```

## 🎯 Excel File Format

Your Excel file must have:
- **Sheet 1**: "SCIENCE" with student records
- **Sheet 2**: "COMMERCE" with student records

Required columns:
- `REG NO` - Registration number (e.g., 17XXXX001)
- `Percentage` - Percentage score
- `Grand Total` - Total marks

## 🏗️ Architecture Principles

### Separation of Concerns
- **Views**: Handle HTTP requests/responses
- **Services**: Contain core business logic
- **Models**: Define data structure
- **Serializers**: Handle data transformation

### Why This Matters
- ✅ Testable code
- ✅ Reusable logic
- ✅ Maintainable architecture
- ✅ Scalable design

## 📦 Production Deployment

### Environment Setup (Production)
```bash
export DJANGO_SETTINGS_MODULE=config.settings.prod
export SECRET_KEY=your-production-secret-key
export DEBUG=False
export ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
```

### Run with Gunicorn
```bash
gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 4
```

### CORS Configuration
Update `FRONTEND_URL` in `.env` to your production frontend URL:
```
FRONTEND_URL=https://yourdomain.com
```

## 🔐 Security Checklist

- [ ] Change `SECRET_KEY` in production
- [ ] Set `DEBUG=False` in production
- [ ] Use HTTPS in production
- [ ] Set `ALLOWED_HOSTS` correctly
- [ ] Use environment variables for sensitive data
- [ ] Enable CSRF protection
- [ ] Configure CORS properly
- [ ] Validate file uploads
- [ ] Use strong database credentials

## 🐛 Debugging

### Enable Debug Logging
Set `DEBUG=True` in `.env` for development

### Check Logs
Django logs are printed to console in development

### Database Migrations
```bash
python manage.py makemigrations
python manage.py migrate
python manage.py showmigrations
```

## 📚 Frontend Integration (Vite)

### .env file in frontend:
```
VITE_API_URL=http://127.0.0.1:8000/api
```

### Usage:
```javascript
const API = import.meta.env.VITE_API_URL;

const uploadFile = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${API}/upload/`, {
        method: 'POST',
        body: formData
    });
    
    return response.json();
};
```

## ❌ Common Mistakes to Avoid

1. **Hardcoding URLs** - Use environment variables
2. **Mixing dev/prod configs** - Use separate settings files
3. **Putting logic in views** - Use service layer
4. **Ignoring validation** - Always validate inputs
5. **Skipping CORS** - Configure properly for frontend
6. **Hardcoding file paths** - Use relative paths with BASE_DIR

## 📞 Support

For issues:
1. Check Django documentation
2. Review service layer for logic errors
3. Check .env variables
4. Verify Excel file format
5. Check CORS configuration

---

**Remember**: This is a production-grade setup. Don't skip steps or cut corners in deployment.
