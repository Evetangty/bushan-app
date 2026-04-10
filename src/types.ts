export type FabricStatus = '未使用' | '使用中' | '已用完'

export interface Fabric {
  id: string
  imageBase64: string
  type: string
  source?: string
  length?: number
  width?: number
  totalQuantity: number
  price?: number
  usedQuantity: number
  createdAt: number
  updatedAt: number
}

export interface Pattern {
  id: string
  imageBase64: string
  name: string
  source?: string
  detailRaw?: string
  sizeCode?: string
  bust?: string
  waist?: string
  hip?: string
  lengthInfo?: string
  suitableFabric?: string
  createdAt: number
  updatedAt: number
}

export interface FinishedProduct {
  id: string
  imageBase64: string
  name: string
  createdAt: number
  updatedAt: number
}

export type EntityType = 'fabric' | 'pattern' | 'finished'
