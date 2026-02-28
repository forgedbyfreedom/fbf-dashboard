'use client'

interface MessageBubbleProps {
  content: string
  userName: string
  avatarUrl?: string | null
  timestamp: string
  isOwn: boolean
}

export default function MessageBubble({ content, userName, avatarUrl, timestamp, isOwn }: MessageBubbleProps) {
  const time = new Date(timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  const initials = userName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className={`flex gap-2.5 ${isOwn ? 'flex-row-reverse' : ''}`}>
      <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-[#FF6A00]/10 flex items-center justify-center">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt={userName} className="w-full h-full object-cover" />
        ) : (
          <span className="text-xs font-bold text-[#FF6A00]">{initials}</span>
        )}
      </div>
      <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'}`}>
        <div className={`flex items-baseline gap-2 mb-0.5 ${isOwn ? 'flex-row-reverse' : ''}`}>
          <span className="text-xs font-medium text-[#888]">{userName}</span>
          <span className="text-[10px] text-[#555]">{time}</span>
        </div>
        <div className={`px-3.5 py-2 rounded-2xl text-sm ${
          isOwn
            ? 'bg-[#FF6A00] text-white rounded-tr-sm'
            : 'bg-[#1a1a1a] text-[#ccc] border border-[#2a2a2a] rounded-tl-sm'
        }`}>
          {content}
        </div>
      </div>
    </div>
  )
}
