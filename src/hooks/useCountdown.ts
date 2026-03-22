import { useState, useEffect } from 'react'
import { getCountdown, type CountdownResult } from '../lib/utils'

export function useCountdown(targetDate: string | Date | null): CountdownResult {
  const [countdown, setCountdown] = useState<CountdownResult>(
    targetDate ? getCountdown(targetDate) : { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true, total: 0 }
  )

  useEffect(() => {
    if (!targetDate) return
    const timer = setInterval(() => {
      setCountdown(getCountdown(targetDate))
    }, 1000)
    return () => clearInterval(timer)
  }, [targetDate])

  return countdown
}
