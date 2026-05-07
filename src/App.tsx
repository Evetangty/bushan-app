import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import {
  sqliteDeleteFabric,
  sqliteDeleteFinished,
  sqliteDeletePattern,
  sqliteFetchAll,
  sqliteInsertFabric,
  sqliteInsertFinished,
  sqliteInsertPattern,
  sqliteUpdateFabric,
  sqliteUpdateFinished,
  sqliteUpdatePattern,
} from './localSqlite'
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
        <div className="flex min-h-screen items-center justify-center bg-background p-4 text-[#355b4a]">
          加载中…
        </div>
      )
    }
    if (!session) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
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
  const [homeFocused, setHomeFocused] = useState(false)
  const [patternFocused, setPatternFocused] = useState(false)
  const [finishedFocused, setFinishedFocused] = useState(false)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const addEntitySubmittingRef = useRef(false)

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
        const { fabrics: nextFabrics, patterns: nextPatterns, finishedProducts: nextFinished } = await sqliteFetchAll()
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

  const homeSuggestions = useMemo(() => {
    const set = new Set<string>()
    fabrics.forEach((fabric) => {
      if (fabric.type) set.add(fabric.type)
      if (fabric.source) set.add(fabric.source)
    })
    return Array.from(set)
  }, [fabrics])

  const patternSuggestions = useMemo(() => {
    const set = new Set<string>()
    patterns.forEach((item) => {
      if (item.name) set.add(item.name)
      if (item.source) set.add(item.source)
    })
    return Array.from(set)
  }, [patterns])

  const finishedSuggestions = useMemo(() => {
    const set = new Set<string>()
    finishedProducts.forEach((item) => {
      if (item.name) set.add(item.name)
    })
    return Array.from(set)
  }, [finishedProducts])

  const homeSuggestionList = useMemo(() => {
    const q = homeQuery.trim().toLowerCase()
    if (!q) return []
    return homeSuggestions.filter((x) => x.toLowerCase().includes(q)).slice(0, 6)
  }, [homeQuery, homeSuggestions])

  const patternSuggestionList = useMemo(() => {
    const q = patternQuery.trim().toLowerCase()
    if (!q) return []
    return patternSuggestions.filter((x) => x.toLowerCase().includes(q)).slice(0, 6)
  }, [patternQuery, patternSuggestions])

  const finishedSuggestionList = useMemo(() => {
    const q = finishedQuery.trim().toLowerCase()
    if (!q) return []
    return finishedSuggestions.filter((x) => x.toLowerCase().includes(q)).slice(0, 6)
  }, [finishedQuery, finishedSuggestions])

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
          await sqliteUpdateFabric(fabricEditing.id, {
            ...payload,
            updatedAt: now,
            usedQuantity: payload.usedQuantity ?? fabricEditing.usedQuantity,
          })
        } else {
          await sqliteInsertFabric({
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
          data: {
            name: string
            source?: string
            imageBase64: string
            detailRaw?: string
            sizeCode?: string
            bust?: string
            waist?: string
            hip?: string
            lengthInfo?: string
            suitableFabric?: string
          }
        }
      | {
          entityType: 'finished'
          data: { name: string; imageBase64: string }
        },
  ) => {
    if (addEntitySubmittingRef.current) return
    addEntitySubmittingRef.current = true
    const now = Date.now()
    try {
      if (payload.entityType === 'fabric') {
        if (useCloud && userId) {
          await cloudInsertFabric(userId, {
            ...payload.data,
            usedQuantity: 0,
          })
        } else {
          await sqliteInsertFabric({
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
            detailRaw: payload.data.detailRaw,
            sizeCode: payload.data.sizeCode,
            bust: payload.data.bust,
            waist: payload.data.waist,
            hip: payload.data.hip,
            lengthInfo: payload.data.lengthInfo,
            suitableFabric: payload.data.suitableFabric,
          })
        } else {
          await sqliteInsertPattern({ id: genId(), ...payload.data, createdAt: now, updatedAt: now })
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
        await sqliteInsertFinished({ id: genId(), ...payload.data, createdAt: now, updatedAt: now })
      }
      setAddEntityModalOpen(false)
      await reload()
      navigate('/finished')
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : '保存失败')
    } finally {
      addEntitySubmittingRef.current = false
    }
  }

  const saveItem = async (payload: {
    name: string
    source?: string
    imageBase64: string
    detailRaw?: string
    sizeCode?: string
    bust?: string
    waist?: string
    hip?: string
    lengthInfo?: string
    suitableFabric?: string
  }) => {
    const now = Date.now()
    try {
      if (itemType === 'pattern') {
        if (useCloud && userId) {
          if (itemEditing) {
            await cloudUpdatePattern(userId, itemEditing.id, {
              name: payload.name,
              source: payload.source,
              imageBase64: payload.imageBase64,
              detailRaw: payload.detailRaw,
              sizeCode: payload.sizeCode,
              bust: payload.bust,
              waist: payload.waist,
              hip: payload.hip,
              lengthInfo: payload.lengthInfo,
              suitableFabric: payload.suitableFabric,
            })
          } else {
            await cloudInsertPattern(userId, {
              imageBase64: payload.imageBase64,
              name: payload.name,
              source: payload.source,
              detailRaw: payload.detailRaw,
              sizeCode: payload.sizeCode,
              bust: payload.bust,
              waist: payload.waist,
              hip: payload.hip,
              lengthInfo: payload.lengthInfo,
              suitableFabric: payload.suitableFabric,
            })
          }
        } else {
          if (itemEditing) {
            await sqliteUpdatePattern(itemEditing.id, { ...payload, updatedAt: now })
          } else {
            await sqliteInsertPattern({ id: genId(), ...payload, createdAt: now, updatedAt: now })
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
            await sqliteUpdateFinished(itemEditing.id, { ...finishedPayload, updatedAt: now })
          } else {
            await sqliteInsertFinished({ id: genId(), ...finishedPayload, createdAt: now, updatedAt: now })
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
        if (entityType === 'fabric') await sqliteDeleteFabric(id)
        if (entityType === 'pattern') await sqliteDeletePattern(id)
        if (entityType === 'finished') await sqliteDeleteFinished(id)
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
        await sqliteUpdateFabric(useFabricTarget.id, {
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

  const empty = <p className="theme-card rounded-card p-6 text-center text-[#4c665a]">这里还是空空的~</p>
  const noSearchResult = <p className="theme-card rounded-card p-6 text-center text-[#4c665a]">没有搜索结果哦~</p>

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
              <div className="theme-card flex items-center gap-2 rounded-card p-3">
                <div className="relative w-0 flex-1">
                  <input
                    className="w-full rounded p-2"
                    placeholder="搜索：布料类型/名字/米数"
                    value={homeQuery}
                    onFocus={() => setHomeFocused(true)}
                    onBlur={() => setTimeout(() => setHomeFocused(false), 120)}
                    onChange={(e) => setHomeQuery(e.target.value)}
                  />
                  {homeFocused && homeSuggestionList.length > 0 ? (
                    <div className="theme-card absolute left-0 right-0 top-[calc(100%+6px)] z-20 rounded-card p-1">
                      {homeSuggestionList.map((item) => (
                        <button
                          key={item}
                          type="button"
                          className="block w-full rounded px-2 py-1.5 text-left text-sm text-[#355b4a] hover:bg-[#e8dfcf]"
                          onMouseDown={(e) => {
                            e.preventDefault()
                            setHomeQuery(item)
                            setHomeFocused(false)
                          }}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="theme-btn h-[42px] w-[52px] shrink-0 rounded px-0 py-0 text-lg"
                  title="按剩余米数排序"
                  onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </button>
              </div>
              {loading ? <p>加载中...</p> : null}
              {!loading && filteredFabrics.length === 0 && (homeQuery.trim() ? noSearchResult : empty)}
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
                  className="theme-btn theme-btn-primary rounded-full px-4 py-3 text-sm font-medium"
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
                <h2 className="section-title m-0 text-2xl">纸样收藏</h2>
                <button className="theme-btn theme-btn-primary rounded px-3 py-2" type="button" onClick={() => openAddItem('pattern')}>
                  添加纸样
                </button>
              </div>
              <div className="mb-3">
                <div className="theme-card rounded-card p-3 text-left shadow">
                  <p className="m-0 text-sm text-[#4c665a]">纸样总数</p>
                  <p className="m-0 mt-2 text-lg font-semibold">{patterns.length} 份</p>
                </div>
              </div>
              <div className="mb-3">
                <div className="relative">
                  <input
                    className="w-full rounded p-2"
                    placeholder="搜索纸样：名称/来源"
                    value={patternQuery}
                    onFocus={() => setPatternFocused(true)}
                    onBlur={() => setTimeout(() => setPatternFocused(false), 120)}
                    onChange={(e) => setPatternQuery(e.target.value)}
                  />
                  {patternFocused && patternSuggestionList.length > 0 ? (
                    <div className="theme-card absolute left-0 right-0 top-[calc(100%+6px)] z-20 rounded-card p-1">
                      {patternSuggestionList.map((item) => (
                        <button
                          key={item}
                          type="button"
                          className="block w-full rounded px-2 py-1.5 text-left text-sm text-[#355b4a] hover:bg-[#e8dfcf]"
                          onMouseDown={(e) => {
                            e.preventDefault()
                            setPatternQuery(item)
                            setPatternFocused(false)
                          }}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
              {patternQuery.trim() && filteredPatterns.length === 0 ? noSearchResult : null}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {filteredPatterns.map((item) => (
                  <GridCard
                    key={item.id}
                    title={item.name}
                    source={item.source}
                    imageBase64={item.imageBase64}
                    onView={() => navigate(`/patterns/${item.id}`)}
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
          path="/patterns/:id"
          element={<PatternDetailPage patterns={patterns} />}
        />
        <Route
          path="/finished"
          element={
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="section-title m-0 text-2xl">作品集</h2>
                <button className="theme-btn theme-btn-primary rounded px-3 py-2" type="button" onClick={() => openAddItem('finished')}>
                  添加成品
                </button>
              </div>
              <div className="mb-3">
                <div className="theme-card rounded-card p-3 text-left shadow">
                  <p className="m-0 text-sm text-[#4c665a]">成品总数</p>
                  <p className="m-0 mt-2 text-lg font-semibold">{finishedProducts.length} 份</p>
                </div>
              </div>
              <div className="mb-3">
                <div className="relative">
                  <input
                    className="w-full rounded p-2"
                    placeholder="搜索成品：名称"
                    value={finishedQuery}
                    onFocus={() => setFinishedFocused(true)}
                    onBlur={() => setTimeout(() => setFinishedFocused(false), 120)}
                    onChange={(e) => setFinishedQuery(e.target.value)}
                  />
                  {finishedFocused && finishedSuggestionList.length > 0 ? (
                    <div className="theme-card absolute left-0 right-0 top-[calc(100%+6px)] z-20 rounded-card p-1">
                      {finishedSuggestionList.map((item) => (
                        <button
                          key={item}
                          type="button"
                          className="block w-full rounded px-2 py-1.5 text-left text-sm text-[#355b4a] hover:bg-[#e8dfcf]"
                          onMouseDown={(e) => {
                            e.preventDefault()
                            setFinishedQuery(item)
                            setFinishedFocused(false)
                          }}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
              {finishedQuery.trim() && filteredFinished.length === 0 ? noSearchResult : null}
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

function PatternDetailPage({ patterns }: { patterns: Pattern[] }) {
  const { id } = useParams()
  const pattern = patterns.find((item) => item.id === id)

  if (!pattern) {
    return (
      <div className="theme-card rounded-card p-4 text-[#355b4a]">
        未找到该纸样详情。
      </div>
    )
  }

  return (
    <div className="theme-card rounded-card p-4 text-[#355b4a]">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="section-title m-0 text-2xl">{pattern.name}</h2>
        <Link to="/patterns" className="theme-btn rounded px-3 py-1.5 text-sm">
          返回纸样
        </Link>
      </div>
      <img src={pattern.imageBase64} alt={pattern.name} className="mb-3 h-56 w-full rounded object-cover" />
      <div className="space-y-1 text-sm">
        <p className="m-0">纸样码数：{pattern.sizeCode ?? '-'}</p>
        <p className="m-0">胸围：{pattern.bust ?? '-'}</p>
        <p className="m-0">腰围：{pattern.waist ?? '-'}</p>
        <p className="m-0">臀围：{pattern.hip ?? '-'}</p>
        <p className="m-0">长度：{pattern.lengthInfo ?? '-'}</p>
        <p className="m-0">纸样适合布料：{pattern.suitableFabric ?? '-'}</p>
      </div>
      {pattern.detailRaw ? (
        <div className="mt-3 rounded border border-[#9eb2a6] bg-[#efe5d4] p-3 text-sm whitespace-pre-wrap">
          {pattern.detailRaw}
        </div>
      ) : null}
    </div>
  )
}

export default App
