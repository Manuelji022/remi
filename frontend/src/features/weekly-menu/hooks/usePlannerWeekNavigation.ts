import { useCallback, useEffect, useRef, useState } from 'react'
import { useBlocker } from '@tanstack/react-router'
import { weekStartFromDate } from '#/features/weekly-menu/week'

export function calendarWeekOffset(targetWeekStart: string): number {
  const currentWeekStart = weekStartFromDate(new Date())
  const dateNumber = (value: string) => {
    const [year, month, day] = value.split('-').map(Number)
    return Date.UTC(year, month - 1, day)
  }
  return Math.round(
    (dateNumber(targetWeekStart) - dateNumber(currentWeekStart)) /
      (7 * 24 * 60 * 60 * 1000),
  )
}

// Which week is viewed. Called before the AI generation hook because its
// `onPreviewWeek` callback is passed into it.
export function usePlannerWeekNavigation() {
  const [weekOffset, setWeekOffset] = useState(0)
  const [unlockedWeek, setUnlockedWeek] = useState<string | null>(null)
  const onPreviewWeek = useCallback((target: string) => {
    setUnlockedWeek(null)
    setWeekOffset(calendarWeekOffset(target))
  }, [])

  return {
    weekOffset,
    setWeekOffset,
    unlockedWeek,
    setUnlockedWeek,
    onPreviewWeek,
  }
}

interface PreviewDiscardGuardOptions {
  hasUnsavedPreview: boolean
  // Week of the preview being shown, or null when none is.
  previewWeekStart: string | null
  // True while the preview is being saved; discarding is blocked meanwhile.
  isSavingPreview: boolean
  discardPreview: () => void
  weekOffset: number
  setWeekOffset: (offset: number) => void
  setUnlockedWeek: (week: string | null) => void
}

// Guards an unsaved AI preview against week navigation and route changes.
export function usePreviewDiscardGuard({
  hasUnsavedPreview,
  previewWeekStart,
  isSavingPreview,
  discardPreview: discardAiPreview,
  weekOffset,
  setWeekOffset,
  setUnlockedWeek,
}: PreviewDiscardGuardOptions) {
  const [showDiscardConfirmation, setShowDiscardConfirmation] = useState(false)
  const discardWeekOffsetRef = useRef<number | null>(null)
  const routeBlocker = useBlocker({
    shouldBlockFn: () => hasUnsavedPreview,
    enableBeforeUnload: () => hasUnsavedPreview,
    withResolver: true,
  })
  const isDiscardDialogOpen =
    showDiscardConfirmation || routeBlocker.status === 'blocked'

  // Nothing left to discard: close the confirmation during render instead of
  // in an effect, so it never paints a frame after the preview is gone.
  if (!hasUnsavedPreview && showDiscardConfirmation) {
    setShowDiscardConfirmation(false)
  }

  useEffect(() => {
    if (hasUnsavedPreview) return
    discardWeekOffsetRef.current = null
    if (routeBlocker.status === 'blocked') routeBlocker.reset()
  }, [hasUnsavedPreview, routeBlocker])

  function handleWeekNavigation(nextOffset: number) {
    const clamped = Math.max(-1, Math.min(1, nextOffset))
    if (previewWeekStart) {
      discardWeekOffsetRef.current = clamped
      setShowDiscardConfirmation(true)
      return
    }
    if (clamped !== weekOffset) setUnlockedWeek(null)
    setWeekOffset(clamped)
  }

  function keepPreview() {
    setShowDiscardConfirmation(false)
    discardWeekOffsetRef.current = null
    if (routeBlocker.status === 'blocked') routeBlocker.reset()
  }

  function discardPreview() {
    if (isSavingPreview) return
    discardAiPreview()
    setShowDiscardConfirmation(false)
    const nextOffset = discardWeekOffsetRef.current
    discardWeekOffsetRef.current = null
    if (nextOffset !== null) setWeekOffset(nextOffset)
    else if (routeBlocker.status !== 'blocked' && previewWeekStart) {
      setWeekOffset(calendarWeekOffset(previewWeekStart))
    }
    if (routeBlocker.status === 'blocked') routeBlocker.proceed()
  }

  return {
    isDiscardDialogOpen,
    openDiscardConfirmation: () => setShowDiscardConfirmation(true),
    handleWeekNavigation,
    keepPreview,
    discardPreview,
  }
}
