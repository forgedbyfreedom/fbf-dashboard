'use client'

import { useState, useEffect } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'

interface Report {
  id: string
  report_type: string
  report_date: string
  pdf_url: string | null
  coach_name: string | null
  emailed_at: string | null
  created_at: string
}

interface ReportsListProps {
  clientId: string
}

export default function ReportsList({ clientId }: ReportsListProps) {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchReports()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId])

  const fetchReports = async () => {
    try {
      const res = await fetch(`/api/reports/generate?client_id=${clientId}`)
      if (res.ok) {
        const data = await res.json()
        setReports(data.reports || [])
      }
    } catch (err) {
      console.error('Failed to fetch reports:', err)
    } finally {
      setLoading(false)
    }
  }

  const generateReport = async (type: 'weekly' | 'monthly') => {
    setGenerating(true)
    setError('')

    try {
      const res = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId, report_type: type }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate report')
      }

      fetchReports()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  const resendReport = async (reportId: string) => {
    try {
      const res = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report_id: reportId, action: 'resend' }),
      })

      if (res.ok) {
        fetchReports()
      }
    } catch (err) {
      console.error('Failed to resend:', err)
    }
  }

  if (loading) {
    return <p className="text-sm text-[#555]">Loading reports...</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#888] uppercase tracking-wider">Progress Reports</h3>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => generateReport('weekly')} disabled={generating}>
            {generating ? 'Generating...' : 'Generate Weekly'}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => generateReport('monthly')} disabled={generating}>
            Generate Monthly
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">{error}</div>
      )}

      {reports.length > 0 ? (
        <Card>
          <div className="space-y-3">
            {reports.map(report => (
              <div key={report.id} className="flex items-center gap-4 text-sm border-b border-[#1a1a1a] pb-3 last:border-0 last:pb-0">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={report.report_type === 'weekly' ? 'green' : 'yellow'}>
                      {report.report_type}
                    </Badge>
                    <span className="text-white font-medium">
                      {new Date(report.report_date + 'T12:00:00').toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[#555]">
                    {report.coach_name && <span>Coach: {report.coach_name}</span>}
                    {report.emailed_at && (
                      <span>Emailed {new Date(report.emailed_at).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {report.pdf_url && (
                    <a
                      href={report.pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#FF6A00] hover:text-[#FF8533] transition-colors"
                    >
                      View PDF
                    </a>
                  )}
                  {report.pdf_url && (
                    <a
                      href={report.pdf_url}
                      download
                      className="text-xs text-[#888] hover:text-white transition-colors"
                    >
                      Download
                    </a>
                  )}
                  <button
                    onClick={() => resendReport(report.id)}
                    className="text-xs text-[#888] hover:text-[#D4A017] transition-colors"
                  >
                    Re-send
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <Card>
          <p className="text-sm text-[#555] text-center py-6">
            No reports generated yet. Use the buttons above to create a weekly or monthly progress report.
          </p>
        </Card>
      )}
    </div>
  )
}
