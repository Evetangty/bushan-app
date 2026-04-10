import { formatMeters, formatPrice } from '../utils'

interface StatsPanelProps {
  totalCount: number
  totalCost: number
  usedMeters: number
  remainingQuantity: number
}

export function StatsPanel(props: StatsPanelProps) {
  const items = [
    { label: '我的布料总计份数', value: `${props.totalCount} 份` },
    { label: '总花费', value: formatPrice(props.totalCost) },
    { label: '消耗米数', value: formatMeters(props.usedMeters) },
    { label: '布料剩余量', value: formatMeters(props.remainingQuantity) },
  ]

  return (
    <section className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-card border bg-white p-3 text-left shadow">
          <p className="m-0 text-sm text-gray-500">{item.label}</p>
          <p className="m-0 mt-2 text-lg font-semibold">{item.value}</p>
        </div>
      ))}
    </section>
  )
}
