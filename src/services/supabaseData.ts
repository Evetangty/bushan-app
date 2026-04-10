import { supabase } from '../lib/supabaseClient'
import type { Fabric, FinishedProduct, Pattern } from '../types'

function toMs(iso: string) {
  return new Date(iso).getTime()
}

export function rowToFabric(row: Record<string, unknown>): Fabric {
  return {
    id: String(row.id),
    imageBase64: String(row.image_base64),
    type: String(row.type),
    source: row.source != null ? String(row.source) : undefined,
    length: row.length_m != null ? Number(row.length_m) : undefined,
    width: row.width_m != null ? Number(row.width_m) : undefined,
    totalQuantity: Number(row.total_quantity),
    price: row.price != null ? Number(row.price) : undefined,
    usedQuantity: Number(row.used_quantity),
    createdAt: toMs(String(row.created_at)),
    updatedAt: toMs(String(row.updated_at)),
  }
}

export function rowToPattern(row: Record<string, unknown>): Pattern {
  return {
    id: String(row.id),
    imageBase64: String(row.image_base64),
    name: String(row.name),
    source: row.source != null ? String(row.source) : undefined,
    createdAt: toMs(String(row.created_at)),
    updatedAt: toMs(String(row.updated_at)),
  }
}

export function rowToFinished(row: Record<string, unknown>): FinishedProduct {
  return {
    id: String(row.id),
    imageBase64: String(row.image_base64),
    name: String(row.name),
    createdAt: toMs(String(row.created_at)),
    updatedAt: toMs(String(row.updated_at)),
  }
}

export async function cloudFetchAll(userId: string) {
  if (!supabase) throw new Error('Supabase 未初始化')

  const [fabricsRes, patternsRes, finishedRes] = await Promise.all([
    supabase.from('fabrics').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('patterns').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('finished_products').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
  ])

  if (fabricsRes.error) throw fabricsRes.error
  if (patternsRes.error) throw patternsRes.error
  if (finishedRes.error) throw finishedRes.error

  return {
    fabrics: (fabricsRes.data ?? []).map((r) => rowToFabric(r as Record<string, unknown>)),
    patterns: (patternsRes.data ?? []).map((r) => rowToPattern(r as Record<string, unknown>)),
    finishedProducts: (finishedRes.data ?? []).map((r) => rowToFinished(r as Record<string, unknown>)),
  }
}

export async function cloudInsertFabric(userId: string, payload: Omit<Fabric, 'id' | 'createdAt' | 'updatedAt'>) {
  if (!supabase) throw new Error('Supabase 未初始化')
  const { data, error } = await supabase
    .from('fabrics')
    .insert({
      user_id: userId,
      image_base64: payload.imageBase64,
      type: payload.type,
      source: payload.source ?? null,
      length_m: payload.length ?? null,
      width_m: payload.width ?? null,
      total_quantity: payload.totalQuantity,
      price: payload.price ?? null,
      used_quantity: payload.usedQuantity,
    })
    .select()
    .single()
  if (error) throw error
  return rowToFabric(data as Record<string, unknown>)
}

export async function cloudUpdateFabric(
  userId: string,
  id: string,
  patch: Partial<
    Pick<Fabric, 'imageBase64' | 'type' | 'source' | 'length' | 'width' | 'totalQuantity' | 'price' | 'usedQuantity'>
  >,
) {
  if (!supabase) throw new Error('Supabase 未初始化')
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (patch.imageBase64 !== undefined) row.image_base64 = patch.imageBase64
  if (patch.type !== undefined) row.type = patch.type
  if (patch.source !== undefined) row.source = patch.source ?? null
  if (patch.length !== undefined) row.length_m = patch.length ?? null
  if (patch.width !== undefined) row.width_m = patch.width ?? null
  if (patch.totalQuantity !== undefined) row.total_quantity = patch.totalQuantity
  if (patch.price !== undefined) row.price = patch.price ?? null
  if (patch.usedQuantity !== undefined) row.used_quantity = patch.usedQuantity

  const { error } = await supabase.from('fabrics').update(row).eq('id', id).eq('user_id', userId)
  if (error) throw error
}

export async function cloudDeleteFabric(userId: string, id: string) {
  if (!supabase) throw new Error('Supabase 未初始化')
  const { error } = await supabase.from('fabrics').delete().eq('id', id).eq('user_id', userId)
  if (error) throw error
}

export async function cloudInsertPattern(userId: string, payload: Omit<Pattern, 'id' | 'createdAt' | 'updatedAt'>) {
  if (!supabase) throw new Error('Supabase 未初始化')
  const { data, error } = await supabase
    .from('patterns')
    .insert({
      user_id: userId,
      image_base64: payload.imageBase64,
      name: payload.name,
      source: payload.source ?? null,
    })
    .select()
    .single()
  if (error) throw error
  return rowToPattern(data as Record<string, unknown>)
}

export async function cloudUpdatePattern(
  userId: string,
  id: string,
  patch: Partial<Pick<Pattern, 'imageBase64' | 'name' | 'source'>>,
) {
  if (!supabase) throw new Error('Supabase 未初始化')
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (patch.imageBase64 !== undefined) row.image_base64 = patch.imageBase64
  if (patch.name !== undefined) row.name = patch.name
  if (patch.source !== undefined) row.source = patch.source ?? null
  const { error } = await supabase.from('patterns').update(row).eq('id', id).eq('user_id', userId)
  if (error) throw error
}

export async function cloudDeletePattern(userId: string, id: string) {
  if (!supabase) throw new Error('Supabase 未初始化')
  const { error } = await supabase.from('patterns').delete().eq('id', id).eq('user_id', userId)
  if (error) throw error
}

export async function cloudInsertFinished(userId: string, payload: Omit<FinishedProduct, 'id' | 'createdAt' | 'updatedAt'>) {
  if (!supabase) throw new Error('Supabase 未初始化')
  const { data, error } = await supabase
    .from('finished_products')
    .insert({
      user_id: userId,
      image_base64: payload.imageBase64,
      name: payload.name,
    })
    .select()
    .single()
  if (error) throw error
  return rowToFinished(data as Record<string, unknown>)
}

export async function cloudUpdateFinished(
  userId: string,
  id: string,
  patch: Partial<Pick<FinishedProduct, 'imageBase64' | 'name'>>,
) {
  if (!supabase) throw new Error('Supabase 未初始化')
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (patch.imageBase64 !== undefined) row.image_base64 = patch.imageBase64
  if (patch.name !== undefined) row.name = patch.name
  const { error } = await supabase.from('finished_products').update(row).eq('id', id).eq('user_id', userId)
  if (error) throw error
}

export async function cloudDeleteFinished(userId: string, id: string) {
  if (!supabase) throw new Error('Supabase 未初始化')
  const { error } = await supabase.from('finished_products').delete().eq('id', id).eq('user_id', userId)
  if (error) throw error
}
