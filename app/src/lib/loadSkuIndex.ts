import type { SkuIndex } from './skuIndex'

export async function loadSkuIndex(): Promise<SkuIndex> {
  const url = `${import.meta.env.BASE_URL}sku-index.json`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to load SKU index (${res.status})`)
  return res.json() as Promise<SkuIndex>
}
