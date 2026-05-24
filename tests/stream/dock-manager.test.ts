import { describe, it, expect, vi, afterEach } from 'vitest'
import { DockManager } from '../../src/stream/dock-manager.js'
import { createRootNode } from '../../src/core/ir.js'

describe('DockManager', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns dock region coordinates', () => {
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    const dock = new DockManager()
    const region = dock.setDockHeight(5)
    expect(region.height).toBe(5)
    expect(region.width).toBeGreaterThan(0)
    expect(region.originRow).toBeGreaterThan(0)
  })

  it('autoMeasure returns updated region when height changes', () => {
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    const dock = new DockManager()
    dock.setDockHeight('auto')
    const root = createRootNode()
    root.layout = { x: 0, y: 0, width: 80, height: 12, clipBox: undefined }

    const updated = dock.autoMeasure(root)
    expect(updated).not.toBeNull()
    expect(updated!.height).toBe(12)
  })
})
