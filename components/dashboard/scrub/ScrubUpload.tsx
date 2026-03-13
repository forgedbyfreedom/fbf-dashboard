'use client'

import { useState, useCallback, useEffect } from 'react'
import DropZone from '@/components/ui/DropZone'

interface ScrubUploadProps {
  orgId: string
  onSessionCreated: (sessionId: string) => void
}

const RULE_FIELDS = [
  { key: 'ID_Status', label: 'ID Status' },
  { key: 'Documentation_Status', label: 'Documentation Status' },
  { key: 'Prior_Relationship', label: 'Prior Relationship' },
  { key: 'Questionnaire_Status', label: 'Questionnaire Status' },
  { key: 'STG_Member', label: 'STG Member (Inmate)' },
  { key: 'Family_Type', label: 'Family Type' },
  { key: 'Visitor_Name', label: 'Visitor Name' },
  { key: 'Inmate_Name', label: 'Inmate Name' },
]

export default function ScrubUpload({ orgId, onSessionCreated }: ScrubUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [previewRows, setPreviewRows] = useState<Record<string, string>[]>([])
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({})
  const [sessionName, setSessionName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState<'upload' | 'map' | 'processing'>('upload')

  // Load saved column mapping
  useEffect(() => {
    fetch('/api/scrub/sessions')
      .then(r => r.json())
      .catch(() => null)
  }, [])

  const parseCSVPreview = useCallback((text: string) => {
    const lines = text.split('\n').filter(l => l.trim())
    if (lines.length === 0) return

    // Parse headers
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
    setCsvHeaders(headers)

    // Parse preview rows (first 5)
    const rows: Record<string, string>[] = []
    for (let i = 1; i < Math.min(lines.length, 6); i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''))
      const row: Record<string, string> = {}
      headers.forEach((h, idx) => {
        row[h] = values[idx] || ''
      })
      rows.push(row)
    }
    setPreviewRows(rows)

    // Auto-map columns that match field names
    const autoMapping: Record<string, string> = {}
    RULE_FIELDS.forEach(field => {
      const exactMatch = headers.find(h => h === field.key)
      if (exactMatch) {
        autoMapping[field.key] = exactMatch
      } else {
        const fuzzyMatch = headers.find(h =>
          h.toLowerCase().replace(/[_\s-]/g, '') === field.key.toLowerCase().replace(/[_\s-]/g, '')
        )
        if (fuzzyMatch) {
          autoMapping[field.key] = fuzzyMatch
        }
      }
    })
    setColumnMapping(autoMapping)
  }, [])

  const handleFileAccepted = useCallback(async (f: File) => {
    setFile(f)
    setError('')
    setSessionName(f.name.replace('.csv', ''))

    const text = await f.text()
    parseCSVPreview(text)
    setStep('map')
  }, [parseCSVPreview])

  const handleMappingChange = (ruleField: string, csvColumn: string) => {
    setColumnMapping(prev => ({
      ...prev,
      [ruleField]: csvColumn,
    }))
  }

  const handleUploadAndProcess = async () => {
    if (!file || !sessionName) return

    setLoading(true)
    setError('')
    setStep('processing')

    try {
      // Upload CSV and create session
      const formData = new FormData()
      formData.append('file', file)
      formData.append('name', sessionName)
      formData.append('column_mapping', JSON.stringify(columnMapping))

      const uploadRes = await fetch('/api/scrub/sessions', {
        method: 'POST',
        body: formData,
      })

      if (!uploadRes.ok) {
        const err = await uploadRes.json()
        throw new Error(err.error || 'Upload failed')
      }

      const { session } = await uploadRes.json()

      // Process the session
      const processRes = await fetch(`/api/scrub/sessions/${session.id}/process`, {
        method: 'POST',
      })

      if (!processRes.ok) {
        const err = await processRes.json()
        throw new Error(err.error || 'Processing failed')
      }

      onSessionCreated(session.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setStep('map')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'processing') {
    return (
      <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-12 text-center">
        <div className="animate-spin w-12 h-12 border-4 border-[#FF6A00] border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-white font-medium">Processing visitor list...</p>
        <p className="text-[#888] text-sm mt-1">Evaluating rules against {previewRows.length > 0 ? 'all' : ''} visitors</p>
      </div>
    )
  }

  if (step === 'map' && file) {
    return (
      <div className="space-y-6">
        {/* Session Name */}
        <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-6">
          <label className="block text-sm font-medium text-[#ccc] mb-2">Session Name</label>
          <input
            type="text"
            value={sessionName}
            onChange={e => setSessionName(e.target.value)}
            className="w-full px-4 py-2.5 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white text-sm"
            placeholder="Name this scrub session"
          />
          <p className="text-xs text-[#555] mt-1">File: {file.name} ({csvHeaders.length} columns detected)</p>
        </div>

        {/* Column Mapping */}
        <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-6">
          <h3 className="text-white font-medium mb-1">Map CSV Columns</h3>
          <p className="text-[#888] text-sm mb-4">
            Map your CSV columns to the fields used by scrub rules. Columns that match automatically are pre-selected.
          </p>

          <div className="grid gap-3">
            {RULE_FIELDS.map(field => (
              <div key={field.key} className="flex items-center gap-4">
                <label className="text-sm text-[#ccc] w-48 shrink-0">{field.label}</label>
                <select
                  value={columnMapping[field.key] || ''}
                  onChange={e => handleMappingChange(field.key, e.target.value)}
                  className="flex-1 px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white text-sm"
                >
                  <option value="">— Not mapped —</option>
                  {csvHeaders.map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>

        {/* Preview Table */}
        {previewRows.length > 0 && (
          <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl overflow-hidden">
            <div className="p-4 border-b border-[#2a2a2a]">
              <h3 className="text-white font-medium">Preview (first {previewRows.length} rows)</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#2a2a2a]">
                    {csvHeaders.slice(0, 8).map(h => (
                      <th key={h} className="px-3 py-2 text-left text-xs text-[#888] font-medium">{h}</th>
                    ))}
                    {csvHeaders.length > 8 && (
                      <th className="px-3 py-2 text-left text-xs text-[#888]">+{csvHeaders.length - 8} more</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, i) => (
                    <tr key={i} className="border-b border-[#1a1a1a]">
                      {csvHeaders.slice(0, 8).map(h => (
                        <td key={h} className="px-3 py-2 text-[#ccc] truncate max-w-[200px]">{row[h]}</td>
                      ))}
                      {csvHeaders.length > 8 && <td className="px-3 py-2 text-[#555]">...</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => { setStep('upload'); setFile(null); setCsvHeaders([]); setPreviewRows([]) }}
            className="px-4 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-[#888] text-sm hover:text-white transition-colors"
          >
            Back
          </button>
          <button
            onClick={handleUploadAndProcess}
            disabled={loading || !sessionName}
            className="px-6 py-2.5 bg-[#FF6A00] text-white rounded-lg text-sm font-medium hover:bg-[#e55f00] transition-colors disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Upload & Process'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-6">
        <h3 className="text-white font-medium mb-4">Upload Visitor List CSV</h3>
        <DropZone
          onFileAccepted={handleFileAccepted}
          accept={{ 'text/csv': ['.csv'] }}
          maxSize={50 * 1024 * 1024}
          label="Drop your visitor list CSV here, or click to browse"
          sublabel="CSV file exported from VisManager (up to 50MB)"
        />
      </div>

      <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-6">
        <h3 className="text-white font-medium mb-2">How it works</h3>
        <ol className="text-sm text-[#888] space-y-2 list-decimal list-inside">
          <li>Upload your visitor list CSV from VisManager</li>
          <li>Map your CSV columns to the scrub rule fields</li>
          <li>Rules automatically evaluate each visitor for denials</li>
          <li>Review results: auto-approved, auto-denied, and manual review</li>
          <li>Override any decision, then export the processed list</li>
        </ol>
      </div>
    </div>
  )
}
