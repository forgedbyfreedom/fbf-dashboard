'use client'

import Tabs from '@/components/ui/Tabs'
import InstagramContentScheduler from './InstagramContentScheduler'
import InstagramLeads from './InstagramLeads'

interface InstagramDashboardProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialPosts: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialLeads: any[]
}

export default function InstagramDashboard({ initialPosts, initialLeads }: InstagramDashboardProps) {
  const tabs = [
    { id: 'content', label: 'Content' },
    { id: 'leads', label: 'DM Leads' },
  ]

  return (
    <Tabs tabs={tabs} defaultTab="content">
      {(activeTab) => (
        <>
          {activeTab === 'content' && (
            <InstagramContentScheduler initialPosts={initialPosts} />
          )}
          {activeTab === 'leads' && (
            <InstagramLeads initialLeads={initialLeads} />
          )}
        </>
      )}
    </Tabs>
  )
}
