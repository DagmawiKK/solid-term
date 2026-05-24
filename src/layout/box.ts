import { type BoxModel } from '../core/ir.js'

export function parseBoxClasses(classList: string[]): Partial<BoxModel> {
  const box: Partial<BoxModel> = {}

  for (const cls of classList) {
    const base = stripResponsivePrefix(cls)

    const p = base.match(/^p([xytblr]?)-(\d+)$/)
    if (p) {
      const val = parseInt(p[2])
      const side = p[1]
      if (!side || side === 'x') { box.paddingLeft = val; box.paddingRight = val }
      if (!side || side === 'y') { box.paddingTop = val; box.paddingBottom = val }
      if (side === 't') box.paddingTop = val
      if (side === 'r') box.paddingRight = val
      if (side === 'b') box.paddingBottom = val
      if (side === 'l') box.paddingLeft = val
      continue
    }

    if (base === 'border') {
      box.borderTop = 1; box.borderRight = 1
      box.borderBottom = 1; box.borderLeft = 1
      continue
    }

    if (base === 'border-double') { box.borderStyle = 'double'; continue }
    if (base === 'border-rounded' || base === 'rounded') { box.borderStyle = 'round'; continue }
    if (base === 'border-none') { box.borderStyle = 'none'; continue }
  }

  return box
}

function stripResponsivePrefix(cls: string): string {
  for (const prefix of ['2xl:', 'xl:', 'lg:', 'md:', 'sm:']) {
    if (cls.startsWith(prefix)) return cls.slice(prefix.length)
  }
  return cls
}
