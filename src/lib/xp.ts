// Beregn level fra total XP (uendelig leveling)
export function getLevelFromXP(totalXP: number): number {
  let level = 1
  let required = 100
  let remaining = totalXP

  while (remaining >= required) {
    remaining -= required
    level++
    required = Math.floor(required * 1.15)
  }

  return level
}

// Hvor mye XP trengs for neste level
export function getXPForNextLevel(level: number): number {
  let required = 100
  for (let i = 1; i < level; i++) {
    required = Math.floor(required * 1.15)
  }
  return required
}

// Hvor mye XP er brukt i nåværende level (for progress bar)
export function getXPProgress(totalXP: number): { current: number; required: number } {
  let required = 100
  let remaining = totalXP

  while (remaining >= required) {
    remaining -= required
    required = Math.floor(required * 1.15)
  }

  return { current: remaining, required }
}
