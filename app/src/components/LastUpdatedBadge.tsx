import { formatLastUpdated } from '../lib/format'
import './LastUpdatedBadge.css'

interface Props {
  lastUpdatedAt: string | null
}

export function LastUpdatedBadge({ lastUpdatedAt }: Props) {
  if (lastUpdatedAt === null) return null
  return (
    <span className="last-updated-badge">
      Last updated: {formatLastUpdated(lastUpdatedAt)}
    </span>
  )
}
