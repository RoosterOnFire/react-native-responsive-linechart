import deepmerge from 'deepmerge'
import * as React from 'react'
import { G, Path } from 'react-native-svg'

import ChartContext, { useChartContextLastTouch } from './ChartContext'
import { adjustPointsForThickStroke, calculateTooltipIndex } from './Line.utils'
import { ChartDataPoint, ChartDomain, Dimensions, Shape, Smoothing, Stroke } from './types'
import { scalePointsToDimensions, svgPath } from './utils'

type Props = {
  /** Theme for the line */
  theme?: {
    stroke?: Stroke
    scatter?: {
      default?: Shape
      selected?: Shape
    }
  }
  smoothing?: Smoothing
  /** Only works in combination with smoothing='bezier'. Value between 0 and 1. */
  tension?: number
  /** Component to render tooltips. An example component is included: <Tooltip />. */
  tooltipComponent?: JSX.Element
  /** Callback method that fires when a tooltip is displayed for a data point. */
  onTooltipSelect?: (value: ChartDataPoint, index: number) => void
  /** Callback method that fires when the user stopped touching the chart. */
  onTooltipSelectEnd?: () => void
  /** Set to true if the tooltip should be hidden immediately when the user stops dragging the chart. */
  hideTooltipOnDragEnd?: boolean
  /** Defines a period in ms after which the tooltip should hide */
  hideTooltipAfter?: number
  /** Initial index for the tooltip. The tooltip will be immediately visible at this index on first render, without requiring user interaction. */
  initialTooltipIndex?: number
  /** Data for the chart. Overrides optional data provided in `<Chart />`. */
  data?: ChartDataPoint[]
  dimensions?: Dimensions
  viewportDomain?: ChartDomain
  scaledPoints?: { x: number; y: number }[]
}

export type LineHandle = {
  setTooltipIndex: (index: number | undefined) => void
}

const Line = React.forwardRef<LineHandle, Props>(function Line(props, ref) {
  const { data: contextData, dimensions, viewportDomain, viewportOrigin } = React.useContext(ChartContext)

  const {
    theme: { stroke },
    data = contextData,
    tension,
    smoothing,
    tooltipComponent,
  } = deepmerge(defaultProps, props)

  if (!dimensions) {
    return null
  }

  React.useImperativeHandle(ref, () => ({
    setTooltipIndex: (index: number | undefined) => {},
  }))

  const scaledPoints = scalePointsToDimensions(data, viewportDomain, dimensions)
  const points = adjustPointsForThickStroke(scaledPoints, stroke)
  const path = svgPath(points, smoothing, tension)

  return (
    <React.Fragment>
      <G translateX={viewportOrigin.x} translateY={viewportOrigin.y}>
        <Path
          d={path}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={stroke.dashArray.length > 0 ? stroke.dashArray.join(',') : undefined}
          stroke={stroke.color}
          strokeWidth={stroke.width}
          strokeOpacity={stroke.opacity}
          mask="url(#Mask)"
        />
        {/* {points.map((p, i) => {
          const shape = i === tooltipIndex ? deepmerge(scatter.default, scatter.selected) : scatter.default
          // Don't render if point falls out of viewport
          if (data[i].x < viewportDomain.x.min || data[i].x > viewportDomain.x.max || data[i].y < viewportDomain.y.min || data[i].y > viewportDomain.y.max) {
            return null
          }
          // Don't render if shape has no dimensions
          if (shape.width === 0 || shape.height === 0) {
            return null
          }

          return (
            <Rect
              key={JSON.stringify(p)}
              x={p.x - shape.width / 2 + shape.dx}
              y={p.y - shape.height / 2 - shape.dy}
              rx={shape.rx}
              fill={shape.color}
              opacity={shape.opacity}
              height={shape.height}
              width={shape.width}
            />
          )
        })} */}
      </G>
      <LineTooltip data={data} dimensions={dimensions} viewportDomain={viewportDomain} tooltipComponent={tooltipComponent} scaledPoints={scaledPoints} />
    </React.Fragment>
  )
})

const LineTooltip: React.FC<Props> = (props) => {
  const lastTouch = useChartContextLastTouch()
  const { tooltipComponent, data, dimensions, scaledPoints } = deepmerge(defaultProps, props)

  if (!dimensions) {
    return null
  }

  let tooltipIndex: number | undefined = props.initialTooltipIndex !== undefined && !lastTouch ? props.initialTooltipIndex : undefined
  const newIndex = calculateTooltipIndex(scaledPoints, lastTouch?.position)
  if (lastTouch?.type === 'panEnd') {
    // do nothing
  } else if (newIndex !== tooltipIndex && lastTouch) {
    // Necessary for Android because pan is called even when finger is not actually panning.
    // If we don't check for this, we have interference with the tap handler
    if (lastTouch?.type !== 'pan' || Math.abs(lastTouch?.translation?.x) > 5) {
      tooltipIndex = newIndex
    }
  } else if (newIndex === tooltipIndex && lastTouch?.type === 'tap') {
    tooltipIndex = undefined
  }

  if (tooltipIndex === undefined || tooltipComponent === undefined || tooltipComponent === null) {
    return null
  }

  return <>{React.cloneElement(tooltipComponent, { value: data[tooltipIndex], position: scaledPoints[tooltipIndex] })}</>
}

export { Line }

const defaultProps = {
  theme: {
    stroke: {
      color: 'black',
      width: 1,
      opacity: 1,
      dashArray: [],
    },
    scatter: {
      default: {
        width: 0,
        height: 0,
        dx: 0,
        dy: 0,
        rx: 0,
        color: 'black',
      },
      selected: {},
    },
  },
  tension: 0.3,
  smoothing: 'none',
  scaledPoints: [],
}
