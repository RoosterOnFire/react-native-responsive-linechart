import { AxisDomain } from './types'

export const calculateTickValues = (
  tickValues: number[] | undefined,
  tickCount: number | undefined,
  domain: AxisDomain,
  includeOriginTick?: boolean
): number[] => {
  let ticks = tickValues

  const difference = Math.abs(domain.max - domain.min)

  const originTickOffset = includeOriginTick ? 1 : 0

  if (!ticks && tickCount) {
    ticks = new Array(tickCount)
      .fill(undefined)
      .map((v: any, i: number) => domain.min + (difference * (i + 1 - originTickOffset)) / (tickCount - originTickOffset))
  }

  if (ticks) {
    const valuesForDomain = new Array(ticks.length)
    let count = 0
    for (let i = 0; i < ticks.length; i++) {
      const value = ticks[i]
      if (value >= domain.min && value <= domain.max) {
        valuesForDomain[count++] = value
      }
    }
    return valuesForDomain.slice(0, count)
  }

  return []
}
