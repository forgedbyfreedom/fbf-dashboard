'use client'

import { useState, useEffect, useCallback } from 'react'
import DropZone from '@/components/ui/DropZone'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'

interface LabMarker {
  marker: string
  value: number | string
  unit: string
  reference_low: number | null
  reference_high: number | null
  status: 'normal' | 'high' | 'low' | 'critical'
  flag: boolean
}

interface BloodworkResult {
  id: string
  test_date: string
  markers: LabMarker[]
  file_url: string | null
  notes: string | null
  created_at: string
}

interface BloodworkUploadProps {
  clientId: string
  clientName: string
}

const STATUS_COLORS: Record<string, string> = {
  normal: 'text-green-400',
  high: 'text-yellow-400',
  low: 'text-yellow-400',
  critical: 'text-red-400',
}

const STATUS_BG: Record<string, string> = {
  normal: 'bg-green-400/10',
  high: 'bg-yellow-400/10',
  low: 'bg-yellow-400/10',
  critical: 'bg-red-400/10',
}

export default function BloodworkUpload({ clientId, clientName }: BloodworkUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [extractedMarkers, setExtractedMarkers] = useState<LabMarker[] | null>(null)
  const [fileUrl, setFileUrl] = useState<string | null>(null)
  const [testDate, setTestDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [savedResults, setSavedResults] = useState<BloodworkResult[]>([])
  const [loadingResults, setLoadingResults] = useState(true)
  const [expandedResult, setExpandedResult] = useState<string | null>(null)

  const fetchResults = useCallback(async () => {
    try {
      const res = await fetch(`/api/clients/${clientId}/bloodwork`)
      if (res.ok) {
        const data = await res.json()
        setSavedResults(data.results || [])
      }
    } catch {
      // silently fail
    } finally {
      setLoadingResults(false)
    }
  }, [clientId])

  useEffect(() => {
    fetchResults()
  }, [fetchResults])

  const handleFileAccepted = async (file: File) => {
    setError('')
    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const uploadRes = await fetch(`/api/clients/${clientId}/documents`, {
        method: 'POST',
        body: formData,
      })

      if (!uploadRes.ok) throw new Error('File upload failed')

      const { file_url, file_type } = await uploadRes.json()
      setFileUrl(file_url)
      setUploading(false)
      setParsing(true)

      const parseRes = await fetch(`/api/clients/${clientId}/parse-document`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_url, file_type, document_type: 'bloodwork' }),
      })

      const parseData = await parseRes.json()

      if (!parseRes.ok) throw new Error(parseData.error || 'Could not parse bloodwork')

      const markers = Array.isArray(parseData.parsed) ? parseData.parsed : []
      if (markers.length === 0) {
        throw new Error('No lab markers found in the document')
      }

      setExtractedMarkers(markers)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process bloodwork')
    } finally {
      setUploading(false)
      setParsing(false)
    }
  }

  const handleSave = async () => {
    if (!extractedMarkers) return
    setSaving(true)
    setError('')

    try {
      const res = await fetch(`/api/clients/${clientId}/bloodwork`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          test_date: testDate,
          markers: extractedMarkers,
          file_url: fileUrl,
          notes: notes || null,
        }),
      })

      if (!res.ok) throw new Error('Failed to save bloodwork')

      setExtractedMarkers(null)
      setFileUrl(null)
      setNotes('')
      fetchResults()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const inputClass = "w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white text-sm placeholder-[#555] focus:border-[#FF6A00] focus:outline-none"

  const flaggedCount = extractedMarkers?.filter(m => m.flag)?.length || 0

  return (
    <div className="space-y-4">
      {/* Upload / Extracted Preview */}
      {extractedMarkers ? (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-[#D4A017]">AI-Extracted Lab Markers</h4>
            <span className="text-xs text-[#555]">
              {extractedMarkers.length} markers found
              {flaggedCount > 0 && (
                <span className="text-red-400 ml-2">{flaggedCount} flagged</span>
              )}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-xs text-[#555] mb-1">Test Date</label>
              <input
                type="date"
                value={testDate}
                onChange={e => setTestDate(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs text-[#555] mb-1">Notes</label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className={inputClass}
                placeholder="Fasting labs, morning draw..."
              />
            </div>
          </div>

          {/* Markers Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2a2a2a]">
                  <th className="text-left text-xs text-[#555] pb-2 pr-4">Marker</th>
                  <th className="text-right text-xs text-[#555] pb-2 pr-4">Value</th>
                  <th className="text-left text-xs text-[#555] pb-2 pr-4">Unit</th>
                  <th className="text-left text-xs text-[#555] pb-2 pr-4">Reference</th>
                  <th className="text-center text-xs text-[#555] pb-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {extractedMarkers.map((m, i) => (
                  <tr key={i} className={`border-b border-[#1a1a1a] ${m.flag ? 'bg-red-400/5' : ''}`}>
                    <td className="py-2 pr-4 text-white">{m.marker}</td>
                    <td className={`py-2 pr-4 text-right font-mono ${STATUS_COLORS[m.status] || 'text-white'}`}>
                      {m.value}
                    </td>
                    <td className="py-2 pr-4 text-[#888]">{m.unit}</td>
                    <td className="py-2 pr-4 text-[#555] text-xs">
                      {m.reference_low != null && m.reference_high != null
                        ? `${m.reference_low} - ${m.reference_high}`
                        : m.reference_low != null
                        ? `>${m.reference_low}`
                        : m.reference_high != null
                        ? `<${m.reference_high}`
                        : '—'}
                    </td>
                    <td className="py-2 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium capitalize ${STATUS_BG[m.status] || ''} ${STATUS_COLORS[m.status] || 'text-[#888]'}`}>
                        {m.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {error && <p className="text-xs text-red-400 mt-2">{error}</p>}

          <div className="flex gap-2 mt-4">
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Bloodwork'}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => { setExtractedMarkers(null); setFileUrl(null) }}>
              Cancel
            </Button>
          </div>
        </Card>
      ) : (
        <Card>
          <h4 className="text-sm font-semibold text-[#D4A017] mb-3">Upload Bloodwork</h4>
          <p className="text-xs text-[#555] mb-3">
            Upload {clientName}&apos;s lab results. AI will extract every marker automatically.
          </p>
          <DropZone
            onFileAccepted={handleFileAccepted}
            disabled={uploading || parsing}
            label={uploading ? 'Uploading...' : parsing ? 'AI is analyzing labs...' : 'Drop bloodwork PDF or image here'}
            sublabel="PDF or image — AI will extract all lab markers with reference ranges"
          />
          {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
        </Card>
      )}

      {/* Previous Results */}
      {!loadingResults && savedResults.length > 0 && (
        <Card>
          <h4 className="text-sm font-semibold text-[#888] mb-3">Previous Bloodwork</h4>
          <div className="space-y-2">
            {savedResults.map(result => {
              const markers = (result.markers || []) as LabMarker[]
              const flagged = markers.filter(m => m.flag).length
              const isExpanded = expandedResult === result.id

              return (
                <div key={result.id} className="border border-[#2a2a2a] rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedResult(isExpanded ? null : result.id)}
                    className="w-full flex items-center justify-between p-3 hover:bg-[#1a1a1a] transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-white">
                        {new Date(result.test_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      <span className="text-xs text-[#555]">{markers.length} markers</span>
                      {flagged > 0 && (
                        <span className="text-xs text-red-400">{flagged} flagged</span>
                      )}
                    </div>
                    <span className="text-[#555] text-xs">{isExpanded ? 'Hide' : 'Show'}</span>
                  </button>

                  {isExpanded && (
                    <div className="px-3 pb-3">
                      {result.notes && (
                        <p className="text-xs text-[#888] mb-2">Notes: {result.notes}</p>
                      )}
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-[#2a2a2a]">
                              <th className="text-left text-xs text-[#555] pb-2 pr-4">Marker</th>
                              <th className="text-right text-xs text-[#555] pb-2 pr-4">Value</th>
                              <th className="text-left text-xs text-[#555] pb-2 pr-4">Unit</th>
                              <th className="text-left text-xs text-[#555] pb-2 pr-4">Reference</th>
                              <th className="text-center text-xs text-[#555] pb-2">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {markers.map((m, i) => (
                              <tr key={i} className={`border-b border-[#1a1a1a] ${m.flag ? 'bg-red-400/5' : ''}`}>
                                <td className="py-1.5 pr-4 text-white">{m.marker}</td>
                                <td className={`py-1.5 pr-4 text-right font-mono ${STATUS_COLORS[m.status] || 'text-white'}`}>
                                  {m.value}
                                </td>
                                <td className="py-1.5 pr-4 text-[#888]">{m.unit}</td>
                                <td className="py-1.5 pr-4 text-[#555] text-xs">
                                  {m.reference_low != null && m.reference_high != null
                                    ? `${m.reference_low} - ${m.reference_high}`
                                    : '—'}
                                </td>
                                <td className="py-1.5 text-center">
                                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium capitalize ${STATUS_BG[m.status] || ''} ${STATUS_COLORS[m.status] || 'text-[#888]'}`}>
                                    {m.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}
