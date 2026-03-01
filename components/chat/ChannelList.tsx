'use client'

interface Channel {
  id: string
  name: string
  type: 'group' | 'dm'
}

interface ChannelListProps {
  channels: Channel[]
  activeId: string | null
  onSelect: (id: string) => void
  onNewDM: () => void
}

export default function ChannelList({ channels, activeId, onSelect, onNewDM }: ChannelListProps) {
  const groupChannels = channels.filter(c => c.type === 'group')
  const dmChannels = channels.filter(c => c.type === 'dm')

  return (
    <div className="w-full h-full flex flex-col">
      <div className="p-3 border-b border-[#2a2a2a]">
        <h2 className="text-sm font-bold text-white tracking-wider">Accountability Chat</h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {groupChannels.length > 0 && (
          <div className="px-3 pt-3">
            <p className="text-[10px] font-semibold text-[#555] uppercase tracking-wider mb-1">Channels</p>
            {groupChannels.map(ch => (
              <button
                key={ch.id}
                onClick={() => onSelect(ch.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors mb-0.5 ${
                  activeId === ch.id
                    ? 'bg-[#FF6A00]/10 text-[#FF6A00]'
                    : 'text-[#888] hover:text-white hover:bg-[#1a1a1a]'
                }`}
              >
                # {ch.name}
              </button>
            ))}
          </div>
        )}

        {dmChannels.length > 0 && (
          <div className="px-3 pt-3">
            <p className="text-[10px] font-semibold text-[#555] uppercase tracking-wider mb-1">Direct Messages</p>
            {dmChannels.map(ch => (
              <button
                key={ch.id}
                onClick={() => onSelect(ch.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors mb-0.5 ${
                  activeId === ch.id
                    ? 'bg-[#FF6A00]/10 text-[#FF6A00]'
                    : 'text-[#888] hover:text-white hover:bg-[#1a1a1a]'
                }`}
              >
                {ch.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="p-3 border-t border-[#2a2a2a]">
        <button
          onClick={onNewDM}
          className="w-full py-2 rounded-lg text-sm font-medium text-[#FF6A00] bg-[#FF6A00]/10 hover:bg-[#FF6A00]/20 transition-colors"
        >
          New Message
        </button>
      </div>
    </div>
  )
}
