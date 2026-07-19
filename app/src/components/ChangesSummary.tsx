import { Fragment } from 'react'
import type { TableRow, ChangeDirection } from '../types'
import './ChangesSummary.css'

const DIRECTION_ORDER: ChangeDirection[] = ['drop', 'increase', 'new', 'removed']

function label(dir: ChangeDirection, n: number): string {
  switch (dir) {
    case 'drop': return `${n} ${n === 1 ? 'drop' : 'drops'}`
    case 'increase': return `${n} ${n === 1 ? 'increase' : 'increases'}`
    case 'new': return `${n} new ${n === 1 ? 'SKU' : 'SKUs'}`
    case 'removed': return `${n} removed`
  }
}

interface Props {
  rows: TableRow[]
  loading?: boolean
}

export function ChangesSummary({ rows, loading = false }: Props) {
  if (loading) {
    return (
      <div className="csm csm--loading" aria-hidden="true">
        <span className="csm__skeleton" />
        <span className="csm__skeleton" />
        <span className="csm__skeleton" />
      </div>
    )
  }

  if (rows.length === 0) return null

  const counts: Record<ChangeDirection, number> = { drop: 0, increase: 0, new: 0, removed: 0 }
  for (const row of rows) {
    counts[row.direction]++
  }

  const active = DIRECTION_ORDER.filter((d) => counts[d] > 0)
  if (active.length === 0) return null

  return (
    <div className="csm" role="status">
      {active.map((dir, i) => (
        <Fragment key={dir}>
          {i > 0 && <span className="csm__sep" aria-hidden="true">·</span>}
          <span className={`csm__item csm__item--${dir}`}>{label(dir, counts[dir])}</span>
        </Fragment>
      ))}
    </div>
  )
}
