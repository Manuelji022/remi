import { useNavigate, useSearch } from '@tanstack/react-router'
import { useEffect, useEffectEvent, useRef } from 'react'

/** Presses Generate once for a link carrying `?generate=first` (onboarding's
 *  last button), as soon as the planner would allow the press. */
export function useGenerateOnArrival(
  canGenerate: boolean,
  generate: () => void,
) {
  const requested = useSearch({ strict: false }).generate === 'first'
  const navigate = useNavigate()
  const done = useRef(false)

  const arrive = useEffectEvent(() => {
    done.current = true
    // Dropped from the address, so a reload or Back does not ask again.
    void navigate({
      to: '.',
      search: (previous) => ({ ...previous, generate: undefined }),
      replace: true,
    })
    generate()
  })

  useEffect(() => {
    // react-doctor-disable-next-line react-doctor/no-pass-data-to-parent -- No event to hang this on: the press waits for the planner to finish loading.
    if (requested && canGenerate && !done.current) arrive()
  }, [requested, canGenerate])
}
