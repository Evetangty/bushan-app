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

export interface ParsedPatternDetail {
  sizeCode?: string
  bust?: string
  waist?: string
  hip?: string
  lengthInfo?: string
  suitableFabric?: string
}

const matchValue = (text: string, label: string) => {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`${escaped}\\s*[：:]\\s*([^\\n\\r]+)`, 'i')
  return text.match(regex)?.[1]?.trim()
}

export const parsePatternDetail = (raw: string): ParsedPatternDetail => {
  const text = raw.replace(/\r\n/g, '\n')
  return {
    sizeCode: matchValue(text, '纸样码数'),
    bust: matchValue(text, '胸围'),
    waist: matchValue(text, '腰围'),
    hip: matchValue(text, '臀围'),
    lengthInfo: matchValue(text, '长度'),
    suitableFabric: matchValue(text, '纸样适合布料'),
  }
}
