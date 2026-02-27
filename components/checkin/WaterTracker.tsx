'use client'

interface WaterTrackerProps {
  value: string
  onChange: (value: string) => void
  goal?: number
}

export default function WaterTracker({ value, onChange, goal = 128 }: WaterTrackerProps) {
  const current = value ? parseInt(value) : 0
  const progress = Math.min((current / goal) * 100, 100)

  const add = (oz: number) => {
    onChange(String(current + oz))
  }

  return (
    <div>
      <label className="block text-sm text-[#888] mb-2">
        Water Intake
        <span className="ml-2 text-white font-medium">{current} oz</span>
        <span className="text-[#555] ml-1">/ {goal} oz goal</span>
      </label>

      {/* Progress bar */}
      <div className="w-full h-4 bg-[#141414] border border-[#2a2a2a] rounded-full overflow-hidden mb-3">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${progress}%`,
            background: progress >= 100
              ? '#22c55e'
              : progress >= 50
                ? 'linear-gradient(90deg, #3b82f6, #06b6d4)'
                : '#3b82f6',
          }}
        />
      </div>

      {/* Quick-add buttons */}
      <div className="flex gap-2">
        {[8, 16, 32].map(oz => (
          <button
            key={oz}
            type="button"
            onClick={() => add(oz)}
            className="flex-1 py-3 rounded-xl text-sm font-medium bg-[#141414] text-[#888] border border-[#2a2a2a] hover:border-[#444] hover:text-white transition-colors"
          >
            +{oz}oz
          </button>
        ))}
        {current > 0 && (
          <button
            type="button"
            onClick={() => onChange('0')}
            className="px-4 py-3 rounded-xl text-sm font-medium bg-[#141414] text-red-400 border border-[#2a2a2a] hover:border-red-500/30 transition-colors"
          >
            Reset
          </button>
        )}
      </div>

      {/* Manual input */}
      <input
        type="number"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full mt-3 px-4 py-3 bg-[#141414] border border-[#2a2a2a] rounded-xl text-white text-sm placeholder-[#555]"
        placeholder="Or type exact amount..."
      />
    </div>
  )
}
