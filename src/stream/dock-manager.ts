import type { IRElementNode } from '../core/ir.js'

export class DockManager {
  private dockHeight = 0
  private autoHeight = false

  setDockHeight(height: number | 'auto'): { originRow: number; originCol: number; width: number; height: number } {
    const rows = process.stdout.rows ?? 24
    const cols = process.stdout.columns ?? 80

    if (height === 'auto') {
      this.autoHeight = true
      this.dockHeight = Math.max(3, Math.min(10, rows - 3))
    } else {
      this.autoHeight = false
      this.dockHeight = Math.max(3, Math.min(height, rows - 3))
    }

    const proseBottom = rows - this.dockHeight

    process.stdout.write(`\x1B[1;${proseBottom}r`)

    process.stdout.write(`\x1B[${proseBottom + 1};1H\x1B[J`)

    return { originRow: proseBottom + 1, originCol: 1, width: cols, height: this.dockHeight }
  }

  autoMeasure(root: IRElementNode): { originRow: number; originCol: number; width: number; height: number } | null {
    if (!this.autoHeight || !root.layout) return null

    const measuredHeight = root.layout.height
    const rows = process.stdout.rows ?? 24
    const cols = process.stdout.columns ?? 80

    const newHeight = Math.max(3, Math.min(measuredHeight, rows - 3))

    if (newHeight !== this.dockHeight) {
      this.dockHeight = newHeight
      const proseBottom = rows - this.dockHeight

      process.stdout.write(`\x1B[1;${proseBottom}r`)
      process.stdout.write(`\x1B[${proseBottom + 1};1H\x1B[J`)
    }

    return {
      originRow: rows - this.dockHeight + 1,
      originCol: 1,
      width: cols,
      height: this.dockHeight,
    }
  }

  getRegion(): { originRow: number; originCol: number; width: number; height: number } {
    const rows = process.stdout.rows ?? 24
    const cols = process.stdout.columns ?? 80
    return {
      originRow: rows - this.dockHeight + 1,
      originCol: 1,
      width: cols,
      height: this.dockHeight,
    }
  }

  reset(): void {
    this.dockHeight = 0
    this.autoHeight = false
    process.stdout.write('\x1B[r')
  }
}
