import type { WealthGoal } from '../types'

const STORAGE_KEY = 'gw2-tp-wealth-goals'
const PROGRESS_KEY = 'gw2-tp-wealth-progress'

export type WealthProgressPoint = { t: number; liquid: number; total: number | null }

export function loadWealthGoals(): WealthGoal[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as WealthGoal[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveWealthGoals(goals: WealthGoal[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(goals))
}

export function addWealthGoal(goal: Omit<WealthGoal, 'id'>): WealthGoal[] {
  const goals = loadWealthGoals()
  const entry: WealthGoal = { ...goal, id: crypto.randomUUID() }
  goals.push(entry)
  saveWealthGoals(goals)
  return goals
}

export function removeWealthGoal(id: string): WealthGoal[] {
  const goals = loadWealthGoals().filter((row) => row.id !== id)
  saveWealthGoals(goals)
  return goals
}

export function recordWealthProgress(liquid: number, total: number | null): void {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY)
    const history: WealthProgressPoint[] = raw ? (JSON.parse(raw) as WealthProgressPoint[]) : []
    const point: WealthProgressPoint = { t: Date.now(), liquid, total }
    const last = history[history.length - 1]
    if (last && last.liquid === liquid && last.total === total && Date.now() - last.t < 3600_000) return
    localStorage.setItem(PROGRESS_KEY, JSON.stringify([...history, point].slice(-120)))
  } catch {
    // ignore
  }
}

export function loadWealthProgress(): WealthProgressPoint[] {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY)
    if (!raw) return []
    return JSON.parse(raw) as WealthProgressPoint[]
  } catch {
    return []
  }
}

export function goalProgress(
  goal: WealthGoal,
  liquid: number,
  total: number | null,
  wallet: number,
): { current: number; percent: number } {
  const current =
    goal.metric === 'wallet' ? wallet : goal.metric === 'total' ? (total ?? liquid) : liquid
  const percent = goal.targetCopper > 0 ? Math.min(100, (current / goal.targetCopper) * 100) : 0
  return { current, percent }
}
