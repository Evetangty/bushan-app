import type { Fabric, FabricStatus } from './types'

const formatMeterNumber = (value: number) => {
  const oneDecimal = Math.round(value * 10) / 10
  return Number.isInteger(oneDecimal) ? String(oneDecimal) : oneDecimal.toFixed(1)
}

export const formatMeters = (value: number) => `${formatMeterNumber(value)} 米`
export const formatPrice = (value: number) => `¥ ${value.toFixed(2)}`

export const calculateRemaining = (fabric: Pick<Fabric, 'totalQuantity' | 'usedQuantity'>) =>
  Math.max(0, fabric.totalQuantity - fabric.usedQuantity)

export const calculateProgress = (fabric: Pick<Fabric, 'totalQuantity' | 'usedQuantity'>) => {
  if (fabric.totalQuantity <= 0) return 0
  return Math.min(100, (fabric.usedQuantity / fabric.totalQuantity) * 100)
}

export const calculateStatus = (fabric: Pick<Fabric, 'totalQuantity' | 'usedQuantity'>): FabricStatus => {
  if (fabric.usedQuantity <= 0) return '未使用'
  if (fabric.usedQuantity >= fabric.totalQuantity) return '已用完'
  return '使用中'
}

export const genId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
