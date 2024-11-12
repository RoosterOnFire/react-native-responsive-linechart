import deepmerge from 'deepmerge'
import fastEqual from 'fast-deep-equal/react'
import clamp from 'lodash.clamp'
import debounce from 'lodash.debounce'
import maxBy from 'lodash.maxby'
import minBy from 'lodash.minby'
import * as React from 'react'
import { Animated, NativeSyntheticEvent, View, ViewStyle } from 'react-native'
import { GestureHandlerRootView, PanGestureHandler, State, TapGestureHandler } from 'react-native-gesture-handler'
import Svg, { Defs, G, Mask, Rect } from 'react-native-svg'
import { calculateDataDimensions, calculateViewportDomain } from './Chart.utils'
import { ChartContextLastTouchProvider, ChartContextProvider } from './ChartContext'
import { AxisDomain, ChartDataPoint, Padding, TouchEvent, ViewPort } from './types'
import { useComponentDimensions } from './useComponentDimensions'
import { scalePointToDimensions } from './utils'

type Props = {
  /** All styling can be used except for padding. If you need padding, use the explicit `padding` prop below.*/
  style?: ViewStyle
  /** Data to be used by `<Area />` or `<Line />` children. Not required, and can be overridden in Area or Line components. */
  data?: ChartDataPoint[]
  /** Domain for the horizontal (X) axis. */
  xDomain?: AxisDomain
  /** Domain for the vertical (Y) axis. */
  yDomain?: AxisDomain
  /** Size of the viewport for the chart. Should always be <= the domain. */
  viewport?: ViewPort
  /** This disables touch for the chart. You can use this if you don't need tooltips. */
  disableTouch?: boolean
  /** This disables gestures for the chart. You can use this if you don't need scrolling in the chart. */
  disableGestures?: boolean
  /** Padding of the chart. Use this instead of setting padding in the `style` prop. */
  padding?: Padding
  dimensions?: { width: number; height: number } | undefined
  dataDimensions?: { top: number; left: number; width: number; height: number }
  /** extra */
  isLineAreaTooltipEnabled?: boolean
}

const Chart: React.FC<Props> = React.memo((props) => {
  const { style, children, padding } = deepmerge(computeDefaultProps(props), props)
  const { dimensions, onLayout } = useComponentDimensions()
  const dataDimensions = calculateDataDimensions(dimensions, padding)

  const childComponents = React.Children.toArray(children)
  // undefined because ForwardRef (Line) has name undefined
  const lineAndAreaComponents = childComponents.filter((c) => ['Area', undefined].includes((c as any)?.type?.name))
  const otherComponents = childComponents.filter((c) => !['Area', undefined].includes((c as any)?.type?.name))

  return (
    <View style={style} onLayout={onLayout}>
      <GestureHandlerRootView>
        {!!dimensions && (
          <ChartInnerContainer {...props} dimensions={dimensions} dataDimensions={dataDimensions}>
            <Svg width={dimensions.width} height={dimensions.height}>
              <G translateX={padding.left} translateY={padding.top}>
                {otherComponents}
                <Defs>
                  {/* Mask to fix viewport overflow bugs */}
                  <Mask id="Mask" x={0} y={0} width={dataDimensions.width} height={dataDimensions.height}>
                    <Rect x="0" y="0" width={dataDimensions.width} height={dataDimensions.height} fill="#ffffff" />
                  </Mask>
                </Defs>
                {lineAndAreaComponents}
              </G>
            </Svg>
          </ChartInnerContainer>
        )}
      </GestureHandlerRootView>
    </View>
  )
}, fastEqual)

const ChartInnerContainer: React.FC<Props> = (props) => {
  const { children, padding, xDomain, yDomain, viewport, disableGestures, disableTouch, dimensions, dataDimensions, isLineAreaTooltipEnabled } = deepmerge(
    computeDefaultProps(props),
    props
  )

  const tapGesture = React.createRef() // declared within constructor
  const panGesture = React.createRef()

  const [lastTouch, setLastTouch] = React.useState<TouchEvent | undefined>(undefined)
  const [pan, setPan] = React.useState<{ x: number; y: number }>({
    x: viewport.initialOrigin.x,
    y: viewport.initialOrigin.y,
  })
  const [offset] = React.useState(new Animated.ValueXY({ x: viewport.initialOrigin.x, y: viewport.initialOrigin.y }))

  const viewportDomain = calculateViewportDomain(viewport, { x: xDomain, y: yDomain }, pan.x, pan.y)

  const handleTouchEvent = React.useCallback(
    debounce(
      (x: number, y: number) => {
        if (dataDimensions) {
          setLastTouch({
            position: {
              x: clamp(x - padding.left, 0, dataDimensions.width),
              y: clamp(y - padding.top, 0, dataDimensions.height),
            },
            type: 'tap',
          })
        }

        return true
      },
      300,
      { leading: true, trailing: false }
    ),
    [JSON.stringify(dataDimensions)]
  )

  const handlePanEvent = (evt: NativeSyntheticEvent<any>) => {
    if (dataDimensions) {
      const factorX = viewport.size.width / dataDimensions.width
      const factorY = viewport.size.height / dataDimensions.height
      setPan({ x: factorX, y: factorY })

      if (evt.nativeEvent.state === State.END) {
        offset.x.setValue(clamp((offset.x as any)._value - evt.nativeEvent.translationX * factorX, xDomain.min, xDomain.max - viewport.size.width))
        offset.y.setValue(clamp((offset.y as any)._value + evt.nativeEvent.translationY * factorY, yDomain.min, yDomain.max - viewport.size.height))
        setLastTouch({
          position: {
            x: clamp(evt.nativeEvent.x - padding.left, 0, dataDimensions.width),
            y: clamp(evt.nativeEvent.y - padding.top, 0, dataDimensions.height),
          },
          translation: {
            x: evt.nativeEvent.translationX,
            y: evt.nativeEvent.translationY,
          },
          type: 'panEnd',
        })
      } else {
        setLastTouch({
          position: {
            x: clamp(evt.nativeEvent.x - padding.left, 0, dataDimensions.width),
            y: clamp(evt.nativeEvent.y - padding.top, 0, dataDimensions.height),
          },
          translation: {
            x: evt.nativeEvent.translationX,
            y: evt.nativeEvent.translationY,
          },
          type: 'pan',
        })
      }
    }
    return true
  }

  const _onTouchGestureEvent = Animated.event<any>([{ nativeEvent: {} }], {
    useNativeDriver: true,
    listener: (evt) => {
      // Necessary to debounce function, see https://medium.com/trabe/react-syntheticevent-reuse-889cd52981b6
      if (evt.nativeEvent.state === State.ACTIVE) {
        handleTouchEvent(evt.nativeEvent.x, evt.nativeEvent.y)
      }
    },
  })

  const _onPanGestureEvent = Animated.event<any>([{ nativeEvent: {} }], {
    useNativeDriver: true,
    listener: handlePanEvent,
  })

  const chartContextMemo = React.useMemo(() => {
    return {
      data: [],
      dimensions: dataDimensions,
      domain: { x: xDomain, y: yDomain },
      viewportDomain: viewportDomain,
      viewportOrigin: scalePointToDimensions({ x: viewportDomain.x.min, y: viewportDomain.y.max }, viewportDomain, dataDimensions),
      viewport: viewport,
      isLineAreaTooltipEnabled: isLineAreaTooltipEnabled,
    }
  }, [
    dataDimensions.top,
    dataDimensions.left,
    dataDimensions.width,
    dataDimensions.height,
    viewportDomain.x.min,
    viewportDomain.x.max,
    viewportDomain.y.min,
    viewportDomain.y.max,
    viewport.initialOrigin.x,
    viewport.initialOrigin.y,
    viewport.size.height,
    viewport.size.width,
  ])

  return (
    <>
      {!!dimensions && (
        <TapGestureHandler enabled={!disableTouch} onHandlerStateChange={_onTouchGestureEvent} ref={tapGesture}>
          <Animated.View style={{ width: dimensions.width, height: dimensions.height }}>
            <PanGestureHandler
              enabled={!disableGestures}
              minDeltaX={10}
              minDeltaY={10}
              onGestureEvent={_onPanGestureEvent}
              onHandlerStateChange={_onPanGestureEvent}
              ref={panGesture}
            >
              <Animated.View style={{ width: dimensions.width, height: dimensions.height }}>
                <ChartContextProvider value={chartContextMemo}>
                  <ChartContextLastTouchProvider value={lastTouch}>{children}</ChartContextLastTouchProvider>
                </ChartContextProvider>
              </Animated.View>
            </PanGestureHandler>
          </Animated.View>
        </TapGestureHandler>
      )}
    </>
  )
}

export { Chart }

const computeDefaultProps = (props: Props) => {
  const { data = [] } = props

  const xDomain = props.xDomain ?? {
    min: data.length > 0 ? minBy(data, (d) => d.x)!.x : 0,
    max: data.length > 0 ? maxBy(data, (d) => d.x)!.x : 10,
  }

  const yDomain = props.yDomain ?? {
    min: data.length > 0 ? minBy(data, (d) => d.y)!.y : 0,
    max: data.length > 0 ? maxBy(data, (d) => d.y)!.y : 10,
  }

  return {
    padding: {
      left: 0,
      top: 0,
      bottom: 0,
      right: 0,
    },
    xDomain,
    yDomain,
    viewport: {
      size: { width: Math.abs(xDomain.max - xDomain.min), height: Math.abs(yDomain.max - yDomain.min) },
      initialOrigin: { x: xDomain.min, y: yDomain.min },
    },
    isLineAreaTooltipEnabled: true,
  }
}
