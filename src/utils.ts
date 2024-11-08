import spline from '@yr/monotone-cubic-spline'
import Bezier from 'paths-js/bezier'
import Polygon from 'paths-js/polygon'
import { ChartDataPoint, ChartDomain, Dimensions, Smoothing, XYValue } from './types'

class StringBuilder {
  private parts: string[]
  private capacity: number

  constructor(initialCapacity: number = 16) {
    this.parts = new Array(initialCapacity)
    this.capacity = 0
  }

  append(str: string): StringBuilder {
    this.parts[this.capacity++] = str
    return this
  }

  toString(): string {
    return this.parts.slice(0, this.capacity).join('')
  }
}

export const scalePointToDimensions = (data: ChartDataPoint, domain: ChartDomain, dimensions: Dimensions) => ({
  x: dimensions.left + ((data.x - domain.x.min) * dimensions.width) / Math.abs(domain.x.max - domain.x.min),
  y: dimensions.height + dimensions.top - ((data.y - domain.y.min) * dimensions.height) / Math.abs(domain.y.max - domain.y.min),
})

export const scalePointsToDimensions = (data: ChartDataPoint[], domain: ChartDomain, dimensions: Dimensions) => {
  const result: {
    x: number
    y: number
  }[] = new Array(data.length)

  for (let i = 0; i < data.length; i++) {
    result[i] = scalePointToDimensions(data[i], domain, dimensions)
  }

  return result
}

export const appendPointsToPath = (path: string, points: XYValue[]) => {
  const builder = new StringBuilder(points.length + 1)
  builder.append(path)

  for (let i = 0; i < points.length; i++) {
    builder.append(` L ${points[i].x} ${points[i].y}`)
  }

  return builder.toString()
}

export const svgPath = (points: XYValue[], smoothing: Smoothing, tension: number) => {
  let pointsLocal = new Array(points.length)
  for (let index = 0; index < points.length; index++) {
    const p = points[index]
    pointsLocal[index] = [p.x, p.y]
  }

  if (smoothing === 'bezier') {
    return Bezier({ points: pointsLocal, tension }).path.print()
  } else if (smoothing === 'cubic-spline' && points.length > 1) {
    return spline.svgPath(spline.points(pointsLocal))
  } else {
    return Polygon({ points: pointsLocal }).path.print()
  }
}
