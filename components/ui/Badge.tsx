interface BadgeProps {
  variant?: 'green' | 'yellow' | 'red' | 'muted'
  children: React.ReactNode
  className?: string
}

export default function Badge({ variant = 'muted', children, className = '' }: BadgeProps) {
  const variants = {
    green: 'bg-green-500/15 text-green-400 border-green-500/20',
    yellow: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
    red: 'bg-red-500/15 text-red-400 border-red-500/20',
    muted: 'bg-[#2a2a2a] text-[#888] border-[#333]',
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${variants[variant]} ${className}`}>
      {children}
    </span>
  )
}
