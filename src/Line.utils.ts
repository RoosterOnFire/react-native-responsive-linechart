import { Stroke, XYValue } from './types'

export const adjustPointsForThickStroke = (originalPoints: XYValue[], stroke: Required<Stroke>) => {
  if (originalPoints.length < 2) return originalPoints

  // Creates new array, doesn't modify originalPoints array
  const points = [...originalPoints]

  // Creates new objects, doesn't modify original objects
  // First and last points are adjusted to prevent "fat" lines from flowing out of the chart
  points[0] = { x: points[0].x + Math.floor(stroke.width / 2), y: points[0].y }
  points[points.length - 1] = { x: points[points.length - 1].x - stroke.width / 2, y: points[points.length - 1].y }

  return points
}

export const calculateTooltipIndex = (points: XYValue[], lastTouch?: XYValue) => {
  if (!lastTouch || points.length < 1) {
    return undefined
  }

  let lowest = 0

  for (let i = 0; i < points.length; i++) {
    const current = Math.abs(points[i].x - lastTouch.x)
    if (current < Math.abs(points[lowest].x - lastTouch.x)) {
      lowest = i
    }
  }

  return lowest
}
