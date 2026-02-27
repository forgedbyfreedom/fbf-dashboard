'use client'

import { useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface Checkin {
  date: string
  weight_lbs: number | null
  calories: number | null
  protein_g: number | null
  steps: number | null
  sleep_hours: number | null
  training_done: boolean
  mood_rating?: number | null
  stress_level?: number | null
  water_oz?: number | null
  body_temp?: number | null
  estimated_calories_burned?: number | null
}

interface TrendChartsProps {
  checkins: Checkin[]
}

type RangeKey = '7' | '30' | '90'

export default function TrendCharts({ checkins }: TrendChartsProps) {
  const [range, setRange] = useState<RangeKey>('30')

  const now = new Date()
  const cutoff = new Date(now)
  cutoff.setDate(cutoff.getDate() - parseInt(range))
  const cutoffStr = cutoff.toISOString().split('T')[0]

  const data = checkins
    .filter(c => c.date >= cutoffStr)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(c => ({
      date: new Date(c.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      weight: c.weight_lbs ? Number(c.weight_lbs) : null,
      calories: c.calories,
      protein: c.protein_g,
      steps: c.steps,
      sleep: c.sleep_hours ? Number(c.sleep_hours) : null,
      mood: c.mood_rating ? Number(c.mood_rating) : null,
      stress: c.stress_level ? Number(c.stress_level) : null,
      water: c.water_oz ? Number(c.water_oz) : null,
      temp: c.body_temp ? Number(c.body_temp) : null,
      calBurned: c.estimated_calories_burned ? Number(c.estimated_calories_burned) : null,
    }))

  const charts = [
    { key: 'weight', label: 'Weight (lbs)', color: '#FF6A00', unit: ' lbs' },
    { key: 'calories', label: 'Calories', color: '#22c55e', unit: ' cal' },
    { key: 'protein', label: 'Protein (g)', color: '#3b82f6', unit: 'g' },
    { key: 'steps', label: 'Steps', color: '#a855f7', unit: '' },
    { key: 'sleep', label: 'Sleep (hrs)', color: '#eab308', unit: 'h' },
    { key: 'mood', label: 'Mood (1-10)', color: '#22d3ee', unit: '/10' },
    { key: 'stress', label: 'Stress (1-10)', color: '#f43f5e', unit: '/10' },
    { key: 'water', label: 'Water (oz)', color: '#06b6d4', unit: ' oz' },
    { key: 'temp', label: 'Body Temp (°F)', color: '#fb923c', unit: '°F' },
    { key: 'calBurned', label: 'Calories Burned', color: '#D4A017', unit: ' cal' },
  ]

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
        {charts.map(chart => {
          const hasData = data.some(d => d[chart.key as keyof typeof d] != null)
          if (!hasData) return null

          return (
            <div key={chart.key} className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-4">
              <h4 className="text-sm font-medium text-[#888] mb-4">{chart.label}</h4>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: '#555', fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: '#2a2a2a' }}
                  />
                  <YAxis
                    tick={{ fill: '#555', fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: '#2a2a2a' }}
                    domain={['auto', 'auto']}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1a1a1a',
                      border: '1px solid #2a2a2a',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                    formatter={(value: number) => [`${value}${chart.unit}`, chart.label]}
                  />
                  <Line
                    type="monotone"
                    dataKey={chart.key}
                    stroke={chart.color}
                    strokeWidth={2}
                    dot={{ fill: chart.color, r: 3 }}
                    activeDot={{ r: 5 }}
                    connectNulls
                  />
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
