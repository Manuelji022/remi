import { useCallback, useEffect, useRef, useState } from 'react'

interface OtpInputProps {
  length?: number
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  id?: string
}

export function OtpInput({ length = 6, value, onChange, disabled, id }: OtpInputProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const digits = value.split('').concat(Array(length).fill('')).slice(0, length)

  const focusInput = useCallback((index: number) => {
    const input = inputRefs.current[index]
    if (input) {
      input.focus()
      // Select all text so typing replaces it
      input.select()
    }
  }, [])

  useEffect(() => {
    // Focus first empty or last filled on mount/value change from outside
    const currentDigits = value.split('').concat(Array(length).fill('')).slice(0, length)
    const firstEmpty = currentDigits.findIndex((d) => d === '')
    const indexToFocus = firstEmpty === -1 ? length - 1 : firstEmpty
    setActiveIndex(indexToFocus)
    focusInput(indexToFocus)
  }, [length, value, focusInput])

  function updateValue(newDigits: string[]) {
    const newValue = newDigits.join('')
    onChange(newValue)
  }

  function handleChange(index: number, raw: string) {
    // Only allow digits
    const cleaned = raw.replace(/\D/g, '')
    if (!cleaned) return

    const chars = cleaned.split('')
    const newDigits = [...digits]

    // Fill from current index onwards
    for (let i = 0; i < chars.length && index + i < length; i++) {
      newDigits[index + i] = chars[i]
    }

    updateValue(newDigits)

    // Move focus
    const nextIndex = Math.min(index + chars.length, length - 1)
    setActiveIndex(nextIndex)
    focusInput(nextIndex)
  }

  function handleKeyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace') {
      event.preventDefault()
      const newDigits = [...digits]

      if (newDigits[index]) {
        newDigits[index] = ''
        updateValue(newDigits)
      } else if (index > 0) {
        newDigits[index - 1] = ''
        updateValue(newDigits)
        setActiveIndex(index - 1)
        focusInput(index - 1)
      }
      return
    }

    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault()
      setActiveIndex(index - 1)
      focusInput(index - 1)
      return
    }

    if (event.key === 'ArrowRight' && index < length - 1) {
      event.preventDefault()
      setActiveIndex(index + 1)
      focusInput(index + 1)
      return
    }

    // If typing a digit while a cell already has a value, replace and advance
    if (/\d/.test(event.key) && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault()
      const newDigits = [...digits]
      newDigits[index] = event.key
      updateValue(newDigits)
      const nextIndex = Math.min(index + 1, length - 1)
      setActiveIndex(nextIndex)
      focusInput(nextIndex)
    }
  }

  function handlePaste(event: React.ClipboardEvent<HTMLInputElement>) {
    event.preventDefault()
    const pasteData = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    if (!pasteData) return

    const newDigits = pasteData.split('').concat(Array(length).fill('')).slice(0, length)
    updateValue(newDigits)

    const nextIndex = Math.min(pasteData.length, length - 1)
    setActiveIndex(nextIndex)
    focusInput(nextIndex)
  }

  function handleFocus(index: number) {
    setActiveIndex(index)
  }

  return (
    <div className="otp-input" role="group" aria-label="One-time code">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el
          }}
          id={id ? `${id}-${index}` : undefined}
          aria-label={`Digit ${index + 1} of ${length}`}
          type="text"
          inputMode="numeric"
          maxLength={length}
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          disabled={disabled}
          value={digit}
          className={`otp-digit ${activeIndex === index ? 'otp-digit--active' : ''}`}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          onFocus={() => handleFocus(index)}
          onClick={() => inputRefs.current[index]?.select()}
        />
      ))}
    </div>
  )
}
