declare module 'gw2e-account-value' {
  type AccountPart = { value: number } | null

  type AccountValueResult = {
    summary: AccountPart
    wallet: AccountPart
    bank: AccountPart
    materials: AccountPart
    commerce: AccountPart
    shared: AccountPart
    [key: string]: AccountPart
  }

  export function allItemIds(accountData: unknown): number[]
  export function boundItemIds(accountData: unknown): number[]

  export default function accountValue(accountData: unknown, values: unknown): AccountValueResult
}
