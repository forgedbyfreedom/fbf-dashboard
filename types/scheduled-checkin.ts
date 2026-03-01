export interface ScheduledCheckin {
  id: string
  client_id: string
  coach_user_id: string
  type: 'weekly_email' | 'monthly_facetime'
  scheduled_for: string
  completed_at: string | null
  notes: string | null
  created_at: string
  clients?: { id: string; first_name: string; last_name: string }
}
