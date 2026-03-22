'use client'

import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import ScanUpload from '@/components/dashboard/ScanUpload'
import ScanAnalysisDisplay from '@/components/dashboard/ScanAnalysisDisplay'

interface Scan {
  id: string
  scan_date: string
  scan_type: string
  body_fat_pct: number | null
  lean_mass_lbs: number | null
  notes: string | null
  analysis_text?: string | null
  analysis_generated_at?: string | null
}

interface BodyCompChartProps {
  clientId: string
}

export default function BodyCompChart({ clientId }: BodyCompChartProps) {
  const [scans, setScans] = useState<Scan[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedScanId, setSelectedScanId] = useState<string | null>(null)
  const [newScan, setNewScan] = useState({
    scan_date: new Date().toISOString().split('T')[0],
    scan_type: 'InBody',
    body_fat_pct: '',
    lean_mass_lbs: '',
    notes: '',
  })

  useEffect(() => {
    fetchScans()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId])

  const fetchScans = async () => {
    try {
      const res = await fetch(`/api/clients/${clientId}/scans`)
      const data = await res.json()
      if (res.ok) setScans(data.scans)
    } catch (err) {
      console.error('Failed to fetch scans:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/clients/${clientId}/scans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newScan),
      })
      if (res.ok) {
        setShowForm(false)
        setNewScan({ scan_date: new Date().toISOString().split('T')[0], scan_type: 'InBody', body_fat_pct: '', lean_mass_lbs: '', notes: '' })
        fetchScans()
      }
    } catch (err) {
      console.error('Failed to save scan:', err)
    } finally {
      setSaving(false)
    }
  }

  const chartData = [...scans]
    .reverse()
    .map(s => ({
      date: new Date(s.scan_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      'Body Fat %': s.body_fat_pct,
      'Lean Mass (lbs)': s.lean_mass_lbs,
    }))

  const inputClass = "w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white text-sm placeholder-[#555]"

  const selectedScan = scans.find(s => s.id === selectedScanId)

  const handleDeleteScan = async (scanId: string) => {
    if (!confirm('Delete this scan? This cannot be undone.')) return
    try {
      const res = await fetch(`/api/clients/${clientId}/scans`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scan_id: scanId }),
      })
      if (res.ok) fetchScans()
    } catch (err) {
      console.error('Failed to delete scan:', err)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#888] uppercase tracking-wider">Body Composition</h3>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : 'Add Scan'}
        </Button>
      </div>

      {/* AI Scan Upload */}
      <ScanUpload clientId={clientId} onScanSaved={fetchScans} />

      {showForm && (
        <Card>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[#555] mb-1">Date</label>
              <input type="date" value={newScan.scan_date} onChange={e => setNewScan(p => ({ ...p, scan_date: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs text-[#555] mb-1">Type</label>
              <select value={newScan.scan_type} onChange={e => setNewScan(p => ({ ...p, scan_type: e.target.value }))} className={inputClass}>
                <option value="InBody">InBody</option>
                <option value="DEXA">DEXA</option>
                <option value="BF Scale">BF Scale</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-[#555] mb-1">Body Fat %</label>
              <input type="number" step="0.1" value={newScan.body_fat_pct} onChange={e => setNewScan(p => ({ ...p, body_fat_pct: e.target.value }))} className={inputClass} placeholder="15.2" />
            </div>
            <div>
              <label className="block text-xs text-[#555] mb-1">Lean Mass (lbs)</label>
              <input type="number" step="0.1" value={newScan.lean_mass_lbs} onChange={e => setNewScan(p => ({ ...p, lean_mass_lbs: e.target.value }))} className={inputClass} placeholder="165.0" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-[#555] mb-1">Notes</label>
              <input type="text" value={newScan.notes} onChange={e => setNewScan(p => ({ ...p, notes: e.target.value }))} className={inputClass} placeholder="Fasted, morning scan..." />
            </div>
          </div>
          <Button size="sm" className="mt-3" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Scan'}
          </Button>
        </Card>
      )}

      {loading ? (
        <p className="text-sm text-[#555]">Loading scans...</p>
      ) : scans.length > 0 ? (
        <>
          <Card>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                <XAxis dataKey="date" stroke="#555" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="bf" orientation="left" stroke="#FF6A00" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="lm" orientation="right" stroke="#D4A017" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: '#141414', border: '1px solid #2a2a2a', borderRadius: '8px' }} />
                <Legend />
                <Line yAxisId="bf" type="monotone" dataKey="Body Fat %" stroke="#FF6A00" strokeWidth={2} dot={{ r: 4 }} />
                <Line yAxisId="lm" type="monotone" dataKey="Lean Mass (lbs)" stroke="#D4A017" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <Card>
            <h4 className="text-xs font-semibold text-[#555] mb-3 uppercase tracking-wider">Scan History</h4>
            <div className="space-y-2">
              {scans.map(s => (
                <div key={s.id} className="flex items-center gap-4 text-sm border-b border-[#1a1a1a] pb-2 last:border-0">
                  <span className="text-[#555] w-24">
                    {new Date(s.scan_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                  </span>
                  <span className="text-[#888] w-16">{s.scan_type}</span>
                  {s.body_fat_pct != null && <span className="text-[#FF6A00]">BF: {s.body_fat_pct}%</span>}
                  {s.lean_mass_lbs != null && <span className="text-[#D4A017]">Lean: {s.lean_mass_lbs}lbs</span>}
                  {s.notes && <span className="text-[#555] text-xs truncate flex-1">{s.notes}</span>}
                  <button
                    onClick={() => setSelectedScanId(selectedScanId === s.id ? null : s.id)}
                    className={`text-xs ml-auto transition-colors ${
                      selectedScanId === s.id ? 'text-[#D4A017]' : 'text-[#555] hover:text-[#D4A017]'
                    }`}
                  >
                    {s.analysis_text ? 'View Analysis' : 'Analyze'}
                  </button>
                  <button
                    onClick={() => handleDeleteScan(s.id)}
                    className="text-xs text-red-400/40 hover:text-red-400 transition-colors ml-2"
                    title="Delete scan"
                  >
                    X
                  </button>
                </div>
              ))}
            </div>
          </Card>

          {/* Analysis display for selected scan */}
          {selectedScan && (
            <>
            <div className="bg-[#FF6A00]/5 border border-[#FF6A00]/20 rounded-lg p-3 mb-3">
              <p className="text-xs text-[#888] leading-relaxed">
                ⚠️ AI-generated analysis is informational only and may contain errors. Not a medical evaluation. Consult a qualified professional for interpretation.
              </p>
            </div>
            <ScanAnalysisDisplay
              clientId={clientId}
              scanId={selectedScan.id}
              existingAnalysis={selectedScan.analysis_text}
              generatedAt={selectedScan.analysis_generated_at}
              onAnalysisGenerated={fetchScans}
            />
            </>
          )}
        </>
      ) : (
        <Card>
          <p className="text-sm text-[#555] text-center py-4">No body composition scans yet. Add your first scan above.</p>
        </Card>
      )}
    </div>
  )
}
