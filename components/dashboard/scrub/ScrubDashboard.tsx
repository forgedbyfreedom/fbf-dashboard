'use client'

import { useState } from 'react'
import ScrubUpload from './ScrubUpload'
import ScrubResults from './ScrubResults'
import RulesManager from './RulesManager'
import ScrubHistory from './ScrubHistory'

type Tab = 'upload' | 'rules' | 'history'

interface ScrubDashboardProps {
  orgId: string
}

export default function ScrubDashboard({ orgId }: ScrubDashboardProps) {
  const [activeTab, setActiveTab] = useState<Tab>('upload')
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)

  const tabs: { key: Tab; label: string }[] = [
    { key: 'upload', label: 'Upload' },
    { key: 'rules', label: 'Rules' },
    { key: 'history', label: 'History' },
  ]

  const handleSessionCreated = (sessionId: string) => {
    setActiveSessionId(sessionId)
  }

  const handleBackToUpload = () => {
    setActiveSessionId(null)
    setActiveTab('upload')
  }

  const handleViewSession = (sessionId: string) => {
    setActiveSessionId(sessionId)
  }

  // If we have an active session, show results
  if (activeSessionId) {
    return (
      <ScrubResults
        sessionId={activeSessionId}
        onBack={handleBackToUpload}
      />
    )
  }

  return (
    <div>
      <div className="flex gap-1 mb-6 bg-[#141414] border border-[#2a2a2a] rounded-xl p-1 w-fit">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-[#FF6A00] text-white'
                : 'text-[#888] hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'upload' && (
        <ScrubUpload orgId={orgId} onSessionCreated={handleSessionCreated} />
      )}
      {activeTab === 'rules' && <RulesManager />}
      {activeTab === 'history' && <ScrubHistory onViewSession={handleViewSession} />}
    </div>
  )
}
