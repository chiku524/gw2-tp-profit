import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { pushRecentItem } from '../lib/marketStorage'
import type { Gw2Item } from '../types'

type ItemDetailContextValue = {
  item: Gw2Item | null
  openItem: (item: Gw2Item | { id: number; name?: string; icon?: string }) => void
  openItemId: (itemId: number) => void
  closeItem: () => void
}

const ItemDetailContext = createContext<ItemDetailContextValue | null>(null)

export function ItemDetailProvider({ children }: { children: ReactNode }) {
  const [item, setItem] = useState<Gw2Item | null>(null)

  const openItem = useCallback((next: Gw2Item | { id: number; name?: string; icon?: string }) => {
    const normalized: Gw2Item = {
      id: next.id,
      name: next.name ?? `Item ${next.id}`,
      icon: next.icon,
    }
    pushRecentItem(normalized.id)
    setItem(normalized)
  }, [])

  const openItemId = useCallback((itemId: number) => {
    pushRecentItem(itemId)
    setItem({ id: itemId, name: `Item ${itemId}` })
  }, [])

  const closeItem = useCallback(() => setItem(null), [])

  const value = useMemo(
    () => ({ item, openItem, openItemId, closeItem }),
    [item, openItem, openItemId, closeItem],
  )

  return <ItemDetailContext.Provider value={value}>{children}</ItemDetailContext.Provider>
}

export function useItemDetail() {
  const context = useContext(ItemDetailContext)
  if (!context) throw new Error('useItemDetail must be used within ItemDetailProvider')
  return context
}
