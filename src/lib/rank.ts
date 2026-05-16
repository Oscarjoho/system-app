// Rank basert på percentil blant alle brukere
export type Rank = 'E' | 'D' | 'C' | 'B' | 'A' | 'S'

export function getRankFromPercentile(percentile: number): Rank {
  if (percentile <= 10) return 'E'
  if (percentile <= 30) return 'D'
  if (percentile <= 50) return 'C'
  if (percentile <= 70) return 'B'
  if (percentile <= 90) return 'A'
  return 'S'
}

export const rankColors: Record<Rank, string> = {
  E: 'text-gray-400',
  D: 'text-green-400',
  C: 'text-blue-400',
  B: 'text-purple-400',
  A: 'text-yellow-400',
  S: 'text-orange-400',
}

export const rankBgColors: Record<Rank, string> = {
  E: 'bg-gray-800 border-gray-600',
  D: 'bg-green-950 border-green-700',
  C: 'bg-blue-950 border-blue-700',
  B: 'bg-purple-950 border-purple-700',
  A: 'bg-yellow-950 border-yellow-700',
  S: 'bg-orange-950 border-orange-700',
}
