import * as React from 'react'
import { ChartContext as TChartContext, TouchEvent } from './types'

const ChartContext = React.createContext<TChartContext>({
  data: [],
  dimensions: undefined,
  domain: { x: { min: 0, max: 0 }, y: { min: 0, max: 0 } },
  viewportDomain: { x: { min: 0, max: 0 }, y: { min: 0, max: 0 } },
  viewportOrigin: { x: 0, y: 0 },
  viewport: { size: { width: 0, height: 0 }, initialOrigin: { x: 0, y: 0 } },
  isLineAreaTooltipEnabled: true,
})

export const ChartContextProvider = ChartContext.Provider

export const useChartContextData = () => {
  const context = React.useContext(ChartContext)
  if (!context) {
    throw new Error('useChartContextData must be used within a <Chart /> component')
  }
  return context.data
}

export const useChartContextDimensions = () => {
  const context = React.useContext(ChartContext)
  if (!context) {
    throw new Error('useChartContextDimensions must be used within a <Chart /> component')
  }
  return context.dimensions
}

export const useChartContextDomain = () => {
  const context = React.useContext(ChartContext)
  if (!context) {
    throw new Error('useChartContextDomain must be used within a <Chart /> component')
  }
  return context.domain
}

export const useChartContextViewportDomain = () => {
  const context = React.useContext(ChartContext)
  if (!context) {
    throw new Error('useChartContextViewportDomain must be used within a <Chart /> component')
  }
  return context.viewportDomain
}

export const useChartContextViewportOrigin = () => {
  const context = React.useContext(ChartContext)
  if (!context) {
    throw new Error('useChartContextViewportOrigin must be used within a <Chart /> component')
  }
  return context.viewportOrigin
}

export const useChartContextViewport = () => {
  const context = React.useContext(ChartContext)
  if (!context) {
    throw new Error('useChartContextViewport must be used within a <Chart /> component')
  }
  return context.viewport
}

const ChartContextLastTouch = React.createContext<TouchEvent | undefined>(undefined)

export const ChartContextLastTouchProvider = ChartContextLastTouch.Provider

export const useChartContextLastTouch = () => {
  return React.useContext(ChartContextLastTouch)
}

export default ChartContext
