'use client'

import { useState } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'

interface ScanAnalysisDisplayProps {
  clientId: string
  scanId: string
  existingAnalysis?: string | null
  generatedAt?: string | null
  onAnalysisGenerated?: () => void
}

export default function ScanAnalysisDisplay({
  clientId,
  scanId,
  existingAnalysis,
  generatedAt,
  onAnalysisGenerated,
}: ScanAnalysisDisplayProps) {
  const [analysis, setAnalysis] = useState(existingAnalysis || '')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [lastGenerated, setLastGenerated] = useState(generatedAt || '')

  const generateAnalysis = async () => {
    setGenerating(true)
    setError('')

    try {
      const res = await fetch(`/api/clients/${clientId}/scan-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scan_id: scanId }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate analysis')
      }

      setAnalysis(data.analysis)
      setLastGenerated(data.generated_at)
      onAnalysisGenerated?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate')
    } finally {
      setGenerating(false)
    }
  }

  // Simple markdown-to-html for the analysis text
  const renderAnalysis = (text: string) => {
    return text
      .split('\n')
      .map((line, i) => {
        if (line.startsWith('## ')) {
          return <h3 key={i} className="text-base font-semibold text-[#FF6A00] mt-4 mb-2">{line.replace('## ', '')}</h3>
        }
        if (line.startsWith('### ')) {
          return <h4 key={i} className="text-sm font-semibold text-[#D4A017] mt-3 mb-1">{line.replace('### ', '')}</h4>
        }
        if (line.startsWith('- ')) {
          return <li key={i} className="text-sm text-[#ccc] ml-4 mb-1">{line.replace('- ', '')}</li>
        }
        if (line.startsWith('|')) {
          // Table row
          const cells = line.split('|').filter(c => c.trim())
          if (cells.every(c => c.trim().match(/^[-:]+$/))) return null // separator
          return (
            <div key={i} className="flex gap-2 text-xs mb-1">
              {cells.map((cell, j) => (
                <span key={j} className="flex-1 text-[#ccc] py-1">{cell.trim()}</span>
              ))}
            </div>
          )
        }
        if (line.startsWith('*') && line.endsWith('*')) {
          return <p key={i} className="text-xs text-[#555] italic mt-3">{line.replace(/\*/g, '')}</p>
        }
        if (line.trim() === '') return <br key={i} />
        return <p key={i} className="text-sm text-[#ccc] mb-1">{line}</p>
      })
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-[#D4A017]">AI Body Composition Analysis</h4>
        <Button
          size="sm"
          variant={analysis ? 'secondary' : 'primary'}
          onClick={generateAnalysis}
          disabled={generating}
        >
          {generating ? 'Analyzing...' : analysis ? 'Regenerate' : 'Generate Analysis'}
        </Button>
      </div>

      {error && (
        <p className="text-xs text-red-400 mb-3">{error}</p>
      )}

      {analysis ? (
        <>
          <div className="bg-[#0a0a0a] rounded-lg p-4 max-h-[500px] overflow-y-auto">
            {renderAnalysis(analysis)}
          </div>
          {lastGenerated && (
            <p className="text-xs text-[#555] mt-2">
              Generated {new Date(lastGenerated).toLocaleString()}
            </p>
          )}
          {/* AI Coach callout */}
          <div className="mt-4 p-3 bg-[#D4A017]/10 border border-[#D4A017]/30 rounded-lg">
            <p className="text-xs text-[#D4A017]">
              For personalized AI-powered guidance based on this analysis, visit{' '}
              <a
                href="https://forgedbyfreedom.org/ai-coach"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-[#FFD700]"
              >
                Forged by Freedom AI Coach
              </a>
            </p>
          </div>
        </>
      ) : (
        <p className="text-sm text-[#555] text-center py-4">
          Generate an AI analysis to compare this scan against historical data and get recommendations.
        </p>
      )}
    </Card>
  )
}
