/**
 * SectionPerformance - Main Container
 * Responsibilities:
 * - Fetch section data from API
 * - Manage component state
 * - Coordinate layout and data flow
 * - Handle loading states
 */

import React, { useState, useEffect, useMemo } from 'react'
import SectionTable from './SectionTable'
import SectionSubjectHeatmap from './SectionSubjectHeatmap'
import MultiSectionHeatmapGrid from './MultiSectionHeatmapGrid'

const SectionPerformance = () => {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedSection, setSelectedSection] = useState('PCMB A') // Single section select
  const [heatmapView, setHeatmapView] = useState('single') // 'single' or 'grid'
  const [heatmapStream, setHeatmapStream] = useState('Science') // For Phase 2 grid view
  const [activeTab, setActiveTab] = useState('analysis') // 'overview', 'analysis', 'metrics'

  // Hardcoded sample data for testing (will replace with API call)
  const SAMPLE_DATA = [
    {
      section: 'PCMB A',
      stream: 'Science',
      enrolled: 52,
      absent: 0,
      appeared: 52,
      distinction: 8,
      first_class: 30,
      second_class: 12,
      pass_class: 0,
      detained: 2,
      promoted: 50,
      pass_percentage: 96,
    },
    {
      section: 'PCMB B',
      stream: 'Science',
      enrolled: 48,
      absent: 2,
      appeared: 46,
      distinction: 5,
      first_class: 28,
      second_class: 10,
      pass_class: 2,
      detained: 1,
      promoted: 45,
      pass_percentage: 98,
    },
    {
      section: 'PCMB C',
      stream: 'Science',
      enrolled: 50,
      absent: 1,
      appeared: 49,
      distinction: 3,
      first_class: 22,
      second_class: 18,
      pass_class: 5,
      detained: 1,
      promoted: 48,
      pass_percentage: 98,
    },
    {
      section: 'PCMB D',
      stream: 'Science',
      enrolled: 45,
      absent: 3,
      appeared: 42,
      distinction: 6,
      first_class: 18,
      second_class: 12,
      pass_class: 4,
      detained: 2,
      promoted: 40,
      pass_percentage: 95,
    },
    {
      section: 'PCMC F',
      stream: 'Science',
      enrolled: 40,
      absent: 1,
      appeared: 39,
      distinction: 4,
      first_class: 22,
      second_class: 10,
      pass_class: 2,
      detained: 1,
      promoted: 38,
      pass_percentage: 97,
    },
    {
      section: 'PCME E',
      stream: 'Science',
      enrolled: 38,
      absent: 2,
      appeared: 36,
      distinction: 2,
      first_class: 16,
      second_class: 12,
      pass_class: 4,
      detained: 2,
      promoted: 34,
      pass_percentage: 94,
    },
    {
      section: 'CEBA G1',
      stream: 'Commerce',
      enrolled: 60,
      absent: 0,
      appeared: 60,
      distinction: 12,
      first_class: 32,
      second_class: 14,
      pass_class: 2,
      detained: 0,
      promoted: 60,
      pass_percentage: 100,
    },
    {
      section: 'CEBA G2',
      stream: 'Commerce',
      enrolled: 58,
      absent: 1,
      appeared: 57,
      distinction: 8,
      first_class: 28,
      second_class: 16,
      pass_class: 4,
      detained: 1,
      promoted: 56,
      pass_percentage: 98,
    },
    {
      section: 'CEBA G3',
      stream: 'Commerce',
      enrolled: 40,
      absent: 1,
      appeared: 39,
      distinction: 3,
      first_class: 14,
      second_class: 12,
      pass_class: 8,
      detained: 2,
      promoted: 37,
      pass_percentage: 95,
    },
    {
      section: 'CSBA G3',
      stream: 'Commerce',
      enrolled: 35,
      absent: 1,
      appeared: 34,
      distinction: 5,
      first_class: 12,
      second_class: 10,
      pass_class: 5,
      detained: 2,
      promoted: 32,
      pass_percentage: 94,
    },
    {
      section: 'SEBA G4',
      stream: 'Commerce',
      enrolled: 50,
      absent: 1,
      appeared: 49,
      distinction: 5,
      first_class: 20,
      second_class: 16,
      pass_class: 6,
      detained: 2,
      promoted: 47,
      pass_percentage: 96,
    },
    {
      section: 'PEBA G6',
      stream: 'Commerce',
      enrolled: 42,
      absent: 0,
      appeared: 42,
      distinction: 4,
      first_class: 18,
      second_class: 14,
      pass_class: 4,
      detained: 2,
      promoted: 40,
      pass_percentage: 95,
    },
    {
      section: 'MSBA G5',
      stream: 'Commerce',
      enrolled: 30,
      absent: 1,
      appeared: 29,
      distinction: 4,
      first_class: 12,
      second_class: 8,
      pass_class: 3,
      detained: 2,
      promoted: 27,
      pass_percentage: 93,
    },
    {
      section: 'MEBA G5',
      stream: 'Commerce',
      enrolled: 32,
      absent: 0,
      appeared: 32,
      distinction: 3,
      first_class: 14,
      second_class: 10,
      pass_class: 3,
      detained: 2,
      promoted: 25,
      pass_percentage: 91,
    },
  ]

  // Simulate API fetch
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        // Fetch from backend API
        const response = await fetch('/api/sections/sample/')
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`)
        }
        const result = await response.json()
        // Extract transformed_data from the response
        const sectionData = result.transformed_data || result || SAMPLE_DATA
        setData(Array.isArray(sectionData) ? sectionData : [])
        setError(null)
      } catch (err) {
        console.error('Failed to load section data:', err)
        // Fallback to sample data if API fails
        setData(SAMPLE_DATA)
        setError(null)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Initialize selected section when data loads
  useEffect(() => {
    if (data.length > 0) {
      setSelectedSection(data[0].section)
    }
  }, [data.length])

  // Filtered data - single section only
  const filteredData = useMemo(() => {
    return data.filter((s) => s.section === selectedSection)
  }, [data, selectedSection])

  // All available sections from data
  const availableSections = useMemo(() => {
    return data.map((s) => s.section).sort()
  }, [data])

  // Handlers for section selection
  const handleSectionSelect = (section) => {
    setSelectedSection(section)
  }

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading section performance data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center bg-white p-8 rounded-lg shadow">
          <p className="text-red-600 font-semibold">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <h1 className="text-3xl font-bold text-gray-900">Section Performance Overview</h1>
          <p className="text-gray-600 mt-2">Real-time performance metrics across all sections</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* No Data Message */}
        {filteredData.length === 0 && data.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8 text-center">
            <p className="text-yellow-800 font-semibold">No data available for selected section</p>
          </div>
        )}

        {/* TAB NAVIGATION */}
        <div className="bg-white rounded-lg shadow-md p-0 mb-8 overflow-hidden">
          <div className="flex border-b border-gray-200">
            {/* Tab 1: Subject Analysis (HEATMAP) - FEATURED */}
            <button
              onClick={() => setActiveTab('analysis')}
              className={`flex-1 px-6 py-4 text-center font-semibold transition-colors ${
                activeTab === 'analysis'
                  ? 'bg-purple-50 text-purple-600 border-b-2 border-purple-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              🔥 Subject & Section Analysis
            </button>
            
            {/* Tab 3: Detailed Metrics */}
            <button
              onClick={() => setActiveTab('metrics')}
              className={`flex-1 px-6 py-4 text-center font-semibold transition-colors ${
                activeTab === 'metrics'
                  ? 'bg-green-50 text-green-600 border-b-2 border-green-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              📋 Detailed Metrics
            </button>
          </div>
        </div>

        {/* TAB CONTENT */}
        
        {/* TAB 1: SUBJECT & SECTION ANALYSIS (HEATMAP) - MAIN FEATURE */}
        {activeTab === 'analysis' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              {/* Header with Section Selector and View Toggle */}
              <div className="flex flex-col gap-4 mb-6">
                {/* Top Row: Section Selector and Details */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-gray-200">
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">📊 Subject & Section Analysis</h2>
                      {filteredData.length > 0 && (
                        <p className="text-sm text-gray-600 mt-1">
                          <span className="font-semibold text-gray-900">{selectedSection}</span>
                          {' • Stream: '}
                          <span className="font-semibold text-gray-900">{filteredData[0]?.stream || 'Unknown'}</span>
                        </p>
                      )}
                    </div>
                    {/* Section Selector (Inline) */}
                    <div className="flex items-center gap-2 md:ml-auto">
                      <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">Switch:</label>
                      <select
                        value={selectedSection}
                        onChange={(e) => handleSectionSelect(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white cursor-pointer font-medium text-sm"
                      >
                        {availableSections.map((section) => (
                          <option key={section} value={section}>
                            {section}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Bottom Row: View Mode Description and Toggle Buttons */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <p className="text-sm text-gray-600">
                    {heatmapView === 'single' 
                      ? '🔍 Single Section View - Pass percentages for all subjects in one section' 
                      : '📈 Full Stream Grid - Compare all sections and subjects at a glance'}
                  </p>
                  
                  {/* View Toggle Buttons */}
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => setHeatmapView('single')}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${
                        heatmapView === 'single'
                          ? 'bg-blue-600 text-white shadow-lg scale-105'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      📍 Single Section
                    </button>
                    <button
                      onClick={() => setHeatmapView('grid')}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${
                        heatmapView === 'grid'
                          ? 'bg-purple-600 text-white shadow-lg scale-105'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      📊 Stream Grid
                    </button>
                  </div>
                </div>
              </div>

              {/* Heatmap Controls - Grid View Only */}
              {heatmapView === 'grid' && (
                <div className="flex gap-3 mb-6 p-3 bg-purple-50 rounded-lg border border-purple-200 flex-wrap items-center">
                  <label className="text-sm font-semibold text-purple-800">Select Stream:</label>
                  <button
                    onClick={() => setHeatmapStream('Science')}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      heatmapStream === 'Science'
                        ? 'bg-green-600 text-white shadow-md'
                        : 'bg-white text-gray-700 border border-purple-300 hover:bg-gray-50'
                    }`}
                  >
                    🔬 Science
                  </button>
                  <button
                    onClick={() => setHeatmapStream('Commerce')}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      heatmapStream === 'Commerce'
                        ? 'bg-blue-700 text-white shadow-md'
                        : 'bg-white text-gray-700 border border-purple-300 hover:bg-gray-50'
                    }`}
                  >
                    💼 Commerce
                  </button>
                </div>
              )}
              
              {/* Heatmap Display */}
              <div className="mt-8">
                {heatmapView === 'single' && <SectionSubjectHeatmap section={selectedSection} />}
                {heatmapView === 'grid' && <MultiSectionHeatmapGrid stream={heatmapStream} />}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: DETAILED METRICS TABLE */}
        {activeTab === 'metrics' && (
          <div className="space-y-6">
            {filteredData.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">📊 Detailed Metrics</h2>
                <SectionTable data={filteredData} />
              </div>
            )}
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default SectionPerformance
