import { animate } from '@lynx-js/motion'
import type { ReactNode } from '@lynx-js/react'
import {
  runOnMainThread,
  useEffect,
  useMainThreadRef,
  useMemo,
} from '@lynx-js/react'
import type { MainThread } from '@lynx-js/types'

export function MotionView(props: {
  children: ReactNode
  enabled: boolean
  className?: string
  style?: Record<string, string | number>
  delay?: number
}) {
  const ref = useMainThreadRef<MainThread.Element>(null)
  useMemo(() => animate, [])

  useEffect(() => {
    if (!props.enabled) return
    const timer = setTimeout(() => {
      runOnMainThread(() => {
        'main thread'
        if (!ref.current) return
        animate(
          ref.current as never,
          { y: [9, 0], scale: [0.985, 1] },
          { duration: 0.24, delay: props.delay ?? 0, ease: 'easeOut' },
        )
      })()
    }, 50)
    return () => clearTimeout(timer)
  }, [props.delay, props.enabled])

  return (
    <view
      main-thread:ref={ref}
      className={props.className}
      style={{ opacity: 1, ...props.style }}
    >
      {props.children}
    </view>
  )
}

export function useEntranceMotion(enabled: boolean, offset = 14) {
  const ref = useMainThreadRef<MainThread.Element>(null)
  useMemo(() => animate, [])
  useEffect(() => {
    if (!enabled) return
    const timer = setTimeout(() => {
      runOnMainThread(() => {
        'main thread'
        if (!ref.current) return
        animate(
          ref.current as never,
          { y: [offset, 0] },
          { duration: 0.34, ease: 'easeOut' },
        )
      })()
    }, 70)
    return () => clearTimeout(timer)
  }, [enabled, offset])
  return ref
}
