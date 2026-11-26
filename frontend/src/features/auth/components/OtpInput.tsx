import './otp-input.css'
import type { ClipboardEvent, ComponentProps, SyntheticEvent } from 'react'

export const OTP_LENGTH = 6

const BOXES = Array.from({ length: OTP_LENGTH }, (_, index) => index)

function toDigits(text: string) {
  return text.replace(/\D/g, '').slice(0, OTP_LENGTH)
}

type OtpInputProps = Omit<ComponentProps<'input'>, 'onChange' | 'value'> & {
  value: string
  onValueChange: (value: string) => void
}

/**
 * Six boxes drawn over one real input, so there is one label, and typing,
 * backspace, paste and one-time-code autofill stay native. Goes inside a
 * `Field`. The caret stays at the end: the boxes only fill left to right.
 */
export function OtpInput({ value, onValueChange, ...props }: OtpInputProps) {
  const activeBox = Math.min(value.length, OTP_LENGTH - 1)

  // A full code replaces what is there. No `maxLength`: it would cut "481 913"
  // short before the spaces are removed.
  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    const digits = toDigits(event.clipboardData.getData('text'))
    if (digits.length < OTP_LENGTH) return
    event.preventDefault()
    onValueChange(digits)
  }

  // Ranges are left alone, so select all still replaces the code.
  function keepCaretAtEnd(event: SyntheticEvent<HTMLInputElement>) {
    const input = event.currentTarget
    const end = input.value.length
    if (
      input.selectionStart === input.selectionEnd &&
      input.selectionStart !== end
    ) {
      input.setSelectionRange(end, end)
    }
  }

  return (
    <div className="otp">
      <input
        {...props}
        autoComplete="one-time-code"
        className="otp-input"
        inputMode="numeric"
        minLength={OTP_LENGTH}
        onChange={(event) => onValueChange(toDigits(event.target.value))}
        onPaste={handlePaste}
        onSelect={keepCaretAtEnd}
        pattern={`[0-9]{${OTP_LENGTH}}`}
        spellCheck={false}
        type="text"
        value={value}
      />
      <div aria-hidden="true" className="otp-boxes">
        {BOXES.map((index) => (
          <span
            className={index === activeBox ? 'otp-box otp-active' : 'otp-box'}
            key={index}
          >
            {value[index]}
          </span>
        ))}
      </div>
    </div>
  )
}
