'use client'

import { useState } from 'react'
import {
  LineChart,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts'

interface Checkin {
  date: string
  weight_lbs: number | null
  calories: number | null
  protein_g: number | null
  steps: number | null
  sleep_hours: number | null
  training_done: boolean
  training_type?: string | null
  mood_rating?: number | null
  stress_level?: number | null
  water_oz?: number | null
  body_temp?: number | null
  estimated_calories_burned?: number | null
  supplement_compliance?: boolean | null
  cardio_minutes?: number | null
}

interface TrendChartsProps {
  checkins: Checkin[]
  targetCalories?: number | null
  targetProtein?: number | null
  targetSteps?: number | null
  targetWaterOz?: number | null
}

type RangeKey = '7' | '30' | '90'

// Estimate TDEE from activity data + base BMR
// Mifflin-St Jeor: BMR = 10 * weight_kg + 6.25 * height_cm - 5 * age - 161 (female) / + 5 (male)
// We don't have height/age/sex so we approximate: BMR ≈ weight_lbs * 10, then add activity
function estimateTDEE(weightLbs: number | null, steps: number | null, calBurned: number | null, cardioMin: number | null): number | null {
  if (!weightLbs) return null
  const bmr = Number(weightLbs) * 10 // rough BMR approximation
  const stepCal = steps ? Number(steps) * 0.04 : 0 // ~40 cal per 1000 steps
  const exerciseCal = calBurned ? Number(calBurned) : 0
  const cardioCal = cardioMin ? Number(cardioMin) * 8 : 0 // ~8 cal/min moderate cardio
  // Avoid double-counting: use max of exercise logged cal vs cardio estimate
  const activityCal = Math.max(exerciseCal, cardioCal) + stepCal
  return Math.round(bmr + activityCal)
}

const tooltipStyle = {
  backgroundColor: '#1a1a1a',
  border: '1px solid #2a2a2a',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '12px',
}

export default function TrendCharts({ checkins, targetCalories, targetProtein, targetSteps, targetWaterOz }: TrendChartsProps) {
  const [range, setRange] = useState<RangeKey>('30')

  const now = new Date()
  const cutoff = new Date(now)
  cutoff.setDate(cutoff.getDate() - parseInt(range))
  const cutoffStr = cutoff.toISOString().split('T')[0]

  const filtered = checkins
    .filter(c => c.date >= cutoffStr)
    .sort((a, b) => a.date.localeCompare(b.date))

  const data = filtered.map(c => ({
    date: new Date(c.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    weight: c.weight_lbs ? Number(c.weight_lbs) : null,
    calories: c.calories ? Number(c.calories) : null,
    protein: c.protein_g ? Number(c.protein_g) : null,
    steps: c.steps ? Number(c.steps) : null,
    sleep: c.sleep_hours ? Number(c.sleep_hours) : null,
    mood: c.mood_rating ? Number(c.mood_rating) : null,
    stress: c.stress_level ? Number(c.stress_level) : null,
    water: c.water_oz ? Number(c.water_oz) : null,
    temp: c.body_temp ? Number(c.body_temp) : null,
    calBurned: c.estimated_calories_burned ? Number(c.estimated_calories_burned) : null,
    suppCompliance: c.supplement_compliance === true ? 1 : c.supplement_compliance === false ? 0 : null,
    tdee: estimateTDEE(c.weight_lbs, c.steps, c.estimated_calories_burned ?? null, c.cardio_minutes ?? null),
  }))

  // Compute rolling supplement compliance %
  const complianceData = filtered.map((c, idx) => {
    const label = new Date(c.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    // 7-day window
    const windowStart = Math.max(0, idx - 6)
    const window = filtered.slice(windowStart, idx + 1).filter(x => x.supplement_compliance != null)
    const compliant = window.filter(x => x.supplement_compliance === true).length
    const pct = window.length > 0 ? Math.round((compliant / window.length) * 100) : null
    return { date: label, compliance: pct }
  })

  // Simple single-line charts
  const simpleCharts = [
    { key: 'weight', label: 'Weight (lbs)', color: '#FF6A00', unit: ' lbs' },
    { key: 'protein', label: 'Protein (g)', color: '#3b82f6', unit: 'g', target: targetProtein },
    { key: 'steps', label: 'Steps', color: '#a855f7', unit: '', target: targetSteps },
    { key: 'sleep', label: 'Sleep (hrs)', color: '#eab308', unit: 'h' },
    { key: 'mood', label: 'Mood (1-10)', color: '#22d3ee', unit: '/10' },
    { key: 'stress', label: 'Stress (1-10)', color: '#f43f5e', unit: '/10' },
    { key: 'temp', label: 'Body Temp (°F)', color: '#fb923c', unit: '°F' },
    { key: 'calBurned', label: 'Calories Burned', color: '#D4A017', unit: ' cal' },
  ]

  const hasCalData = data.some(d => d.calories != null)
  const hasTdeeData = data.some(d => d.tdee != null)
  const hasWaterData = data.some(d => d.water != null)
  const hasComplianceData = complianceData.some(d => d.compliance != null)

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        {(['7', '30', '90'] as RangeKey[]).map(r => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              range === r
                ? 'bg-[#FF6A00] text-white'
                : 'bg-[#141414] text-[#888] hover:text-white border border-[#2a2a2a]'
            }`}
          >
            {r}d
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ===== TDEE vs Calories Consumed (overlay) ===== */}
        {(hasCalData || hasTdeeData) && (
          <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-4 lg:col-span-2">
            <h4 className="text-sm font-medium text-[#888] mb-1">Estimated TDEE vs Calories Consumed</h4>
            <p className="text-xs text-[#555] mb-4">TDEE estimated from weight, steps, and exercise. {targetCalories ? `Target: ${targetCalories} cal` : ''}</p>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="tdeeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF6A00" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#FF6A00" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="calGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                <XAxis dataKey="date" tick={{ fill: '#555', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#2a2a2a' }} />
                <YAxis tick={{ fill: '#555', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#2a2a2a' }} domain={['auto', 'auto']} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: '12px', color: '#888' }} />
                {targetCalories && (
                  <ReferenceLine y={targetCalories} stroke="#D4A017" strokeDasharray="5 5" label={{ value: `Target: ${targetCalories}`, fill: '#D4A017', fontSize: 11, position: 'insideTopRight' }} />
                )}
                <Area type="monotone" dataKey="tdee" name="Est. TDEE" stroke="#FF6A00" strokeWidth={2} fill="url(#tdeeGrad)" connectNulls dot={false} />
                <Area type="monotone" dataKey="calories" name="Calories Consumed" stroke="#22c55e" strokeWidth={2} fill="url(#calGrad)" connectNulls dot={{ fill: '#22c55e', r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ===== Water Intake ===== */}
        {hasWaterData && (
          <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-4">
            <h4 className="text-sm font-medium text-[#888] mb-4">Water Intake (oz)</h4>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                <XAxis dataKey="date" tick={{ fill: '#555', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#2a2a2a' }} />
                <YAxis tick={{ fill: '#555', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#2a2a2a' }} domain={[0, 'auto']} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`${value} oz`, 'Water']} />
                {targetWaterOz && (
                  <ReferenceLine y={targetWaterOz} stroke="#D4A017" strokeDasharray="5 5" label={{ value: `Goal: ${targetWaterOz}oz`, fill: '#D4A017', fontSize: 11, position: 'insideTopRight' }} />
                )}
                <ReferenceLine y={64} stroke="#555" strokeDasharray="3 3" />
                <Area type="monotone" dataKey="water" stroke="#06b6d4" strokeWidth={2} fill="url(#waterGrad)" connectNulls dot={{ fill: '#06b6d4', r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ===== Supplement/PED Compliance ===== */}
        {hasComplianceData && (
          <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-4">
            <h4 className="text-sm font-medium text-[#888] mb-1">Supplement Compliance</h4>
            <p className="text-xs text-[#555] mb-4">Rolling 7-day compliance rate</p>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={complianceData}>
                <defs>
                  <linearGradient id="compGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                <XAxis dataKey="date" tick={{ fill: '#555', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#2a2a2a' }} />
                <YAxis tick={{ fill: '#555', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#2a2a2a' }} domain={[0, 100]} unit="%" />
                <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`${value}%`, 'Compliance']} />
                <ReferenceLine y={100} stroke="#22c55e" strokeDasharray="3 3" strokeOpacity={0.3} />
                <ReferenceLine y={80} stroke="#D4A017" strokeDasharray="3 3" strokeOpacity={0.3} />
                <Area type="monotone" dataKey="compliance" stroke="#22c55e" strokeWidth={2} fill="url(#compGrad)" connectNulls dot={{ fill: '#22c55e', r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ===== Simple line charts ===== */}
        {simpleCharts.map(chart => {
          const hasData = data.some(d => d[chart.key as keyof typeof d] != null)
          if (!hasData) return null

          return (
            <div key={chart.key} className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-4">
              <h4 className="text-sm font-medium text-[#888] mb-4">{chart.label}</h4>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                  <XAxis dataKey="date" tick={{ fill: '#555', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#2a2a2a' }} />
                  <YAxis tick={{ fill: '#555', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#2a2a2a' }} domain={['auto', 'auto']} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`${value}${chart.unit}`, chart.label]} />
                  {chart.target && (
                    <ReferenceLine y={chart.target} stroke="#D4A017" strokeDasharray="5 5" label={{ value: `Target: ${chart.target}`, fill: '#D4A017', fontSize: 11, position: 'insideTopRight' }} />
                  )}
                  <Line type="monotone" dataKey={chart.key} stroke={chart.color} strokeWidth={2} dot={{ fill: chart.color, r: 3 }} activeDot={{ r: 5 }} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )
        })}
      </div>

      {data.length === 0 && (
        <p className="text-sm text-[#555] text-center py-8">No data for this time range.</p>
      )}
    </div>
  )
}
