'use client'

import { useState } from 'react'
import DropZone from '@/components/ui/DropZone'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'

interface ScanUploadProps {
  clientId: string
  onScanSaved: () => void
}

export default function ScanUpload({ clientId, onScanSaved }: ScanUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<{
    body_fat_pct: string
    lean_mass_lbs: string
    scan_type: string
    scan_date: string
    notes: string
    file_url: string
  } | null>(null)

  const handleFileAccepted = async (file: File) => {
    setError('')
    setUploading(true)

    try {
      // Upload file
      const formData = new FormData()
      formData.append('file', file)

      const uploadRes = await fetch(`/api/clients/${clientId}/documents`, {
        method: 'POST',
        body: formData,
      })

      if (!uploadRes.ok) {
        throw new Error('File upload failed')
      }

      const { file_url, file_type } = await uploadRes.json()

      setUploading(false)
      setParsing(true)

      // AI parse the scan document
      const parseRes = await fetch(`/api/clients/${clientId}/parse-document`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_url, file_type }),
      })

      const parseData = await parseRes.json()

      if (!parseRes.ok) {
        throw new Error(parseData.error || 'Could not parse scan')
      }

      // Try to extract BF% and lean mass from parsed text
      const rawText = parseData.raw_text || ''
      const bfMatch = rawText.match(/(?:body\s*fat|bf|fat\s*%)[:\s]*(\d+\.?\d*)\s*%?/i)
      const lmMatch = rawText.match(/(?:lean\s*(?:body\s*)?mass|lbm|skeletal\s*muscle)[:\s]*(\d+\.?\d*)\s*(?:lbs?|pounds?)?/i)

      // Detect scan type
      let scanType = 'Other'
      if (/inbody/i.test(rawText)) scanType = 'InBody'
      else if (/dexa/i.test(rawText)) scanType = 'DEXA'
      else if (/scale/i.test(rawText)) scanType = 'BF Scale'

      setPreview({
        body_fat_pct: bfMatch?.[1] || '',
        lean_mass_lbs: lmMatch?.[1] || '',
        scan_type: scanType,
        scan_date: new Date().toISOString().split('T')[0],
        notes: '',
        file_url,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process scan')
    } finally {
      setUploading(false)
      setParsing(false)
    }
  }

  const handleSave = async () => {
    if (!preview) return
    setSaving(true)
    setError('')

    try {
      const res = await fetch(`/api/clients/${clientId}/scans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scan_date: preview.scan_date,
          scan_type: preview.scan_type,
          body_fat_pct: preview.body_fat_pct || null,
          lean_mass_lbs: preview.lean_mass_lbs || null,
          notes: preview.notes || null,
          file_url: preview.file_url,
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to save scan')
      }

      setPreview(null)
      onScanSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const inputClass = "w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white text-sm placeholder-[#555] focus:border-[#FF6A00] focus:outline-none"

  if (preview) {
    return (
      <Card>
        <h4 className="text-sm font-semibold text-[#D4A017] mb-3">AI-Extracted Scan Data</h4>
        <p className="text-xs text-[#555] mb-4">Review and edit the extracted values before saving.</p>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-[#555] mb-1">Scan Date</label>
            <input
              type="date"
              value={preview.scan_date}
              onChange={e => setPreview(p => p ? { ...p, scan_date: e.target.value } : null)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs text-[#555] mb-1">Scan Type</label>
            <select
              value={preview.scan_type}
              onChange={e => setPreview(p => p ? { ...p, scan_type: e.target.value } : null)}
              className={inputClass}
            >
              <option value="InBody">InBody</option>
              <option value="DEXA">DEXA</option>
              <option value="BF Scale">BF Scale</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-[#555] mb-1">Body Fat %</label>
            <input
              type="number"
              step="0.1"
              value={preview.body_fat_pct}
              onChange={e => setPreview(p => p ? { ...p, body_fat_pct: e.target.value } : null)}
              className={inputClass}
              placeholder="15.2"
            />
          </div>
          <div>
            <label className="block text-xs text-[#555] mb-1">Lean Mass (lbs)</label>
            <input
              type="number"
              step="0.1"
              value={preview.lean_mass_lbs}
              onChange={e => setPreview(p => p ? { ...p, lean_mass_lbs: e.target.value } : null)}
              className={inputClass}
              placeholder="165.0"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-[#555] mb-1">Notes</label>
            <input
              type="text"
              value={preview.notes}
              onChange={e => setPreview(p => p ? { ...p, notes: e.target.value } : null)}
              className={inputClass}
              placeholder="Fasted, morning scan..."
            />
          </div>
        </div>

        {error && (
          <p className="text-xs text-red-400 mt-2">{error}</p>
        )}

        <div className="flex gap-2 mt-4">
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Scan'}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setPreview(null)}>
            Cancel
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <h4 className="text-sm font-semibold text-[#D4A017] mb-3">Upload Body Scan</h4>
      <DropZone
        onFileAccepted={handleFileAccepted}
        disabled={uploading || parsing}
        label={uploading ? 'Uploading...' : parsing ? 'AI is reading your scan...' : 'Drop InBody/DEXA scan here'}
        sublabel="PDF or image — AI will extract body fat % and lean mass"
      />
      {error && (
        <p className="text-xs text-red-400 mt-2">{error}</p>
      )}
    </Card>
  )
}
