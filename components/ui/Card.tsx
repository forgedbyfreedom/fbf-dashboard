import { HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: boolean
}

export default function Card({ className = '', padding = true, children, ...props }: CardProps) {
  return (
    <div
      className={`bg-[#141414] border border-[#2a2a2a] rounded-xl ${padding ? 'p-6' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}
