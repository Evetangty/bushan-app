import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { db } from './db'
import { Layout } from './components/Layout'
import {
  AddEntityModal,
  FabricCard,
  FabricFormModal,
  GridCard,
  ItemFormModal,
  UseFabricModal,
} from './components/Modals'
import { StatsPanel } from './components/StatsPanel'
import { isSupabaseConfigured } from './lib/supabaseClient'
import { LoginPage } from './pages/LoginPage'
import {
  cloudDeleteFabric,
  cloudDeleteFinished,
  cloudDeletePattern,
  cloudFetchAll,
  cloudInsertFabric,
  cloudInsertFinished,
  cloudInsertPattern,
  cloudUpdateFabric,
  cloudUpdateFinished,
  cloudUpdatePattern,
} from './services/supabaseData'
import type { EntityType, Fabric, FinishedProduct, Pattern } from './types'
import { calculateRemaining, genId } from './utils'

function App() {
  const { session, authLoading } = useAuth()

  if (isSupabaseConfigured) {
    if (authLoading) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#fdf8f0] p-4 text-gray-600">
          加载中…
        </div>
      )
    }
    if (!session) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#fdf8f0] p-4">
          <LoginPage />
        </div>
      )
    }
  }

  return <AuthenticatedApp />
}

function AuthenticatedApp() {
  const { session, useCloud } = useAuth()
  const userId = session?.user.id

  const [fabrics, setFabrics] = useState<Fabric[]>([])
  const [patterns, setPatterns] = useState<Pattern[]>([])
  const [finishedProducts, setFinishedProducts] = useState<FinishedProduct[]>([])
  const [loading, setLoading] = useState(true)

  const [fabricModalOpen, setFabricModalOpen] = useState(false)
  const [fabricEditing, setFabricEditing] = useState<Fabric | null>(null)
  const [useFabricOpen, setUseFabricOpen] = useState(false)
  const [useFabricTarget, setUseFabricTarget] = useState<Fabric | null>(null)

  const [itemModalOpen, setItemModalOpen] = useState(false)
  const [itemType, setItemType] = useState<EntityType>('pattern')
  const [itemEditing, setItemEditing] = useState<Pattern | FinishedProduct | null>(null)
  const [addEntityModalOpen, setAddEntityModalOpen] = useState(false)
  const [homeQuery, setHomeQuery] = useState('')
  const [patternQuery, setPatternQuery] = useState('')
  const [finishedQuery, setFinishedQuery] = useState('')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const navigate = useNavigate()

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      if (useCloud && userId) {
        const data = await cloudFetchAll(userId)
        setFabrics(data.fabrics)
        setPatterns(data.patterns)
        setFinishedProducts(data.finishedProducts)
      } else {
        const [nextFabrics, nextPatterns, nextFinished] = await Promise.all([
          db.fabrics.orderBy('createdAt').reverse().toArray(),
          db.patterns.orderBy('createdAt').reverse().toArray(),
          db.finishedProducts.orderBy('createdAt').reverse().toArray(),
        ])
        setFabrics(nextFabrics)
        setPatterns(nextPatterns)
        setFinishedProducts(nextFinished)
      }
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : '加载数据失败')
    } finally {
      setLoading(false)
    }
  }, [useCloud, userId])

  useEffect(() => {
    void reload()
  }, [reload])

  const stats = useMemo(() => {
    const totalCost = fabrics.reduce((sum, item) => sum + (item.price ?? 0), 0)
    const usedMeters = fabrics.reduce((sum, item) => sum + item.usedQuantity, 0)
    const remainingQuantity = fabrics.reduce((sum, item) => sum + calculateRemaining(item), 0)
    return { totalCount: fabrics.length, totalCost, usedMeters, remainingQuantity }
  }, [fabrics])

  const filteredFabrics = useMemo(() => {
    const query = homeQuery.trim().toLowerCase()
    const list = fabrics.filter((fabric) => {
      if (!query) return true
      const fields = [
        fabric.type,
        fabric.source ?? '',
        String(fabric.totalQuantity),
        String(fabric.usedQuantity),
        String(calculateRemaining(fabric)),
      ]
      return fields.some((x) => x.toLowerCase().includes(query))
    })

    return list.sort((a, b) => {
      const diff = calculateRemaining(a) - calculateRemaining(b)
      return sortOrder === 'asc' ? diff : -diff
    })
  }, [fabrics, homeQuery, sortOrder])

  const filteredPatterns = useMemo(() => {
    const query = patternQuery.trim().toLowerCase()
    return patterns.filter((item) => !query || `${item.name} ${item.source ?? ''}`.toLowerCase().includes(query))
  }, [patterns, patternQuery])

  const filteredFinished = useMemo(() => {
    const query = finishedQuery.trim().toLowerCase()
    return finishedProducts.filter((item) => !query || item.name.toLowerCase().includes(query))
  }, [finishedProducts, finishedQuery])

  const saveFabric = async (
    payload: Omit<Fabric, 'id' | 'createdAt' | 'updatedAt' | 'usedQuantity'> & { usedQuantity?: number },
  ) => {
    const now = Date.now()
    try {
      if (useCloud && userId) {
        if (fabricEditing) {
          await cloudUpdateFabric(userId, fabricEditing.id, {
            imageBase64: payload.imageBase64,
            type: payload.type,
            source: payload.source,
            length: payload.length,
            width: payload.width,
            totalQuantity: payload.totalQuantity,
            price: payload.price,
            usedQuantity: payload.usedQuantity ?? fabricEditing.usedQuantity,
          })
        } else {
          await cloudInsertFabric(userId, {
            imageBase64: payload.imageBase64,
            type: payload.type,
            source: payload.source,
            length: payload.length,
            width: payload.width,
            totalQuantity: payload.totalQuantity,
            price: payload.price,
            usedQuantity: 0,
          })
        }
      } else {
        if (fabricEditing) {
          await db.fabrics.update(fabricEditing.id, {
            ...payload,
            updatedAt: now,
            usedQuantity: payload.usedQuantity ?? fabricEditing.usedQuantity,
          })
        } else {
          await db.fabrics.add({
            id: genId(),
            ...payload,
            usedQuantity: 0,
            createdAt: now,
            updatedAt: now,
          })
        }
      }
      setFabricModalOpen(false)
      setFabricEditing(null)
      await reload()
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : '保存失败')
    }
  }

  const openAddItem = (type: EntityType) => {
    setItemType(type)
    setItemEditing(null)
    setItemModalOpen(true)
  }

  const saveFromAddEntity = async (
    payload:
      | {
          entityType: 'fabric'
          data: Omit<Fabric, 'id' | 'createdAt' | 'updatedAt' | 'usedQuantity'>
        }
      | {
          entityType: 'pattern'
          data: { name: string; source?: string; imageBase64: string }
        }
      | {
          entityType: 'finished'
          data: { name: string; imageBase64: string }
        },
  ) => {
    const now = Date.now()
    try {
      if (payload.entityType === 'fabric') {
        if (useCloud && userId) {
          await cloudInsertFabric(userId, {
            ...payload.data,
            usedQuantity: 0,
          })
        } else {
          await db.fabrics.add({
            id: genId(),
            ...payload.data,
            usedQuantity: 0,
            createdAt: now,
            updatedAt: now,
          })
        }
        setAddEntityModalOpen(false)
        await reload()
        navigate('/')
        return
      }
      if (payload.entityType === 'pattern') {
        if (useCloud && userId) {
          await cloudInsertPattern(userId, {
            imageBase64: payload.data.imageBase64,
            name: payload.data.name,
            source: payload.data.source,
          })
        } else {
          await db.patterns.add({ id: genId(), ...payload.data, createdAt: now, updatedAt: now })
        }
        setAddEntityModalOpen(false)
        await reload()
        navigate('/patterns')
        return
      }
      if (useCloud && userId) {
        await cloudInsertFinished(userId, {
          imageBase64: payload.data.imageBase64,
          name: payload.data.name,
        })
      } else {
        await db.finishedProducts.add({ id: genId(), ...payload.data, createdAt: now, updatedAt: now })
      }
      setAddEntityModalOpen(false)
      await reload()
      navigate('/finished')
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : '保存失败')
    }
  }

  const saveItem = async (payload: { name: string; source?: string; imageBase64: string }) => {
    const now = Date.now()
    try {
      if (itemType === 'pattern') {
        if (useCloud && userId) {
          if (itemEditing) {
            await cloudUpdatePattern(userId, itemEditing.id, {
              name: payload.name,
              source: payload.source,
              imageBase64: payload.imageBase64,
            })
          } else {
            await cloudInsertPattern(userId, {
              imageBase64: payload.imageBase64,
              name: payload.name,
              source: payload.source,
            })
          }
        } else {
          if (itemEditing) {
            await db.patterns.update(itemEditing.id, { ...payload, updatedAt: now })
          } else {
            await db.patterns.add({ id: genId(), ...payload, createdAt: now, updatedAt: now })
          }
        }
      } else {
        const finishedPayload = { name: payload.name, imageBase64: payload.imageBase64 }
        if (useCloud && userId) {
          if (itemEditing) {
            await cloudUpdateFinished(userId, itemEditing.id, finishedPayload)
          } else {
            await cloudInsertFinished(userId, finishedPayload)
          }
        } else {
          if (itemEditing) {
            await db.finishedProducts.update(itemEditing.id, { ...finishedPayload, updatedAt: now })
          } else {
            await db.finishedProducts.add({ id: genId(), ...finishedPayload, createdAt: now, updatedAt: now })
          }
        }
      }
      setItemModalOpen(false)
      setItemEditing(null)
      await reload()
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : '保存失败')
    }
  }

  const confirmDelete = async (entityType: EntityType, id: string) => {
    if (!window.confirm('确定删除吗？')) return
    try {
      if (useCloud && userId) {
        if (entityType === 'fabric') await cloudDeleteFabric(userId, id)
        if (entityType === 'pattern') await cloudDeletePattern(userId, id)
        if (entityType === 'finished') await cloudDeleteFinished(userId, id)
      } else {
        if (entityType === 'fabric') await db.fabrics.delete(id)
        if (entityType === 'pattern') await db.patterns.delete(id)
        if (entityType === 'finished') await db.finishedProducts.delete(id)
      }
      await reload()
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : '删除失败')
    }
  }

  const handleUseFabric = async (amount: number) => {
    if (!useFabricTarget) return
    const remaining = calculateRemaining(useFabricTarget)
    if (amount > remaining) return
    const nextUsed = Number((useFabricTarget.usedQuantity + amount).toFixed(1))
    try {
      if (useCloud && userId) {
        await cloudUpdateFabric(userId, useFabricTarget.id, { usedQuantity: nextUsed })
      } else {
        await db.fabrics.update(useFabricTarget.id, {
          usedQuantity: nextUsed,
          updatedAt: Date.now(),
        })
      }
      setUseFabricOpen(false)
      setUseFabricTarget(null)
      await reload()
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : '更新失败')
    }
  }

  const empty = <p className="rounded-card bg-white p-6 text-center text-gray-500">还没有数据，点击下方按钮开始添加。</p>

  return (
    <Layout>
      <Routes>
        <Route
          path="/"
          element={
            <div className="space-y-4">
              <StatsPanel
                totalCount={stats.totalCount}
                totalCost={stats.totalCost}
                usedMeters={stats.usedMeters}
                remainingQuantity={stats.remainingQuantity}
              />
              <div className="flex flex-col gap-2 rounded-card bg-white p-3 shadow sm:flex-row">
                <input
                  className="w-full rounded border p-2"
                  placeholder="搜索：布料类型/名字/米数"
                  value={homeQuery}
                  onChange={(e) => setHomeQuery(e.target.value)}
                />
                <button
                  type="button"
                  className="rounded border px-3 py-2 text-lg"
                  title="按剩余米数排序"
                  onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </button>
              </div>
              {loading ? <p>加载中...</p> : filteredFabrics.length === 0 ? empty : null}
              <div className="space-y-3">
                {filteredFabrics.map((fabric) => (
                  <FabricCard
                    key={fabric.id}
                    fabric={fabric}
                    onUse={() => {
                      setUseFabricTarget(fabric)
                      setUseFabricOpen(true)
                    }}
                    onEdit={() => {
                      setFabricEditing(fabric)
                      setFabricModalOpen(true)
                    }}
                    onDelete={() => void confirmDelete('fabric', fabric.id)}
                  />
                ))}
              </div>
              <div className="fixed bottom-20 right-4">
                <button
                  type="button"
                  className="rounded-full bg-primary px-4 py-3 text-sm font-medium text-white shadow"
                  onClick={() => setAddEntityModalOpen(true)}
                >
                  ➕ 添加
                </button>
              </div>
            </div>
          }
        />
        <Route
          path="/patterns"
          element={
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="m-0 text-xl">✂️ 纸样收藏</h2>
                <button className="rounded bg-primary px-3 py-2 text-white" type="button" onClick={() => openAddItem('pattern')}>
                  ✂️ 添加纸样
                </button>
              </div>
              <div className="mb-3">
                <input
                  className="w-full rounded border bg-white p-2"
                  placeholder="搜索纸样：名称/来源"
                  value={patternQuery}
                  onChange={(e) => setPatternQuery(e.target.value)}
                />
              </div>
              {filteredPatterns.length === 0 ? empty : null}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {filteredPatterns.map((item) => (
                  <GridCard
                    key={item.id}
                    title={item.name}
                    source={item.source}
                    imageBase64={item.imageBase64}
                    onEdit={() => {
                      setItemType('pattern')
                      setItemEditing(item)
                      setItemModalOpen(true)
                    }}
                    onDelete={() => void confirmDelete('pattern', item.id)}
                  />
                ))}
              </div>
            </div>
          }
        />
        <Route
          path="/finished"
          element={
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="m-0 text-xl">🧸 作品集</h2>
                <button className="rounded bg-primary px-3 py-2 text-white" type="button" onClick={() => openAddItem('finished')}>
                  🧸 添加成品
                </button>
              </div>
              <div className="mb-3">
                <input
                  className="w-full rounded border bg-white p-2"
                  placeholder="搜索成品：名称"
                  value={finishedQuery}
                  onChange={(e) => setFinishedQuery(e.target.value)}
                />
              </div>
              {filteredFinished.length === 0 ? empty : null}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {filteredFinished.map((item) => (
                  <GridCard
                    key={item.id}
                    title={item.name}
                    imageBase64={item.imageBase64}
                    onEdit={() => {
                      setItemType('finished')
                      setItemEditing(item)
                      setItemModalOpen(true)
                    }}
                    onDelete={() => void confirmDelete('finished', item.id)}
                  />
                ))}
              </div>
            </div>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <FabricFormModal open={fabricModalOpen} value={fabricEditing} onClose={() => setFabricModalOpen(false)} onSubmit={(payload) => void saveFabric(payload)} />
      <UseFabricModal open={useFabricOpen} fabric={useFabricTarget} onClose={() => setUseFabricOpen(false)} onConfirm={(amount) => void handleUseFabric(amount)} />
      <AddEntityModal open={addEntityModalOpen} onClose={() => setAddEntityModalOpen(false)} onSubmit={(payload) => void saveFromAddEntity(payload)} />
      <ItemFormModal
        open={itemModalOpen}
        entityType={itemType}
        value={itemEditing}
        onClose={() => setItemModalOpen(false)}
        onSubmit={(payload) => void saveItem(payload)}
      />
    </Layout>
  )
}

export default App
