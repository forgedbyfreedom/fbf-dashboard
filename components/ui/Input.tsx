import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div>
        {label && <label className="block text-sm text-[#888] mb-1.5">{label}</label>}
        <input
          ref={ref}
          className={`w-full px-4 py-3 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white placeholder-[#555] text-sm ${
            error ? 'border-red-500' : ''
          } ${className}`}
          {...props}
        />
        {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'
export default Input
