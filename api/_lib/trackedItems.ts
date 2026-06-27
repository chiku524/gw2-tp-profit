/** High-volume TP staples snapshotted by cron (deduped). */
export const CORE_TRACKED_ITEM_IDS: number[] = [
  // Ectoplasm & common refinements
  19759, 19700, 19722, 19748, 19701, 19725, 19726, 19727, 19728, 19729, 19730, 19731, 19732,
  24277, 24282, 24288, 24291, 24292, 24293, 24294, 24295, 24296, 24297, 24298, 24299,
  // Jade, Lucent, & Janthir mats
  89271, 89140, 89103, 89098, 97513, 97511, 24562, 97504, 97505, 97506,
  // Sigils & runes
  24615, 24633, 24609, 44950, 44956, 44957, 24848, 24849, 24850, 24851, 24852,
  // Food, utilities, & consumables
  66530, 66528, 66527, 75005, 86380, 86381, 86382, 86383,
  // Fractal / raid mats
  49432, 49434, 49428, 49431, 49433,
  // Mystic clover, obsidian, & upgrade components
  68063, 19721, 19790, 19791, 19925,
  // Vials, reagents, & blood
  19775, 19779, 19780, 19781, 19782, 19783, 19784, 19785,
  // Insignias & inscriptions
  46679, 46678, 46677, 46676, 46675,
  // Common crafting outputs
  24347, 24348, 24349, 24350, 24351,
  // T6 common mats
  24243, 24245, 24241, 24242, 24244,
  // Orichalcum / mithril / ancient wood
  24300, 24301, 24302, 24303, 24304,
  // Glob of Dark Matter & related
  24299, 24305,
  // Gem-store style items sometimes flipped
  44602, 44605,
  // Luck, laurels-adjacent consumables
  45175, 45176,
  // Basic runes (popular)
  24687, 24688, 24689, 24690,
  // Potions / oils
  86266, 86267, 86268,
  // Common bags / containers with TP value
  89182, 89183,
]

export const MAX_DYNAMIC_TRACKED = 250
export const MAX_SNAPSHOT_POINTS = 500

export function uniqueTrackedIds(ids: number[]): number[] {
  return [...new Set(ids.filter((id) => Number.isFinite(id) && id > 0))]
}

export function mergeTrackedIds(staticIds: number[], dynamicIds: number[]): number[] {
  return uniqueTrackedIds([...staticIds, ...dynamicIds]).slice(0, CORE_TRACKED_ITEM_IDS.length + MAX_DYNAMIC_TRACKED)
}
