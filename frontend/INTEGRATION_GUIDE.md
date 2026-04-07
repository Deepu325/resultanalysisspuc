"""
ARIS FRONTEND - INTEGRATION GUIDE

Complete setup and integration instructions for the React/Vite frontend.
"""

# INSTALLATION & SETUP

## Prerequisites
- Node.js 16+ 
- npm 8+
- Backend API running on http://127.0.0.1:8000

## Step 1: Navigate to frontend directory
cd frontend

## Step 2: Install dependencies
npm install

## Step 3: Configure environment
Edit .env file:
- VITE_API_URL=http://127.0.0.1:8000/api

## Step 4: Start development server
npm run dev

Visit: http://localhost:5173

---

# PROJECT ARCHITECTURE

## Frontend Structure

frontend/
├── src/
│   ├── api/
│   │   └── client.js (Centralized API client with axios)
│   │
│   ├── auth/
│   │   ├── Login.jsx (Login page)
│   │   └── authContext.jsx (Auth state management)
│   │
│   ├── services/
│   │   ├── uploadService.js (File upload handling)
│   │   └── analyticsService.js (Analytics API calls)
│   │
│   ├── pages/
│   │   ├── Upload.jsx (File upload page)
│   │   ├── Dashboard.jsx (Main dashboard)
│   │   ├── Toppers.jsx (Leaderboard)
│   │   ├── Sections.jsx (Section performance)
│   │   └── Subjects.jsx (Subject analysis)
│   │
│   ├── components/
│   │   ├── Sidebar.jsx (Navigation sidebar)
│   │   ├── Topbar.jsx (Header bar)
│   │   └── Loader.jsx (Reusable UI components)
│   │
│   ├── hooks/
│   │   └── useAnalytics.js (Custom hook for analytics)
│   │
│   ├── store/
│   │   └── store.js (Global state with Context API)
│   │
│   ├── routes/
│   │   └── AppRoutes.jsx (Route definitions)
│   │
│   ├── App.jsx (Main component)
│   ├── main.jsx (Entry point)
│   └── index.css (Tailwind + global styles)

---

# KEY FEATURES IMPLEMENTED

## 1. Centralized API Client (src/api/client.js)
✅ Axios instance with base URL from environment
✅ Automatic authentication token attachment
✅ Global error handling (401 redirects to /login)
✅ Structured API methods for all endpoints

## 2. Authentication System
✅ Login page with username/password
✅ Auth context for state management
✅ Protected routes (redirect to /login if not authenticated)
✅ Token stored in localStorage

## 3. Upload Flow
✅ File validation (size, type)
✅ Drag & drop support
✅ Upload progress indicator
✅ Error handling with clear messages
✅ Redirect to dashboard on success

## 4. Global State Management
✅ Store context for:
  - Current upload_id (persistent localStorage)
  - Analytics data (cached)
  - Loading state
  - Error state
  - Presentation mode toggle

## 5. Analytics Pages
✅ Dashboard
  - Key metrics (total students, pass rate, avg %)
  - Stream performance chart
  - Grade distribution pie chart
  - Key insights

✅ Toppers Page
  - Ranked leaderboard
  - Registration, stream, section, marks, grade
  - Trophy icons for top 3

✅ Sections Page
  - Section performance charts
  - Grade distribution by section
  - Section detail cards

✅ Subjects Page
  - Subject-wise average scores
  - Pass rate trends
  - Detailed subject statistics

## 6. Data Visualization
✅ Recharts integration:
  - Bar charts (stream performance, subject analysis)
  - Pie charts (grade distribution)
  - Line charts (pass rate trends)
  - Responsive and interactive

## 7. UI Components
✅ Loader (spinner, fullscreen)
✅ Error (error message display)
✅ Success (success notification)
✅ Card (white box container)
✅ StatCard (metric display)
✅ Button (with loading state)
✅ Badge (status label)

## 8. Performance Optimizations
✅ Analytics cached in global state
✅ No re-fetching on tab switches
✅ Sidebar visible when disabled (for non-uploaded sections)
✅ Lazy loading of data
✅ Fast API response (<100ms from cache)

## 9. Error Handling
✅ File upload validation
✅ API error responses
✅ Network error handling
✅ Clear error messages
✅ 401 authentication redirect

## 10. Presentation Mode (Optional)
✅ Fullscreen toggle
✅ Hide sidebar in fullscreen
✅ Clean presentation UI

---

# API ENDPOINTS CALLED

All endpoints behind VITE_API_URL:

POST /upload/
  - Upload Excel file
  - Response: upload_id, quality_report, versions

GET /analytics/{upload_id}/
  - Complete analytics
  - Response: toppers, sections, subjects, summary

GET /toppers/{upload_id}/
  - Top 10 students
  - Response: toppers list, total_records

GET /sections/{upload_id}/
  - Section performance
  - Response: sections data, total_sections

GET /subjects/{upload_id}/
  - Subject analysis
  - Response: subjects data, total_subjects

GET /export/excel/{upload_id}/
  - Download Excel file
  - Response: blob (Excel file)

---

# DEVELOPMENT WORKFLOW

## Adding a new page

1. Create page component in src/pages/
2. Add to routes in src/routes/AppRoutes.jsx
3. Add navigation link in src/components/Sidebar.jsx
4. Create API service if needed in src/services/

## Adding a new API call

1. Add method to src/api/client.js
2. Create service wrapper in src/services/
3. Use analyticsService or uploadService in component

## Adding global state

1. Add to useStore hook in src/store/store.js
2. Use in component: const { variable } = useStore()

## Styling

- Tailwind CSS used for styling
- Custom colors in tailwind.config.js
- Global styles in src/index.css

---

# TROUBLESHOOTING

## API Connection Issues
- Check VITE_API_URL in .env
- Ensure backend is running on http://127.0.0.1:8000
- Check browser console for CORS errors

## Upload Fails
- Verify file is .xlsx or .xls
- Check file size (<5MB)
- Check network tab for error response

## Analytics Not Loading
- Check upload_id is set correctly
- Verify analytics snapshot created on backend
- Check API response in network tab

## Styling Issues
- Run: npm install
- Rebuild Tailwind: npm run dev
- Clear browser cache (Ctrl+Shift+Del)

---

# PRODUCTION BUILD

npm run build

Creates optimized dist/ folder for deployment.

Deploy dist/ to web server (nginx, Apache, Vercel, etc).

---

# NEXT STEPS

1. Install dependencies: npm install
2. Start dev server: npm run dev
3. Test upload flow
4. Verify analytics pages
5. Check browser console for errors
6. Test export functionality
