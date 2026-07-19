import { formatLastUpdated } from '../lib/format'
import './LastUpdatedBadge.css'

interface Props {
  lastUpdatedAt: string | null
  lastCheckedAt?: string | null
}

export function LastUpdatedBadge({ lastUpdatedAt, lastCheckedAt = null }: Props) {
  if (lastCheckedAt === null && lastUpdatedAt === null) return null

  if (lastCheckedAt !== null) {
    return (
      <span className="last-updated-badge">
        <span>Last checked: {formatLastUpdated(lastCheckedAt)}</span>
        {lastUpdatedAt !== null && (
          <span>Prices last changed: {formatLastUpdated(lastUpdatedAt)}</span>
        )}
      </span>
    )
  }

  return (
    <span className="last-updated-badge">
      Last updated: {formatLastUpdated(lastUpdatedAt!)}
    </span>
  )
}
