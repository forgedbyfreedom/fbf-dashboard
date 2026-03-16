'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

const AVAILABLE_TIMES = [
  // Placeholder — Bryan will configure actual availability later
  { day: 'Monday', slots: ['9:00 AM', '10:00 AM', '11:00 AM', '2:00 PM', '3:00 PM'] },
  { day: 'Tuesday', slots: ['9:00 AM', '10:00 AM', '11:00 AM', '2:00 PM', '3:00 PM'] },
  { day: 'Wednesday', slots: ['9:00 AM', '10:00 AM', '11:00 AM', '2:00 PM', '3:00 PM'] },
  { day: 'Thursday', slots: ['9:00 AM', '10:00 AM', '11:00 AM', '2:00 PM', '3:00 PM'] },
  { day: 'Friday', slots: ['9:00 AM', '10:00 AM', '11:00 AM'] },
]

function BookConsultContent() {
  const searchParams = useSearchParams()
  const peptide = searchParams.get('peptide') || 'General Peptide Consultation'
  const clientName = searchParams.get('name') || ''

  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!selectedDay || !selectedTime) return
    setSubmitting(true)

    try {
      await fetch('/api/notifications/peptide-interest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          peptide_id: peptide.toLowerCase().replace(/\s+/g, '_'),
          peptide_name: peptide,
          action: 'book_consult',
          preferred_day: selectedDay,
          preferred_time: selectedTime,
        }),
      })
    } catch {
      // Still show success — notification is best-effort
    }

    setSubmitted(true)
    setSubmitting(false)
  }

  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, -apple-system, sans-serif' }}>
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <h1 style={{ color: '#FF6A00', fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Consultation Requested</h1>
          <p style={{ color: '#ccc', fontSize: 16, marginBottom: 8 }}>
            {selectedDay} at {selectedTime}
          </p>
          <p style={{ color: '#888', fontSize: 14, maxWidth: 400, margin: '0 auto', lineHeight: 1.6 }}>
            Your coach has been notified and will confirm your {peptide} consultation shortly. Check your phone and the FBF app for confirmation.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', fontFamily: 'Inter, -apple-system, sans-serif', color: '#fff' }}>
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '48px 24px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ color: '#FF6A00', fontSize: 20, fontWeight: 900, letterSpacing: 2, marginBottom: 8 }}>FORGED BY FREEDOM</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>
            Peptide <span style={{ color: '#FF6A00' }}>Consultation</span>
          </h1>
          <p style={{ color: '#888', fontSize: 14 }}>30-minute 1-on-1 with your coach</p>
        </div>

        {/* Peptide info */}
        <div style={{ background: '#141414', border: '1px solid rgba(255,106,0,0.3)', borderRadius: 12, padding: 20, marginBottom: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: '#888', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 4 }}>Consultation Topic</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#FF6A00' }}>{peptide}</div>
          {clientName && <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>Client: {clientName}</div>}
        </div>

        {/* Day selection */}
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#FF6A00', marginBottom: 12, textTransform: 'uppercase' as const, letterSpacing: 0.5 }}>Select a Day</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
            {AVAILABLE_TIMES.map(({ day }) => (
              <button
                key={day}
                onClick={() => { setSelectedDay(day); setSelectedTime(null) }}
                style={{
                  background: selectedDay === day ? '#FF6A00' : '#141414',
                  color: selectedDay === day ? '#0a0a0a' : '#ccc',
                  border: `1px solid ${selectedDay === day ? '#FF6A00' : '#2a2a2a'}`,
                  borderRadius: 8,
                  padding: '10px 20px',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {day}
              </button>
            ))}
          </div>
        </div>

        {/* Time selection */}
        {selectedDay && (
          <div style={{ marginBottom: 32 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#FF6A00', marginBottom: 12, textTransform: 'uppercase' as const, letterSpacing: 0.5 }}>Select a Time</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {AVAILABLE_TIMES.find(d => d.day === selectedDay)?.slots.map(time => (
                <button
                  key={time}
                  onClick={() => setSelectedTime(time)}
                  style={{
                    background: selectedTime === time ? '#FF6A00' : '#141414',
                    color: selectedTime === time ? '#0a0a0a' : '#ccc',
                    border: `1px solid ${selectedTime === time ? '#FF6A00' : '#2a2a2a'}`,
                    borderRadius: 8,
                    padding: '12px 8px',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {time}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Submit */}
        {selectedDay && selectedTime && (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #FF6A00, #FF8533)',
              color: '#0a0a0a',
              border: 'none',
              borderRadius: 12,
              padding: '16px 24px',
              fontSize: 16,
              fontWeight: 800,
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? 'Requesting...' : `Book ${selectedDay} at ${selectedTime}`}
          </button>
        )}

        {/* Info */}
        <div style={{ marginTop: 32, background: '#141414', border: '1px solid #2a2a2a', borderRadius: 10, padding: 16, textAlign: 'center' }}>
          <p style={{ color: '#888', fontSize: 12, lineHeight: 1.6, margin: 0 }}>
            Your coach will confirm the time via text and the FBF app. Consultations cover dosing, reconstitution, cycling, stacking, and physician coordination. Research samples may be provided.
          </p>
        </div>
      </div>
    </div>
  )
}

export default function BookConsultPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#FF6A00', fontSize: 16, fontWeight: 600 }}>Loading...</div>
      </div>
    }>
      <BookConsultContent />
    </Suspense>
  )
}
