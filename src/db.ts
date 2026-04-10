import Dexie, { type Table } from 'dexie'
import type { Fabric, FinishedProduct, Pattern } from './types'

class BushanDatabase extends Dexie {
  fabrics!: Table<Fabric, string>
  patterns!: Table<Pattern, string>
  finishedProducts!: Table<FinishedProduct, string>

  constructor() {
    super('BushanDB')
    this.version(1).stores({
      fabrics: 'id, type, createdAt, updatedAt',
      patterns: 'id, name, createdAt, updatedAt',
      finishedProducts: 'id, name, createdAt, updatedAt',
    })
    this.version(2).stores({
      fabrics: 'id, type, createdAt, updatedAt',
      patterns: 'id, name, sizeCode, suitableFabric, createdAt, updatedAt',
      finishedProducts: 'id, name, createdAt, updatedAt',
    })
  }
}

export const db = new BushanDatabase()
