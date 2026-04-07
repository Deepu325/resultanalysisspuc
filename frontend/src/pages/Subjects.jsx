/**
 * Subjects Page
 */

import React, { useEffect, useState } from 'react'
import { useStore } from '../store/store'
import { analyticsService } from '../services/analyticsService'
import { Sidebar } from '../components/Sidebar'
import Topbar from '../components/Topbar'
import { Card, LoaderSpinner, Error, Badge } from '../components/Loader'
import { useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts'

export const SubjectsPage = () => {
  const navigate = useNavigate()
  const { uploadId } = useStore()
  const [subjects, setSubjects] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!uploadId) {
      navigate('/upload')
      return
    }

    const fetchSubjects = async () => {
      setLoading(true)
      const result = await analyticsService.getSubjects(uploadId)
      
      if (result.success) {
        setSubjects(result.data.subjects || {})
      } else {
        setError(result.error)
      }
      
      setLoading(false)
    }

    fetchSubjects()
  }, [uploadId])

  if (loading) return <LoaderSpinner fullscreen />

  const chartData = Object.entries(subjects).map(([subject, data]) => ({
    name: subject,
    average: (data.average_score || 0).toFixed(1),
    max: data.max_score || 0,
    min: data.min_score || 0,
    passRate: (data.pass_rate || 0).toFixed(1),
  }))

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 flex flex-col">
        <Topbar />
        
        <main className="flex-1 overflow-auto p-8">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-800">Subject Analysis</h1>
              <p className="text-gray-600 mt-2">Subject-wise performance metrics and statistics</p>
            </div>

            {error && <Error message={error} />}

            {!error && (
              <div className="space-y-6">
                {/* Average Score Chart */}
                <Card>
                  <h2 className="text-lg font-semibold text-gray-800 mb-6">Average Score by Subject</h2>
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="average" fill="#0066CC" name="Average Score" />
                        <Bar dataKey="max" fill="#16A34A" name="Max Score" />
                        <Bar dataKey="min" fill="#EA8C55" name="Min Score" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-gray-500">No subject data available</p>
                  )}
                </Card>

                {/* Pass Rate Chart */}
                <Card>
                  <h2 className="text-lg font-semibold text-gray-800 mb-6">Pass Rate by Subject</h2>
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="passRate" stroke="#16A34A" name="Pass Rate (%)" />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-gray-500">No pass rate data available</p>
                  )}
                </Card>

                {/* Subject Details */}
                <div>
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">Detailed Subject Analysis</h2>
                  <div className="grid grid-cols-3 gap-4">
                    {Object.entries(subjects).map(([subject, data]) => (
                      <Card key={subject}>
                        <h3 className="font-semibold text-gray-800 mb-4 text-center">{subject}</h3>
                        
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs text-gray-500 font-semibold">STUDENTS</p>
                            <p className="text-2xl font-bold text-primary">{data.total_students}</p>
                          </div>

                          <div>
                            <p className="text-xs text-gray-500 font-semibold">AVERAGE</p>
                            <p className="text-2xl font-bold text-gray-800">{(data.average_score || 0).toFixed(1)}</p>
                          </div>

                          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-200">
                            <div>
                              <p className="text-xs text-gray-500 font-semibold">MAX</p>
                              <p className="text-lg font-bold text-success">{data.max_score}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 font-semibold">MIN</p>
                              <p className="text-lg font-bold text-danger">{data.min_score}</p>
                            </div>
                          </div>

                          <div>
                            <p className="text-xs text-gray-500 font-semibold">PASS RATE</p>
                            <p className="text-lg font-bold">
                              <Badge label={`${(data.pass_rate || 0).toFixed(1)}%`} variant="success" />
                            </p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

export default SubjectsPage
