import React, { useEffect, useState, useMemo } from 'react'
import { Users } from 'lucide-react'

/**
 * SectionSubjectHeatmap Component
 * 
 * Phase 1: Subject × Grade Distribution Heatmap
 * Shows grade distribution (DISTINCTION, I CLASS, II CLASS, etc.) for each subject
 * 
 * REQUIREMENTS:
 * - Heatmap with color coding based on numeric ranges
 * - Card showing total students in section
 * - Rows: Subjects, Columns: Grade categories
 */

const SectionSubjectHeatmap = ({ section = "PCMB A" }) => {
  const [heatmapData, setHeatmapData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [hoveredCell, setHoveredCell] = useState(null)

  // Fetch heatmap data for selected section
  useEffect(() => {
    const fetchHeatmap = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/heatmap/?section=${encodeURIComponent(section)}`)
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`)
        }
        const json = await response.json()
        setHeatmapData(json.data || null)
        setError(null)
      } catch (err) {
        console.error("Failed to fetch heatmap:", err)
        setError(err.message)
        setHeatmapData(null)
      } finally {
        setLoading(false)
      }
    }

    if (section) {
      fetchHeatmap()
    }
  }, [section])

  // Determine cell color based on numeric value
  const getCellColor = (value) => {
    if (value === 0) return 'bg-gray-100 text-gray-700'           // White/Empty
    if (value <= 5) return 'bg-blue-100 text-blue-900'            // Light Blue (1-5)
    if (value <= 15) return 'bg-blue-400 text-white'              // Medium Blue (6-15)
    if (value <= 25) return 'bg-blue-600 text-white'              // Dark Blue (16-25)
    return 'bg-blue-900 text-white'                                // Very Dark Blue (25+)
  }

  // Grade categories
  const gradeCategories = ['DISTINCTION', 'I CLASS', 'II CLASS', 'III CLASS', 'CENTUMS', 'FAIL']

  // Calculate total students (use maximum total from any subject - represents full class enrollment)
  const totalStudents = useMemo(() => {
    if (!heatmapData || !heatmapData.subjects || heatmapData.subjects.length === 0) return 0
    // Get max total across all subjects since not all students take all subjects
    let maxTotal = 0
    heatmapData.subjects.forEach(subject => {
      const subjectTotal = gradeCategories.reduce((sum, grade) => {
        return sum + (subject[grade.toLowerCase()] || 0)
      }, 0)
      maxTotal = Math.max(maxTotal, subjectTotal)
    })
    return maxTotal
  }, [heatmapData])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading heatmap...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700 font-semibold">Error loading heatmap</p>
        <p className="text-red-600 text-sm">{error}</p>
      </div>
    )
  }

  if (!heatmapData || !heatmapData.subjects || heatmapData.subjects.length === 0) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-blue-700">No data available for section: {section}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header & Total Students Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            {section} - Subject × Grade Distribution
          </h3>
          <p className="text-sm text-gray-600">
            {heatmapData.subjects.length} subjects | Grade-wise student count per subject
          </p>
        </div>

        {/* Total Students Card */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-300 rounded-lg p-4 flex items-center gap-3">
          <Users className="text-blue-600" size={24} />
          <div>
            <p className="text-sm text-gray-600 font-semibold">Total Students</p>
            <p className="text-2xl font-bold text-blue-700">{totalStudents}</p>
          </div>
        </div>
      </div>

      {/* Color Legend */}
      <div className="flex gap-4 flex-wrap text-sm bg-gray-50 p-4 rounded-lg">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-gray-100 border border-gray-300"></div>
          <span>0 = No students</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-blue-100"></div>
          <span>1-5 students</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-blue-400"></div>
          <span>6-15 students</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-blue-600"></div>
          <span>16-25 students</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-blue-900"></div>
          <span>25+ students</span>
        </div>
      </div>

      {/* Heatmap Table */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full border-collapse">
          {/* Header Row */}
          <thead>
            <tr className="bg-gray-100 border-b-2 border-gray-300">
              <th className="px-4 py-3 text-left font-semibold text-gray-900 border-r border-gray-200">Subject</th>
              {gradeCategories.map((grade) => (
                <th key={grade} className="px-4 py-3 text-center font-semibold text-gray-900 border-r border-gray-200">
                  <div className="text-sm">{grade}</div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Data Rows */}
          <tbody>
            {heatmapData.subjects.map((subject, idx) => {
              const subjectTotal = gradeCategories.reduce((sum, grade) => {
                return sum + (subject[grade.toLowerCase()] || 0)
              }, 0)
              return (
                <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-4 py-3 font-semibold text-gray-900 border-r border-gray-200 bg-gray-50 sticky left-0 z-10">
                    {subject.subject}
                  </td>
                  {gradeCategories.map((grade) => {
                    const value = subject[grade.toLowerCase()] || 0
                    return (
                      <td
                        key={`${subject.subject}-${grade}`}
                        className={`px-4 py-3 text-center font-bold border-r border-gray-200 cursor-pointer transition-shadow ${getCellColor(value)} hover:shadow-md`}
                        onMouseEnter={() => setHoveredCell(`${subject.subject}-${grade}`)}
                        onMouseLeave={() => setHoveredCell(null)}
                        title={`${subject.subject} - ${grade}: ${value} students`}
                      >
                        {value}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-gray-600">Total Enrolled</p>
          <p className="text-2xl font-bold text-blue-600">{totalStudents}</p>
        </div>
        <div className="p-4 bg-green-50 rounded-lg">
          <p className="text-sm text-gray-600">Appeared</p>
          <p className="text-2xl font-bold text-green-600">{totalStudents}</p>
        </div>
        <div className="p-4 bg-purple-50 rounded-lg">
          <p className="text-sm text-gray-600">Pass %</p>
          <p className="text-2xl font-bold text-purple-600">
            {totalStudents > 0 ? Math.round(((totalStudents - (heatmapData.subjects.reduce((sum, s) => sum + (s.fail || 0), 0))) / totalStudents) * 100) : 0}%
          </p>
        </div>
        <div className="p-4 bg-orange-50 rounded-lg">
          <p className="text-sm text-gray-600">Promoted</p>
          <p className="text-2xl font-bold text-orange-600">{totalStudents - (heatmapData.subjects.reduce((sum, s) => sum + (s.fail || 0), 0))}</p>
        </div>
      </div>
    </div>
  )
}

export default SectionSubjectHeatmap
