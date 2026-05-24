import type { StyleTokens } from './ir.js'

export interface ClassResolverOptions {
  width: number
  theme: 'dark' | 'light'
}

export type ClassResolver = (classes: string[], options: ClassResolverOptions) => StyleTokens
