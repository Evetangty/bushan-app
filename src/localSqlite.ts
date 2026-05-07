import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js'
import type { Fabric, FinishedProduct, Pattern } from './types'

import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url'

const IDB_NAME = 'BushanSQLite'
const IDB_STORE = 'db'
const IDB_KEY = 'sqlite'

let sqlReady: Promise<SqlJsStatic> | null = null
let dbPromise: Promise<Database> | null = null
let mutex = Promise.resolve()

function withMutex<T>(fn: () => Promise<T>): Promise<T> {
  const next = mutex.then(() => fn())
  mutex = next.catch(() => undefined)
  return next
}

function openIdb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(IDB_STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function idbGetBlob(): Promise<Uint8Array | null> {
  const idb = await openIdb()
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(IDB_STORE, 'readonly')
    const getReq = tx.objectStore(IDB_STORE).get(IDB_KEY)
    getReq.onsuccess = () => {
      const v = getReq.result as ArrayBuffer | Uint8Array | undefined
      if (!v) {
        resolve(null)
        return
      }
      resolve(v instanceof Uint8Array ? v : new Uint8Array(v))
    }
    getReq.onerror = () => reject(getReq.error)
  })
}

async function idbSetBlob(data: Uint8Array): Promise<void> {
  const idb = await openIdb()
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(IDB_STORE, 'readwrite')
    tx.objectStore(IDB_STORE).put(data, IDB_KEY)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

async function persist(db: Database): Promise<void> {
  const exported = db.export()
  await idbSetBlob(exported)
}

function ensureSchema(db: Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS fabrics (
      id TEXT PRIMARY KEY NOT NULL,
      image_base64 TEXT NOT NULL,
      type TEXT NOT NULL,
      source TEXT,
      length_m REAL,
      width_m REAL,
      total_quantity REAL NOT NULL,
      price REAL,
      used_quantity REAL NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS patterns (
      id TEXT PRIMARY KEY NOT NULL,
      image_base64 TEXT NOT NULL,
      name TEXT NOT NULL,
      source TEXT,
      detail_raw TEXT,
      size_code TEXT,
      bust TEXT,
      waist TEXT,
      hip TEXT,
      length_info TEXT,
      suitable_fabric TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS finished_products (
      id TEXT PRIMARY KEY NOT NULL,
      image_base64 TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `)
}

async function getSql(): Promise<SqlJsStatic> {
  if (!sqlReady) sqlReady = initSqlJs({ locateFile: () => wasmUrl })
  return sqlReady
}

async function getDb(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const SQL = await getSql()
      const existing = await idbGetBlob()
      const db = existing ? new SQL.Database(existing) : new SQL.Database()
      ensureSchema(db)
      await persist(db)
      return db
    })()
  }
  return dbPromise
}

function rowFabric(o: Record<string, unknown>): Fabric {
  return {
    id: String(o.id),
    imageBase64: String(o.image_base64),
    type: String(o.type),
    source: o.source != null ? String(o.source) : undefined,
    length: o.length_m != null ? Number(o.length_m) : undefined,
    width: o.width_m != null ? Number(o.width_m) : undefined,
    totalQuantity: Number(o.total_quantity),
    price: o.price != null ? Number(o.price) : undefined,
    usedQuantity: Number(o.used_quantity),
    createdAt: Number(o.created_at),
    updatedAt: Number(o.updated_at),
  }
}

function rowPattern(o: Record<string, unknown>): Pattern {
  return {
    id: String(o.id),
    imageBase64: String(o.image_base64),
    name: String(o.name),
    source: o.source != null ? String(o.source) : undefined,
    detailRaw: o.detail_raw != null ? String(o.detail_raw) : undefined,
    sizeCode: o.size_code != null ? String(o.size_code) : undefined,
    bust: o.bust != null ? String(o.bust) : undefined,
    waist: o.waist != null ? String(o.waist) : undefined,
    hip: o.hip != null ? String(o.hip) : undefined,
    lengthInfo: o.length_info != null ? String(o.length_info) : undefined,
    suitableFabric: o.suitable_fabric != null ? String(o.suitable_fabric) : undefined,
    createdAt: Number(o.created_at),
    updatedAt: Number(o.updated_at),
  }
}

function rowFinished(o: Record<string, unknown>): FinishedProduct {
  return {
    id: String(o.id),
    imageBase64: String(o.image_base64),
    name: String(o.name),
    createdAt: Number(o.created_at),
    updatedAt: Number(o.updated_at),
  }
}

function selectAll<T>(db: Database, sql: string, map: (o: Record<string, unknown>) => T): T[] {
  const stmt = db.prepare(sql)
  const out: T[] = []
  while (stmt.step()) {
    out.push(map(stmt.getAsObject() as Record<string, unknown>))
  }
  stmt.free()
  return out
}

function selectFabricById(db: Database, id: string): Fabric | undefined {
  const stmt = db.prepare('SELECT * FROM fabrics WHERE id = ?')
  stmt.bind([id])
  if (!stmt.step()) {
    stmt.free()
    return undefined
  }
  const row = rowFabric(stmt.getAsObject() as Record<string, unknown>)
  stmt.free()
  return row
}

function selectPatternById(db: Database, id: string): Pattern | undefined {
  const stmt = db.prepare('SELECT * FROM patterns WHERE id = ?')
  stmt.bind([id])
  if (!stmt.step()) {
    stmt.free()
    return undefined
  }
  const row = rowPattern(stmt.getAsObject() as Record<string, unknown>)
  stmt.free()
  return row
}

function selectFinishedById(db: Database, id: string): FinishedProduct | undefined {
  const stmt = db.prepare('SELECT * FROM finished_products WHERE id = ?')
  stmt.bind([id])
  if (!stmt.step()) {
    stmt.free()
    return undefined
  }
  const row = rowFinished(stmt.getAsObject() as Record<string, unknown>)
  stmt.free()
  return row
}

export async function sqliteFetchAll(): Promise<{
  fabrics: Fabric[]
  patterns: Pattern[]
  finishedProducts: FinishedProduct[]
}> {
  return withMutex(async () => {
    const db = await getDb()
    const fabrics = selectAll(db, 'SELECT * FROM fabrics ORDER BY created_at DESC', rowFabric)
    const patterns = selectAll(db, 'SELECT * FROM patterns ORDER BY created_at DESC', rowPattern)
    const finishedProducts = selectAll(db, 'SELECT * FROM finished_products ORDER BY created_at DESC', rowFinished)
    return { fabrics, patterns, finishedProducts }
  })
}

export async function sqliteInsertFabric(row: Omit<Fabric, 'id'> & { id: string }): Promise<void> {
  return withMutex(async () => {
    const db = await getDb()
    db.run(
      `INSERT INTO fabrics (id, image_base64, type, source, length_m, width_m, total_quantity, price, used_quantity, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        row.id,
        row.imageBase64,
        row.type,
        row.source ?? null,
        row.length ?? null,
        row.width ?? null,
        row.totalQuantity,
        row.price ?? null,
        row.usedQuantity,
        row.createdAt,
        row.updatedAt,
      ],
    )
    await persist(db)
  })
}

export async function sqliteUpdateFabric(
  id: string,
  patch: Partial<
    Pick<Fabric, 'imageBase64' | 'type' | 'source' | 'length' | 'width' | 'totalQuantity' | 'price' | 'usedQuantity' | 'updatedAt'>
  >,
): Promise<void> {
  return withMutex(async () => {
    const db = await getDb()
    const cur = selectFabricById(db, id)
    if (!cur) throw new Error('布料不存在')
    const next: Fabric = {
      ...cur,
      ...patch,
      imageBase64: patch.imageBase64 ?? cur.imageBase64,
      type: patch.type ?? cur.type,
      source: patch.source !== undefined ? patch.source : cur.source,
      length: patch.length !== undefined ? patch.length : cur.length,
      width: patch.width !== undefined ? patch.width : cur.width,
      totalQuantity: patch.totalQuantity ?? cur.totalQuantity,
      price: patch.price !== undefined ? patch.price : cur.price,
      usedQuantity: patch.usedQuantity ?? cur.usedQuantity,
      updatedAt: patch.updatedAt ?? cur.updatedAt,
    }
    db.run(
      `UPDATE fabrics SET image_base64=?, type=?, source=?, length_m=?, width_m=?, total_quantity=?, price=?, used_quantity=?, updated_at=? WHERE id=?`,
      [
        next.imageBase64,
        next.type,
        next.source ?? null,
        next.length ?? null,
        next.width ?? null,
        next.totalQuantity,
        next.price ?? null,
        next.usedQuantity,
        next.updatedAt,
        id,
      ],
    )
    await persist(db)
  })
}

export async function sqliteDeleteFabric(id: string): Promise<void> {
  return withMutex(async () => {
    const db = await getDb()
    db.run('DELETE FROM fabrics WHERE id = ?', [id])
    await persist(db)
  })
}

export async function sqliteInsertPattern(row: Omit<Pattern, 'id'> & { id: string }): Promise<void> {
  return withMutex(async () => {
    const db = await getDb()
    db.run(
      `INSERT INTO patterns (id, image_base64, name, source, detail_raw, size_code, bust, waist, hip, length_info, suitable_fabric, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        row.id,
        row.imageBase64,
        row.name,
        row.source ?? null,
        row.detailRaw ?? null,
        row.sizeCode ?? null,
        row.bust ?? null,
        row.waist ?? null,
        row.hip ?? null,
        row.lengthInfo ?? null,
        row.suitableFabric ?? null,
        row.createdAt,
        row.updatedAt,
      ],
    )
    await persist(db)
  })
}

export async function sqliteUpdatePattern(
  id: string,
  patch: Partial<
    Pick<
      Pattern,
      | 'name'
      | 'source'
      | 'imageBase64'
      | 'detailRaw'
      | 'sizeCode'
      | 'bust'
      | 'waist'
      | 'hip'
      | 'lengthInfo'
      | 'suitableFabric'
      | 'updatedAt'
    >
  >,
): Promise<void> {
  return withMutex(async () => {
    const db = await getDb()
    const cur = selectPatternById(db, id)
    if (!cur) throw new Error('纸样不存在')
    const next: Pattern = {
      ...cur,
      ...patch,
      name: patch.name ?? cur.name,
      source: patch.source !== undefined ? patch.source : cur.source,
      imageBase64: patch.imageBase64 ?? cur.imageBase64,
      detailRaw: patch.detailRaw !== undefined ? patch.detailRaw : cur.detailRaw,
      sizeCode: patch.sizeCode !== undefined ? patch.sizeCode : cur.sizeCode,
      bust: patch.bust !== undefined ? patch.bust : cur.bust,
      waist: patch.waist !== undefined ? patch.waist : cur.waist,
      hip: patch.hip !== undefined ? patch.hip : cur.hip,
      lengthInfo: patch.lengthInfo !== undefined ? patch.lengthInfo : cur.lengthInfo,
      suitableFabric: patch.suitableFabric !== undefined ? patch.suitableFabric : cur.suitableFabric,
      updatedAt: patch.updatedAt ?? cur.updatedAt,
    }
    db.run(
      `UPDATE patterns SET image_base64=?, name=?, source=?, detail_raw=?, size_code=?, bust=?, waist=?, hip=?, length_info=?, suitable_fabric=?, updated_at=? WHERE id=?`,
      [
        next.imageBase64,
        next.name,
        next.source ?? null,
        next.detailRaw ?? null,
        next.sizeCode ?? null,
        next.bust ?? null,
        next.waist ?? null,
        next.hip ?? null,
        next.lengthInfo ?? null,
        next.suitableFabric ?? null,
        next.updatedAt,
        id,
      ],
    )
    await persist(db)
  })
}

export async function sqliteDeletePattern(id: string): Promise<void> {
  return withMutex(async () => {
    const db = await getDb()
    db.run('DELETE FROM patterns WHERE id = ?', [id])
    await persist(db)
  })
}

export async function sqliteInsertFinished(row: Omit<FinishedProduct, 'id'> & { id: string }): Promise<void> {
  return withMutex(async () => {
    const db = await getDb()
    db.run(`INSERT INTO finished_products (id, image_base64, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`, [
      row.id,
      row.imageBase64,
      row.name,
      row.createdAt,
      row.updatedAt,
    ])
    await persist(db)
  })
}

export async function sqliteUpdateFinished(
  id: string,
  patch: Partial<Pick<FinishedProduct, 'name' | 'imageBase64' | 'updatedAt'>>,
): Promise<void> {
  return withMutex(async () => {
    const db = await getDb()
    const cur = selectFinishedById(db, id)
    if (!cur) throw new Error('成品不存在')
    const next: FinishedProduct = {
      ...cur,
      name: patch.name ?? cur.name,
      imageBase64: patch.imageBase64 ?? cur.imageBase64,
      updatedAt: patch.updatedAt ?? cur.updatedAt,
    }
    db.run(`UPDATE finished_products SET image_base64=?, name=?, updated_at=? WHERE id=?`, [
      next.imageBase64,
      next.name,
      next.updatedAt,
      id,
    ])
    await persist(db)
  })
}

export async function sqliteDeleteFinished(id: string): Promise<void> {
  return withMutex(async () => {
    const db = await getDb()
    db.run('DELETE FROM finished_products WHERE id = ?', [id])
    await persist(db)
  })
}
