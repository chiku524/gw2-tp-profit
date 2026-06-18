export type ScanPreset = {
  id: string
  label: string
  description: string
  minProfit: number
  minRoi: number
  minVolume: number
  f2pOnly?: boolean
}

export const SCAN_PRESETS: ScanPreset[] = [
  {
    id: 'balanced',
    label: 'Balanced',
    description: 'Solid spreads with reasonable volume',
    minProfit: 50,
    minRoi: 5,
    minVolume: 10,
  },
  {
    id: 'safe',
    label: 'High volume',
    description: 'Liquid items — easier to fill orders',
    minProfit: 15,
    minRoi: 2,
    minVolume: 200,
  },
  {
    id: 'big',
    label: 'Big gold',
    description: 'Large per-unit profit, any volume',
    minProfit: 500,
    minRoi: 2,
    minVolume: 1,
  },
  {
    id: 'roi',
    label: 'High ROI',
    description: 'Maximum return on capital',
    minProfit: 10,
    minRoi: 20,
    minVolume: 5,
  },
  {
    id: 'f2p',
    label: 'F2P safe',
    description: 'Free-to-play tradable items only',
    minProfit: 25,
    minRoi: 4,
    minVolume: 20,
    f2pOnly: true,
  },
]

export type QuickPickGroup = {
  id: string
  label: string
  itemIds: number[]
}

export const QUICK_PICKS: QuickPickGroup[] = [
  {
    id: 'ecto',
    label: 'Ectoplasm & mats',
    itemIds: [19759, 19700, 19722, 19748, 19701, 24277, 24282, 24288],
  },
  {
    id: 'lucent',
    label: 'Jade & Lucent',
    itemIds: [89271, 89140, 89103, 89098, 97513, 97511],
  },
  {
    id: 'sigils',
    label: 'Sigils & runes',
    itemIds: [24615, 24633, 24609, 44950, 44956, 44957],
  },
  {
    id: 'consumables',
    label: 'Food & utilities',
    itemIds: [66530, 66528, 66527, 75005, 86380, 86381],
  },
]
