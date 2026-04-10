import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { useImageUpload } from '../hooks/useImageUpload'
import type { EntityType, Fabric, FinishedProduct, Pattern } from '../types'
import { calculateProgress, calculateRemaining, calculateStatus, formatMeters, parsePatternDetail } from '../utils'

const FABRIC_TYPE_OPTIONS = ['纯棉', '棉麻', '毛料', '皮料', '真丝', '聚酯纤维', '混合面料', '氨纶', '锦纶']

interface BaseModalProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}

function BaseModal({ open, title, onClose, children }: BaseModalProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="theme-card flex max-h-[90vh] w-full max-w-lg flex-col rounded-card p-4 shadow-lg">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="m-0 text-lg font-semibold">{title}</h3>
          <button type="button" className="theme-btn rounded px-2 py-1 text-sm" onClick={onClose}>
            关闭
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto pr-1">{children}</div>
      </div>
    </div>
  )
}

interface FabricFormModalProps {
  open: boolean
  value?: Fabric | null
  onClose: () => void
  onSubmit: (payload: Omit<Fabric, 'id' | 'createdAt' | 'updatedAt' | 'usedQuantity'> & { usedQuantity?: number }) => void
}

export function FabricFormModal({ open, value, onClose, onSubmit }: FabricFormModalProps) {
  const [type, setType] = useState('')
  const [source, setSource] = useState('')
  const [length, setLength] = useState('')
  const [width, setWidth] = useState('')
  const [totalQuantity, setTotalQuantity] = useState('')
  const [price, setPrice] = useState('')
  const [imageBase64, setImageBase64] = useState('')
  const [typeFocused, setTypeFocused] = useState(false)
  const { upload, loading } = useImageUpload()

  useEffect(() => {
    setType(value?.type ?? '')
    setSource(value?.source ?? '')
    setLength(value?.length !== undefined ? String(value.length) : '')
    setWidth(value?.width !== undefined ? String(value.width) : '')
    setTotalQuantity(value ? String(value.totalQuantity) : '')
    setPrice(value?.price !== undefined ? String(value.price) : '')
    setImageBase64(value?.imageBase64 ?? '')
  }, [value, open])

  const filteredTypeOptions = useMemo(() => {
    const q = type.trim().toLowerCase()
    if (!q) return FABRIC_TYPE_OPTIONS
    return FABRIC_TYPE_OPTIONS.filter((x) => x.toLowerCase().includes(q))
  }, [type])

  const onFormSubmit = (event: FormEvent) => {
    event.preventDefault()
    const qty = Number(totalQuantity)
    const parsedPrice = price === '' ? undefined : Number(price)
    const parsedLength = length === '' ? undefined : Number(length)
    const parsedWidth = width === '' ? undefined : Number(width)
    if (!type.trim()) return alert('请填写布料类型')
    if (!imageBase64) return alert('请上传图片')
    if (!Number.isFinite(qty) || qty <= 0) return alert('布料数量必须大于 0')
    if (parsedPrice !== undefined && (!Number.isFinite(parsedPrice) || parsedPrice < 0)) return alert('价格必须 >= 0')
    if (parsedLength !== undefined && (!Number.isFinite(parsedLength) || parsedLength <= 0)) return alert('长度必须 > 0')
    if (parsedWidth !== undefined && (!Number.isFinite(parsedWidth) || parsedWidth <= 0)) return alert('宽度必须 > 0')

    onSubmit({
      type: type.trim(),
      source: source.trim() || undefined,
      length: parsedLength !== undefined ? Number(parsedLength.toFixed(1)) : undefined,
      width: parsedWidth !== undefined ? Number(parsedWidth.toFixed(1)) : undefined,
      totalQuantity: Number(qty.toFixed(1)),
      price: parsedPrice !== undefined ? Number(parsedPrice.toFixed(2)) : undefined,
      imageBase64,
      usedQuantity: value?.usedQuantity,
    })
  }

  return (
    <BaseModal open={open} title={value ? '编辑布料' : '添加布料'} onClose={onClose}>
      <form className="space-y-3" onSubmit={onFormSubmit}>
        <label className="block text-sm">
          布料类型 *
          <div className="relative mt-1">
            <input
              className="w-full rounded p-2"
              value={type}
              onFocus={() => setTypeFocused(true)}
              onBlur={() => setTimeout(() => setTypeFocused(false), 120)}
              onChange={(e) => setType(e.target.value)}
            />
            {typeFocused && filteredTypeOptions.length > 0 ? (
              <div className="theme-card absolute left-0 right-0 top-[calc(100%+6px)] z-20 max-h-40 overflow-y-auto rounded-card p-1">
                {filteredTypeOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className="block w-full rounded px-2 py-1.5 text-left text-sm text-[#355b4a] hover:bg-[#e8dfcf]"
                    onMouseDown={(e) => {
                      e.preventDefault()
                      setType(option)
                      setTypeFocused(false)
                    }}
                  >
                    {option}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </label>
        <label className="block text-sm">
          布料来源
          <input className="mt-1 w-full rounded p-2" value={source} onChange={(e) => setSource(e.target.value)} />
        </label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            长度(米)
            <input
              className="mt-1 w-full rounded p-2"
              value={length}
              onChange={(e) => setLength(e.target.value)}
              type="number"
              step="0.1"
              min="0.1"
            />
          </label>
          <label className="block text-sm">
            宽度(米)
            <input
              className="mt-1 w-full rounded p-2"
              value={width}
              onChange={(e) => setWidth(e.target.value)}
              type="number"
              step="0.1"
              min="0.1"
            />
          </label>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            数量(米) *
            <input
              className="mt-1 w-full rounded p-2"
              value={totalQuantity}
              onChange={(e) => setTotalQuantity(e.target.value)}
              type="number"
              step="0.1"
              min="0.1"
            />
          </label>
          <label className="block text-sm">
            价格(元)
            <input
              className="mt-1 w-full rounded p-2"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              type="number"
              step="0.01"
              min="0"
            />
          </label>
        </div>
        <div className="space-y-2">
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={async (e) => {
              const file = e.currentTarget.files?.[0]
              if (!file) return
              if (file.size > 2 * 1024 * 1024) return alert('图片最大支持 2MB')
              const output = await upload(file)
              setImageBase64(output)
            }}
          />
          {loading && <p className="m-0 text-sm text-gray-500">图片处理中...</p>}
          {imageBase64 && <img src={imageBase64} alt="preview" className="h-24 w-24 rounded object-cover" />}
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" className="theme-btn rounded px-3 py-2" onClick={onClose}>
            取消
          </button>
          <button type="submit" className="theme-btn theme-btn-primary rounded px-3 py-2">
            保存
          </button>
        </div>
      </form>
    </BaseModal>
  )
}

interface ItemFormModalProps {
  open: boolean
  entityType: EntityType
  value?: Pattern | FinishedProduct | null
  onClose: () => void
  onSubmit: (payload: {
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
  }) => void
}

export function ItemFormModal({ open, entityType, value, onClose, onSubmit }: ItemFormModalProps) {
  const [name, setName] = useState('')
  const [source, setSource] = useState('')
  const [imageBase64, setImageBase64] = useState('')
  const [detailRaw, setDetailRaw] = useState('')
  const { upload, loading } = useImageUpload()
  const isPattern = entityType === 'pattern'
  const title = `${value ? '编辑' : '添加'}${isPattern ? '纸样' : '成品'}`
  const showSource = isPattern
  const parsedDetail = useMemo(() => parsePatternDetail(detailRaw), [detailRaw])

  useEffect(() => {
    setName(value?.name ?? '')
    setSource((value as Pattern | undefined)?.source ?? '')
    setImageBase64(value?.imageBase64 ?? '')
    setDetailRaw((value as Pattern | undefined)?.detailRaw ?? '')
  }, [open, value])

  return (
    <BaseModal open={open} title={title} onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault()
          if (!name.trim()) return alert('请填写名称')
          if (!imageBase64) return alert('请上传图片')
          onSubmit({
            name: name.trim(),
            source: showSource ? source.trim() || undefined : undefined,
            imageBase64,
            detailRaw: showSource ? detailRaw.trim() || undefined : undefined,
            sizeCode: showSource ? parsedDetail.sizeCode : undefined,
            bust: showSource ? parsedDetail.bust : undefined,
            waist: showSource ? parsedDetail.waist : undefined,
            hip: showSource ? parsedDetail.hip : undefined,
            lengthInfo: showSource ? parsedDetail.lengthInfo : undefined,
            suitableFabric: showSource ? parsedDetail.suitableFabric : undefined,
          })
        }}
      >
        <label className="block text-sm">
          名称 *
          <input className="mt-1 w-full rounded p-2" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        {showSource && (
          <label className="block text-sm">
            来源
            <input className="mt-1 w-full rounded p-2" value={source} onChange={(e) => setSource(e.target.value)} />
          </label>
        )}
        {showSource && (
          <label className="block text-sm">
            纸样详情
            <textarea
              className="mt-1 w-full rounded p-2"
              rows={5}
              placeholder="支持粘贴后自动识别：纸样码数：...&#10;胸围：...&#10;腰围：...&#10;臀围：...&#10;长度：...&#10;纸样适合布料：..."
              value={detailRaw}
              onChange={(e) => setDetailRaw(e.target.value)}
            />
          </label>
        )}
        {showSource && detailRaw.trim() ? (
          <div className="theme-card rounded-card p-3 text-sm text-[#355b4a]">
            <p className="m-0 mb-1 font-medium">自动识别结果</p>
            <p className="m-0">纸样码数：{parsedDetail.sizeCode ?? '-'}</p>
            <p className="m-0">胸围：{parsedDetail.bust ?? '-'}</p>
            <p className="m-0">腰围：{parsedDetail.waist ?? '-'}</p>
            <p className="m-0">臀围：{parsedDetail.hip ?? '-'}</p>
            <p className="m-0">长度：{parsedDetail.lengthInfo ?? '-'}</p>
            <p className="m-0">纸样适合布料：{parsedDetail.suitableFabric ?? '-'}</p>
          </div>
        ) : null}
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={async (e) => {
            const file = e.currentTarget.files?.[0]
            if (!file) return
            if (file.size > 2 * 1024 * 1024) return alert('图片最大支持 2MB')
            const output = await upload(file)
            setImageBase64(output)
          }}
        />
        {loading && <p className="m-0 text-sm text-gray-500">图片处理中...</p>}
        {imageBase64 && <img src={imageBase64} alt="preview" className="h-24 w-24 rounded object-cover" />}
        <div className="flex justify-end gap-2">
          <button type="button" className="theme-btn rounded px-3 py-2" onClick={onClose}>
            取消
          </button>
          <button type="submit" className="theme-btn theme-btn-primary rounded px-3 py-2">
            保存
          </button>
        </div>
      </form>
    </BaseModal>
  )
}

interface AddEntityModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (
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
  ) => void
}

export function AddEntityModal({ open, onClose, onSubmit }: AddEntityModalProps) {
  const [entityType, setEntityType] = useState<EntityType>('fabric')
  const [name, setName] = useState('')
  const [source, setSource] = useState('')
  const [detailRaw, setDetailRaw] = useState('')
  const [fabricType, setFabricType] = useState('')
  const [length, setLength] = useState('')
  const [width, setWidth] = useState('')
  const [totalQuantity, setTotalQuantity] = useState('')
  const [price, setPrice] = useState('')
  const [imageBase64, setImageBase64] = useState('')
  const [fabricTypeFocused, setFabricTypeFocused] = useState(false)
  const { upload, loading } = useImageUpload()

  useEffect(() => {
    if (!open) return
    setEntityType('fabric')
    setName('')
    setSource('')
    setDetailRaw('')
    setFabricType('')
    setLength('')
    setWidth('')
    setTotalQuantity('')
    setPrice('')
    setImageBase64('')
  }, [open])

  const isFabric = entityType === 'fabric'
  const isPattern = entityType === 'pattern'
  const parsedDetail = useMemo(() => parsePatternDetail(detailRaw), [detailRaw])
  const filteredFabricTypeOptions = useMemo(() => {
    const q = fabricType.trim().toLowerCase()
    if (!q) return FABRIC_TYPE_OPTIONS
    return FABRIC_TYPE_OPTIONS.filter((x) => x.toLowerCase().includes(q))
  }, [fabricType])

  return (
    <BaseModal open={open} title="添加条目" onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault()
          if (!imageBase64) return alert('请上传图片')

          if (entityType === 'fabric') {
            const qty = Number(totalQuantity)
            const parsedPrice = price === '' ? undefined : Number(price)
            const parsedLength = length === '' ? undefined : Number(length)
            const parsedWidth = width === '' ? undefined : Number(width)
            if (!fabricType.trim()) return alert('请填写布料类型')
            if (!Number.isFinite(qty) || qty <= 0) return alert('布料数量必须大于 0')
            if (parsedPrice !== undefined && (!Number.isFinite(parsedPrice) || parsedPrice < 0)) return alert('价格必须 >= 0')
            if (parsedLength !== undefined && (!Number.isFinite(parsedLength) || parsedLength <= 0)) return alert('长度必须 > 0')
            if (parsedWidth !== undefined && (!Number.isFinite(parsedWidth) || parsedWidth <= 0)) return alert('宽度必须 > 0')
            onSubmit({
              entityType: 'fabric',
              data: {
                type: fabricType.trim(),
                source: source.trim() || undefined,
                length: parsedLength !== undefined ? Number(parsedLength.toFixed(1)) : undefined,
                width: parsedWidth !== undefined ? Number(parsedWidth.toFixed(1)) : undefined,
                totalQuantity: Number(qty.toFixed(1)),
                price: parsedPrice !== undefined ? Number(parsedPrice.toFixed(2)) : undefined,
                imageBase64,
              },
            })
            return
          }

          if (!name.trim()) return alert('请填写名称')
          if (entityType === 'pattern') {
            onSubmit({
              entityType: 'pattern',
              data: {
                name: name.trim(),
                source: source.trim() || undefined,
                imageBase64,
                detailRaw: detailRaw.trim() || undefined,
                sizeCode: parsedDetail.sizeCode,
                bust: parsedDetail.bust,
                waist: parsedDetail.waist,
                hip: parsedDetail.hip,
                lengthInfo: parsedDetail.lengthInfo,
                suitableFabric: parsedDetail.suitableFabric,
              },
            })
            return
          }

          onSubmit({
            entityType: 'finished',
            data: { name: name.trim(), imageBase64 },
          })
        }}
      >
        <label className="block text-sm">
          添加类型 *
          <select
            className="mt-1 w-full rounded p-2"
            value={entityType}
            onChange={(e) => setEntityType(e.target.value as EntityType)}
          >
            <option value="fabric">布料</option>
            <option value="pattern">纸样</option>
            <option value="finished">成品</option>
          </select>
        </label>

        {isFabric ? (
          <>
            <label className="block text-sm">
              布料类型 *
              <div className="relative mt-1">
                <input
                  className="w-full rounded p-2"
                  value={fabricType}
                  onFocus={() => setFabricTypeFocused(true)}
                  onBlur={() => setTimeout(() => setFabricTypeFocused(false), 120)}
                  onChange={(e) => setFabricType(e.target.value)}
                />
                {fabricTypeFocused && filteredFabricTypeOptions.length > 0 ? (
                  <div className="theme-card absolute left-0 right-0 top-[calc(100%+6px)] z-20 max-h-40 overflow-y-auto rounded-card p-1">
                    {filteredFabricTypeOptions.map((option) => (
                      <button
                        key={option}
                        type="button"
                        className="block w-full rounded px-2 py-1.5 text-left text-sm text-[#355b4a] hover:bg-[#e8dfcf]"
                        onMouseDown={(e) => {
                          e.preventDefault()
                          setFabricType(option)
                          setFabricTypeFocused(false)
                        }}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </label>
            <label className="block text-sm">
              布料来源
              <input className="mt-1 w-full rounded p-2" value={source} onChange={(e) => setSource(e.target.value)} />
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                长度(米)
                <input
                  className="mt-1 w-full rounded p-2"
                  value={length}
                  onChange={(e) => setLength(e.target.value)}
                  type="number"
                  step="0.1"
                  min="0.1"
                />
              </label>
              <label className="block text-sm">
                宽度(米)
                <input
                  className="mt-1 w-full rounded p-2"
                  value={width}
                  onChange={(e) => setWidth(e.target.value)}
                  type="number"
                  step="0.1"
                  min="0.1"
                />
              </label>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                数量(米) *
                <input
                  className="mt-1 w-full rounded p-2"
                  value={totalQuantity}
                  onChange={(e) => setTotalQuantity(e.target.value)}
                  type="number"
                  step="0.1"
                  min="0.1"
                />
              </label>
              <label className="block text-sm">
                价格(元)
                <input
                  className="mt-1 w-full rounded p-2"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  type="number"
                  step="0.01"
                  min="0"
                />
              </label>
            </div>
          </>
        ) : (
          <>
            <label className="block text-sm">
              {isPattern ? '纸样名称 *' : '成品名称 *'}
              <input className="mt-1 w-full rounded p-2" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            {isPattern && (
              <>
                <label className="block text-sm">
                  纸样来源
                  <input className="mt-1 w-full rounded p-2" value={source} onChange={(e) => setSource(e.target.value)} />
                </label>
                <label className="block text-sm">
                  纸样详情
                  <textarea
                    className="mt-1 w-full rounded p-2"
                    rows={5}
                    placeholder="支持粘贴后自动识别：纸样码数：...&#10;胸围：...&#10;腰围：...&#10;臀围：...&#10;长度：...&#10;纸样适合布料：..."
                    value={detailRaw}
                    onChange={(e) => setDetailRaw(e.target.value)}
                  />
                </label>
                {detailRaw.trim() ? (
                  <div className="theme-card rounded-card p-3 text-sm text-[#355b4a]">
                    <p className="m-0 mb-1 font-medium">自动识别结果</p>
                    <p className="m-0">纸样码数：{parsedDetail.sizeCode ?? '-'}</p>
                    <p className="m-0">胸围：{parsedDetail.bust ?? '-'}</p>
                    <p className="m-0">腰围：{parsedDetail.waist ?? '-'}</p>
                    <p className="m-0">臀围：{parsedDetail.hip ?? '-'}</p>
                    <p className="m-0">长度：{parsedDetail.lengthInfo ?? '-'}</p>
                    <p className="m-0">纸样适合布料：{parsedDetail.suitableFabric ?? '-'}</p>
                  </div>
                ) : null}
              </>
            )}
          </>
        )}

        <div className="space-y-2">
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={async (e) => {
              const file = e.currentTarget.files?.[0]
              if (!file) return
              if (file.size > 2 * 1024 * 1024) return alert('图片最大支持 2MB')
              const output = await upload(file)
              setImageBase64(output)
            }}
          />
          {loading && <p className="m-0 text-sm text-gray-500">图片处理中...</p>}
          {imageBase64 && <img src={imageBase64} alt="preview" className="h-24 w-24 rounded object-cover" />}
        </div>

        <div className="flex justify-end gap-2">
          <button type="button" className="theme-btn rounded px-3 py-2" onClick={onClose}>
            取消
          </button>
          <button type="submit" className="theme-btn theme-btn-primary rounded px-3 py-2">
            保存
          </button>
        </div>
      </form>
    </BaseModal>
  )
}

interface UseFabricModalProps {
  open: boolean
  fabric: Fabric | null
  onClose: () => void
  onConfirm: (amount: number) => void
}

export function UseFabricModal({ open, fabric, onClose, onConfirm }: UseFabricModalProps) {
  const [amount, setAmount] = useState('')
  const remaining = useMemo(() => (fabric ? calculateRemaining(fabric) : 0), [fabric])

  useEffect(() => {
    setAmount('')
  }, [open, fabric])

  return (
    <BaseModal open={open} title="使用布料" onClose={onClose}>
      {!fabric ? null : (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            const value = Number(amount)
            if (!Number.isFinite(value) || value <= 0) return alert('请输入大于 0 的数量')
            if (value > remaining) return alert('不能超过剩余量')
            onConfirm(Number(value.toFixed(1)))
          }}
        >
          <p className="m-0 text-sm text-gray-600">
            当前剩余：<strong>{formatMeters(remaining)}</strong>
          </p>
          <input
            className="w-full rounded p-2"
            type="number"
            step="0.1"
            min="0.1"
            max={remaining}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="输入本次使用数量"
          />
          <div className="flex justify-end gap-2">
            <button type="button" className="theme-btn rounded px-3 py-2" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="theme-btn theme-btn-primary rounded px-3 py-2">
              确认使用
            </button>
          </div>
        </form>
      )}
    </BaseModal>
  )
}

interface FabricCardProps {
  fabric: Fabric
  onEdit: () => void
  onDelete: () => void
  onUse: () => void
}

export function FabricCard({ fabric, onEdit, onDelete, onUse }: FabricCardProps) {
  const remaining = calculateRemaining(fabric)
  const progress = calculateProgress(fabric)
  const status = calculateStatus(fabric)
  const statusClass =
    status === '未使用'
      ? 'bg-gray-100 text-gray-500'
      : status === '使用中'
        ? 'bg-blue-100 text-blue-700'
        : 'bg-red-100 text-red-700'

  return (
    <article className="theme-card rounded-card p-3 shadow">
      <div className="flex gap-3">
        <img src={fabric.imageBase64} alt={fabric.type} className="h-20 w-20 rounded object-cover" />
        <div className="min-w-0 flex-1">
          <h3 className="m-0 truncate text-base font-semibold">{fabric.type}</h3>
          <p className="m-0 text-sm text-gray-500">{fabric.source || '未填写来源'}</p>
          <p className="m-0 text-sm text-gray-500">
            规格：{fabric.length ?? '-'}米 x {fabric.width ?? '-'}米
          </p>
          <p className="m-0 mt-1 text-sm">
            剩余：{formatMeters(remaining)} / {formatMeters(fabric.totalQuantity)}
          </p>
          <span className={`mt-1 inline-block rounded-full px-2 py-1 text-xs ${statusClass}`}>{status}</span>
        </div>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-200">
        <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
      </div>
      <div className="mt-3 flex gap-2">
        <button type="button" className="theme-btn rounded px-3 py-1.5 text-sm" onClick={onUse}>
          使用
        </button>
        <button type="button" className="theme-btn rounded px-3 py-1.5 text-sm" onClick={onEdit}>
          编辑
        </button>
        <button type="button" className="theme-btn theme-btn-danger rounded px-3 py-1.5 text-sm" onClick={onDelete}>
          删除
        </button>
      </div>
    </article>
  )
}

interface GridCardProps {
  title: string
  source?: string
  imageBase64: string
  onView?: () => void
  onEdit: () => void
  onDelete: () => void
}

export function GridCard({ title, source, imageBase64, onView, onEdit, onDelete }: GridCardProps) {
  return (
    <article className="theme-card rounded-card p-3 shadow">
      <img src={imageBase64} alt={title} className="h-40 w-full rounded object-cover" />
      <h3 className="m-0 mt-2 truncate text-base font-semibold">{title}</h3>
      {source ? <p className="m-0 text-sm text-gray-500">{source}</p> : null}
      <div className="mt-2 flex gap-2">
        {onView ? (
          <button type="button" className="theme-btn rounded px-3 py-1.5 text-sm" onClick={onView}>
            查看更多
          </button>
        ) : null}
        <button type="button" className="theme-btn rounded px-3 py-1.5 text-sm" onClick={onEdit}>
          编辑
        </button>
        <button type="button" className="theme-btn theme-btn-danger rounded px-3 py-1.5 text-sm" onClick={onDelete}>
          删除
        </button>
      </div>
    </article>
  )
}
