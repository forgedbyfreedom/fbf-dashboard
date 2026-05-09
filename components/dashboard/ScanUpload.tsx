'use client'

import { useState } from 'react'
import DropZone from '@/components/ui/DropZone'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'

interface ExtractedScanData {
  scan_type: string
  body_fat_pct: number | null
  lean_mass_lbs: number | null
  fat_mass_lbs: number | null
  total_weight_lbs: number | null
  skeletal_muscle_mass_lbs: number | null
  body_water_lbs: number | null
  bmi: number | null
  visceral_fat_level: number | null
  basal_metabolic_rate: number | null
  right_arm_lbs: number | null
  left_arm_lbs: number | null
  trunk_lbs: number | null
  right_leg_lbs: number | null
  left_leg_lbs: number | null
}

interface ScanPreview extends ExtractedScanData {
  scan_date: string
  notes: string
  file_url: string
}

interface ScanUploadProps {
  clientId: string
  onScanSaved: () => void
}

const SCAN_TYPE_LABELS: Record<string, string> = {
  inbody: 'InBody',
  dexa: 'DEXA',
  bodpod: 'BodPod',
  calipers: 'Calipers',
  bf_scale: 'BF Scale',
  other: 'Other',
}

export default function ScanUpload({ clientId, onScanSaved }: ScanUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<ScanPreview | null>(null)

  const handleFileAccepted = async (file: File) => {
    setError('')
    setUploading(true)

    try {
      // Upload file
      const formData = new FormData()
      formData.append('file', file)
      formData.append('stage', 'body_scan')

      const uploadRes = await fetch(`/api/clients/${clientId}/documents`, {
        method: 'POST',
        body: formData,
      })

      if (!uploadRes.ok) {
        const errData = await uploadRes.json().catch(() => ({}))
        throw new Error(errData.error || 'File upload failed')
      }

      const { file_url, file_type } = await uploadRes.json()

      setUploading(false)
      setParsing(true)

      // AI parse the scan document with body_scan document type
      const parseRes = await fetch(`/api/clients/${clientId}/parse-document`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_url, file_type, document_type: 'body_scan' }),
      })

      const parseData = await parseRes.json()

      if (!parseRes.ok) {
        throw new Error(parseData.error || 'Could not parse scan')
      }

      // Use AI-extracted structured data directly
      const parsed = parseData.parsed
      if (parsed) {
        setPreview({
          scan_type: parsed.scan_type || 'other',
          body_fat_pct: parsed.body_fat_pct ?? null,
          lean_mass_lbs: parsed.lean_mass_lbs ?? null,
          fat_mass_lbs: parsed.fat_mass_lbs ?? null,
          total_weight_lbs: parsed.total_weight_lbs ?? null,
          skeletal_muscle_mass_lbs: parsed.skeletal_muscle_mass_lbs ?? null,
          body_water_lbs: parsed.body_water_lbs ?? null,
          bmi: parsed.bmi ?? null,
          visceral_fat_level: parsed.visceral_fat_level ?? null,
          basal_metabolic_rate: parsed.basal_metabolic_rate ?? null,
          right_arm_lbs: parsed.right_arm_lbs ?? null,
          left_arm_lbs: parsed.left_arm_lbs ?? null,
          trunk_lbs: parsed.trunk_lbs ?? null,
          right_leg_lbs: parsed.right_leg_lbs ?? null,
          left_leg_lbs: parsed.left_leg_lbs ?? null,
          scan_date: new Date().toISOString().split('T')[0],
          notes: '',
          file_url,
        })
      } else {
        throw new Error('AI did not return structured scan data')
      }
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
          body_fat_pct: preview.body_fat_pct,
          lean_mass_lbs: preview.lean_mass_lbs,
          fat_mass_lbs: preview.fat_mass_lbs,
          total_weight_lbs: preview.total_weight_lbs,
          skeletal_muscle_mass_lbs: preview.skeletal_muscle_mass_lbs,
          basal_metabolic_rate: preview.basal_metabolic_rate,
          visceral_fat_level: preview.visceral_fat_level,
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

  const updateField = (field: keyof ScanPreview, value: string) => {
    setPreview(p => {
      if (!p) return null
      const numFields = [
        'body_fat_pct', 'lean_mass_lbs', 'fat_mass_lbs', 'total_weight_lbs',
        'skeletal_muscle_mass_lbs', 'body_water_lbs', 'bmi', 'visceral_fat_level',
        'basal_metabolic_rate', 'right_arm_lbs', 'left_arm_lbs', 'trunk_lbs',
        'right_leg_lbs', 'left_leg_lbs',
      ]
      if (numFields.includes(field)) {
        return { ...p, [field]: value === '' ? null : parseFloat(value) }
      }
      return { ...p, [field]: value }
    })
  }

  const inputClass = "w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white text-sm placeholder-[#555] focus:border-[#FF6A00] focus:outline-none"

  if (preview) {
    return (
      <Card>
        <h4 className="text-sm font-semibold text-[#D4A017] mb-3">AI-Extracted Scan Data</h4>
        <p className="text-xs text-[#555] mb-4">Review and edit the extracted values before saving.</p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-[#555] mb-1">Scan Date</label>
            <input
              type="date"
              value={preview.scan_date}
              onChange={e => updateField('scan_date', e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs text-[#555] mb-1">Scan Type</label>
            <select
              value={preview.scan_type}
              onChange={e => updateField('scan_type', e.target.value)}
              className={inputClass}
            >
              {Object.entries(SCAN_TYPE_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-[#555] mb-1">Body Fat %</label>
            <input
              type="number"
              step="0.1"
              value={preview.body_fat_pct ?? ''}
              onChange={e => updateField('body_fat_pct', e.target.value)}
              className={inputClass}
              placeholder="15.2"
            />
          </div>
          <div>
            <label className="block text-xs text-[#555] mb-1">Total Weight (lbs)</label>
            <input
              type="number"
              step="0.1"
              value={preview.total_weight_lbs ?? ''}
              onChange={e => updateField('total_weight_lbs', e.target.value)}
              className={inputClass}
              placeholder="185.0"
            />
          </div>
          <div>
            <label className="block text-xs text-[#555] mb-1">Lean Mass (lbs)</label>
            <input
              type="number"
              step="0.1"
              value={preview.lean_mass_lbs ?? ''}
              onChange={e => updateField('lean_mass_lbs', e.target.value)}
              className={inputClass}
              placeholder="165.0"
            />
          </div>
          <div>
            <label className="block text-xs text-[#555] mb-1">Fat Mass (lbs)</label>
            <input
              type="number"
              step="0.1"
              value={preview.fat_mass_lbs ?? ''}
              onChange={e => updateField('fat_mass_lbs', e.target.value)}
              className={inputClass}
              placeholder="20.0"
            />
          </div>
          <div>
            <label className="block text-xs text-[#555] mb-1">Skeletal Muscle (lbs)</label>
            <input
              type="number"
              step="0.1"
              value={preview.skeletal_muscle_mass_lbs ?? ''}
              onChange={e => updateField('skeletal_muscle_mass_lbs', e.target.value)}
              className={inputClass}
              placeholder="80.0"
            />
          </div>
          <div>
            <label className="block text-xs text-[#555] mb-1">Body Water (lbs)</label>
            <input
              type="number"
              step="0.1"
              value={preview.body_water_lbs ?? ''}
              onChange={e => updateField('body_water_lbs', e.target.value)}
              className={inputClass}
              placeholder="100.0"
            />
          </div>
          <div>
            <label className="block text-xs text-[#555] mb-1">BMI</label>
            <input
              type="number"
              step="0.1"
              value={preview.bmi ?? ''}
              onChange={e => updateField('bmi', e.target.value)}
              className={inputClass}
              placeholder="24.5"
            />
          </div>
          <div>
            <label className="block text-xs text-[#555] mb-1">Visceral Fat Level</label>
            <input
              type="number"
              step="0.1"
              value={preview.visceral_fat_level ?? ''}
              onChange={e => updateField('visceral_fat_level', e.target.value)}
              className={inputClass}
              placeholder="5"
            />
          </div>
          <div>
            <label className="block text-xs text-[#555] mb-1">BMR (kcal)</label>
            <input
              type="number"
              step="1"
              value={preview.basal_metabolic_rate ?? ''}
              onChange={e => updateField('basal_metabolic_rate', e.target.value)}
              className={inputClass}
              placeholder="1800"
            />
          </div>

          {/* Segmental Analysis */}
          <div className="col-span-2 md:col-span-3 mt-2">
            <p className="text-xs text-[#888] font-semibold mb-2">Segmental Lean Mass</p>
          </div>
          <div>
            <label className="block text-xs text-[#555] mb-1">Right Arm (lbs)</label>
            <input
              type="number"
              step="0.1"
              value={preview.right_arm_lbs ?? ''}
              onChange={e => updateField('right_arm_lbs', e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs text-[#555] mb-1">Left Arm (lbs)</label>
            <input
              type="number"
              step="0.1"
              value={preview.left_arm_lbs ?? ''}
              onChange={e => updateField('left_arm_lbs', e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs text-[#555] mb-1">Trunk (lbs)</label>
            <input
              type="number"
              step="0.1"
              value={preview.trunk_lbs ?? ''}
              onChange={e => updateField('trunk_lbs', e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs text-[#555] mb-1">Right Leg (lbs)</label>
            <input
              type="number"
              step="0.1"
              value={preview.right_leg_lbs ?? ''}
              onChange={e => updateField('right_leg_lbs', e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs text-[#555] mb-1">Left Leg (lbs)</label>
            <input
              type="number"
              step="0.1"
              value={preview.left_leg_lbs ?? ''}
              onChange={e => updateField('left_leg_lbs', e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="col-span-2 md:col-span-3">
            <label className="block text-xs text-[#555] mb-1">Notes</label>
            <input
              type="text"
              value={preview.notes}
              onChange={e => updateField('notes', e.target.value)}
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
        sublabel="PDF or image — AI will extract all body composition data"
      />
      {error && (
        <p className="text-xs text-red-400 mt-2">{error}</p>
      )}
    </Card>
  )
}
