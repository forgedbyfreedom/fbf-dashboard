'use client'

import { useState, useRef, useCallback } from 'react'

interface VoiceInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export default function VoiceInput({ value, onChange, placeholder }: VoiceInputProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [supported, setSupported] = useState(true)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  const startRecording = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setSupported(false)
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    let finalTranscript = value

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += (finalTranscript ? ' ' : '') + transcript
          onChange(finalTranscript)
        } else {
          interim += transcript
        }
      }
      if (interim) {
        onChange(finalTranscript + (finalTranscript ? ' ' : '') + interim)
      }
    }

    recognition.onerror = () => {
      setIsRecording(false)
    }

    recognition.onend = () => {
      setIsRecording(false)
    }

    recognitionRef.current = recognition
    recognition.start()
    setIsRecording(true)
  }, [value, onChange])

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    setIsRecording(false)
  }, [])

  const inputClass = "w-full px-4 py-4 bg-[#141414] border border-[#2a2a2a] rounded-xl text-white text-lg placeholder-[#555]"

  return (
    <div className="relative">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputClass} min-h-[100px] pr-14`}
        placeholder={placeholder || 'Describe your workout...'}
      />
      {supported && (
        <button
          type="button"
          onClick={isRecording ? stopRecording : startRecording}
          className={`absolute right-3 top-3 w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
            isRecording
              ? 'bg-red-500 animate-pulse'
              : 'bg-[#2a2a2a] hover:bg-[#333]'
          }`}
        >
          {isRecording ? (
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-[#888]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4M12 15a3 3 0 003-3V5a3 3 0 00-6 0v7a3 3 0 003 3z" />
            </svg>
          )}
        </button>
      )}
      {isRecording && (
        <p className="text-xs text-red-400 mt-1 animate-pulse">Recording... tap stop when done</p>
      )}
      {!supported && (
        <p className="text-xs text-[#555] mt-1">Voice input not available — type your workout instead</p>
      )}
    </div>
  )
}
