'use client'

interface MoodSelectorProps {
  value: string
  onChange: (value: string) => void
  label?: string
}

const moodLabels: Record<number, string> = {
  1: 'Terrible',
  2: 'Very Bad',
  3: 'Bad',
  4: 'Below Avg',
  5: 'Okay',
  6: 'Decent',
  7: 'Good',
  8: 'Great',
  9: 'Excellent',
  10: 'Amazing',
}

const moodColors: Record<number, string> = {
  1: 'bg-red-600',
  2: 'bg-red-500',
  3: 'bg-orange-500',
  4: 'bg-orange-400',
  5: 'bg-yellow-500',
  6: 'bg-yellow-400',
  7: 'bg-lime-400',
  8: 'bg-green-400',
  9: 'bg-green-500',
  10: 'bg-emerald-500',
}

export default function MoodSelector({ value, onChange, label = 'Mood (1-10)' }: MoodSelectorProps) {
  const selected = value ? parseInt(value) : 0

  return (
    <div>
      <label className="block text-sm text-[#888] mb-2">
        {label}
        {selected > 0 && (
          <span className="ml-2 text-white font-medium">{moodLabels[selected]}</span>
        )}
      </label>
      <div className="flex gap-1.5 flex-wrap">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(String(n))}
            className={`w-11 h-11 rounded-xl text-sm font-medium transition-all ${
              selected === n
                ? `${moodColors[n]} text-white scale-110 shadow-lg`
                : 'bg-[#141414] text-[#888] border border-[#2a2a2a] hover:border-[#444]'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  )
}
