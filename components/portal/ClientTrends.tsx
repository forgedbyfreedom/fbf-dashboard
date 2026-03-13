'use client'

import { useState, useEffect } from 'react'
import TrendCharts from '@/components/dashboard/TrendCharts'
import Timeline from '@/components/dashboard/Timeline'
import Tabs from '@/components/ui/Tabs'
import Card from '@/components/ui/Card'

interface Report {
  id: string
  report_type: string
  report_date: string
  pdf_url: string | null
  created_at: string
}

interface ClientTrendsProps {
  client: {
    id: string
    first_name: string
    last_name: string
    target_calories: number | null
    target_protein: number | null
    target_steps: number | null
  }
  checkins: Array<{
    id: string
    date: string
    weight_lbs: number | null
    sleep_hours: number | null
    sleep_quality: number | null
    steps: number | null
    calories: number | null
    protein_g: number | null
    carbs_g: number | null
    fat_g: number | null
    training_done: boolean
    training_type: string | null
    general_notes: string | null
    side_effects_notes: string | null
  }>
}

function ClientReports({ clientId }: { clientId: string }) {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/reports/generate?client_id=${clientId}`)
      .then(r => r.ok ? r.json() : { reports: [] })
      .then(d => setReports(d.reports || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [clientId])

  if (loading) return <p className="text-sm text-[#555]">Loading reports...</p>

  if (reports.length === 0) {
    return (
      <Card>
        <p className="text-sm text-[#555] text-center py-6">
          No reports available yet. Your coach will generate progress reports for you.
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {reports.map(report => (
        <Card key={report.id}>
          <div className="flex items-center justify-between">
            <div>
              <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold mr-2 ${
                report.report_type === 'weekly'
                  ? 'bg-green-500/10 text-green-400'
                  : 'bg-yellow-500/10 text-yellow-400'
              }`}>
                {report.report_type}
              </span>
              <span className="text-white font-medium text-sm">
                {new Date(report.report_date + 'T12:00:00').toLocaleDateString('en-US', {
                  month: 'long', day: 'numeric', year: 'numeric',
                })}
              </span>
            </div>
            {report.pdf_url && (
              <div className="flex gap-3">
                <a
                  href={report.pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#FF6A00] hover:text-[#FF8533]"
                >
                  View PDF
                </a>
                <a
                  href={report.pdf_url}
                  download
                  className="text-xs text-[#888] hover:text-white"
                >
                  Download
                </a>
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  )
}

export default function ClientTrends({ client, checkins }: ClientTrendsProps) {
  const latest = checkins[0]
  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'trends', label: 'Trends' },
    { id: 'history', label: 'History' },
    { id: 'reports', label: 'Reports' },
  ]

  return (
    <Tabs tabs={tabs} defaultTab="overview">
      {(activeTab) => (
        <>
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {latest ? (
                <>
                  <Card>
                    <h3 className="text-sm font-semibold text-[#888] mb-4">Latest Check-in — {new Date(latest.date + 'T12:00:00').toLocaleDateString()}</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-[#555]">Weight</p>
                        <p className="text-lg font-bold text-white">{latest.weight_lbs ?? '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#555]">Calories</p>
                        <p className="text-lg font-bold text-white">{latest.calories ?? '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#555]">Protein</p>
                        <p className="text-lg font-bold text-white">{latest.protein_g ?? '—'}g</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#555]">Steps</p>
                        <p className="text-lg font-bold text-white">{latest.steps?.toLocaleString() ?? '—'}</p>
                      </div>
                    </div>
                  </Card>

                  <Card>
                    <h3 className="text-sm font-semibold text-[#888] mb-3">Targets</h3>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-[#555]">Calories</p>
                        <p className="text-white font-medium">{client.target_calories || '—'}</p>
                      </div>
                      <div>
                        <p className="text-[#555]">Protein</p>
                        <p className="text-white font-medium">{client.target_protein ? `${client.target_protein}g` : '—'}</p>
                      </div>
                      <div>
                        <p className="text-[#555]">Steps</p>
                        <p className="text-white font-medium">{client.target_steps?.toLocaleString() || '—'}</p>
                      </div>
                    </div>
                  </Card>
                </>
              ) : (
                <p className="text-[#555] text-center py-12">No check-ins yet. Use your check-in link to get started!</p>
              )}
            </div>
          )}

          {activeTab === 'trends' && <TrendCharts checkins={checkins} />}

          {activeTab === 'history' && <Timeline checkins={checkins} />}

          {activeTab === 'reports' && <ClientReports clientId={client.id} />}
        </>
      )}
    </Tabs>
  )
}
