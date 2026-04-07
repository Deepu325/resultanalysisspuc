# Vite Frontend Template Configuration

## Environment Setup (.env)

```
VITE_API_URL=http://127.0.0.1:8000/api
```

## API Service Module (src/services/api.ts or api.js)

```javascript
const API_URL = import.meta.env.VITE_API_URL;

export const uploadFile = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${API_URL}/upload/`, {
        method: 'POST',
        body: formData,
        credentials: 'include'  // For cookies if needed
    });
    
    if (!response.ok) {
        throw new Error('Upload failed');
    }
    
    return response.json();
};

export const getResults = async (stream = null, section = null, page = 1) => {
    const params = new URLSearchParams();
    if (stream) params.append('stream', stream);
    if (section) params.append('section', section);
    params.append('page', page);
    
    const response = await fetch(`${API_URL}/results/?${params}`, {
        method: 'GET'
    });
    
    return response.json();
};

export const getResult = async (regNo) => {
    const response = await fetch(`${API_URL}/results/${regNo}/`, {
        method: 'GET'
    });
    
    return response.json();
};

export const getStats = async () => {
    const response = await fetch(`${API_URL}/stats/`, {
        method: 'GET'
    });
    
    return response.json();
};

export const getUploadHistory = async () => {
    const response = await fetch(`${API_URL}/uploads/`, {
        method: 'GET'
    });
    
    return response.json();
};
```

## Usage Example (Vue Component)

```vue
<script setup>
import { ref } from 'vue'
import { uploadFile, getResults, getStats } from '@/services/api'

const file = ref(null)
const loading = ref(false)
const results = ref([])
const stats = ref(null)

const handleFileUpload = async () => {
    if (!file.value) return
    
    loading.value = true
    try {
        const result = await uploadFile(file.value)
        console.log('Upload successful:', result)
        
        // Refresh results after upload
        await fetchResults()
        // Refresh stats
        await fetchStats()
    } catch (error) {
        console.error('Upload failed:', error)
    } finally {
        loading.value = false
    }
}

const fetchResults = async () => {
    try {
        const data = await getResults()
        results.value = data.results
    } catch (error) {
        console.error('Failed to fetch results:', error)
    }
}

const fetchStats = async () => {
    try {
        stats.value = await getStats()
    } catch (error) {
        console.error('Failed to fetch stats:', error)
    }
}

onMounted(() => {
    fetchResults()
    fetchStats()
})
</script>

<template>
    <div>
        <input 
            type="file" 
            @change="file = $event.target.files[0]" 
            accept=".xlsx,.xls"
        />
        <button :disabled="loading" @click="handleFileUpload">
            {{ loading ? 'Uploading...' : 'Upload Excel' }}
        </button>
        
        <div v-if="stats">
            <p>Total Records: {{ stats.total_records }}</p>
            <p>Science: {{ stats.by_stream.SCIENCE.count }}</p>
            <p>Commerce: {{ stats.by_stream.COMMERCE.count }}</p>
        </div>
        
        <table>
            <tr>
                <th>Reg No</th>
                <th>Stream</th>
                <th>Grand Total</th>
            </tr>
            <tr v-for="result in results" :key="result.id">
                <td>{{ result.reg_no }}</td>
                <td>{{ result.stream }}</td>
                <td>{{ result.grand_total }}</td>
            </tr>
        </table>
    </div>
</template>
```

## React Example

```jsx
import { useState, useEffect } from 'react'
import { uploadFile, getResults, getStats } from './services/api'

export function ResultsPage() {
    const [file, setFile] = useState(null)
    const [loading, setLoading] = useState(false)
    const [results, setResults] = useState([])
    const [stats, setStats] = useState(null)
    
    const handleUpload = async () => {
        if (!file) return
        
        setLoading(true)
        try {
            await uploadFile(file)
            await fetchResults()
            await fetchStats()
        } catch (error) {
            console.error('Upload failed:', error)
        } finally {
            setLoading(false)
        }
    }
    
    const fetchResults = async () => {
        const data = await getResults()
        setResults(data.results)
    }
    
    const fetchStats = async () => {
        const data = await getStats()
        setStats(data)
    }
    
    useEffect(() => {
        fetchResults()
        fetchStats()
    }, [])
    
    return (
        <div>
            <input 
                type="file" 
                onChange={(e) => setFile(e.target.files[0])}
                accept=".xlsx,.xls"
            />
            <button onClick={handleUpload} disabled={loading}>
                {loading ? 'Uploading...' : 'Upload'}
            </button>
            
            {stats && (
                <div>
                    <p>Total: {stats.total_records}</p>
                </div>
            )}
            
            <table>
                <tbody>
                    {results.map(r => (
                        <tr key={r.id}>
                            <td>{r.reg_no}</td>
                            <td>{r.stream}</td>
                            <td>{r.grand_total}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
```

## CORS Configuration Notes

For local development:
```
FRONTEND_URL=http://localhost:5173
```

For production:
```
FRONTEND_URL=https://yourdomain.com
```

The backend will automatically allow requests from this URL.
