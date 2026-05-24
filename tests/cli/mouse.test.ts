import { describe, it, expect, vi } from 'vitest'
import type { MouseEvent } from '../../src/cli/mouse.js'

describe('mouse module structure', () => {
  it('exports initMouse and stopMouse', async () => {
    const mod = await import('../../src/cli/mouse.js')
    expect(typeof mod.initMouse).toBe('function')
    expect(typeof mod.stopMouse).toBe('function')
  })
})

describe('SGR mouse parsing logic (protocol-level tests)', () => {
  function simulateEvents(data: string): MouseEvent[] {
    const events: MouseEvent[] = []
    const regex = /\x1B\[<(\d+);(\d+);(\d+)([Mm])/g
    let match: RegExpExecArray | null
    while ((match = regex.exec(data)) !== null) {
      const buttonCode = parseInt(match[1])
      const col = parseInt(match[2]) - 1
      const row = parseInt(match[3]) - 1
      const pressed = match[4] === 'M'
      const drag = (buttonCode & 32) !== 0
      const scroll = (buttonCode & 64) !== 0
      const button = buttonCode & 3
      events.push({
        row, col, button,
        action: pressed ? 'down' as const : 'up' as const,
        drag,
        scroll,
        scrollDirection: scroll ? (button === 0 ? 'up' as const : 'down' as const) : undefined,
      })
    }
    return events
  }

  it('parses left click press at 1-indexed coords', () => {
    const events = simulateEvents('\x1B[<0;5;10M')
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({
      button: 0,
      col: 4,
      row: 9,
      action: 'down',
      drag: false,
      scroll: false,
    })
  })

  it('parses left click release', () => {
    const events = simulateEvents('\x1B[<0;5;10m')
    expect(events).toHaveLength(1)
    expect(events[0].action).toBe('up')
  })

  it('parses middle click (button=1)', () => {
    const events = simulateEvents('\x1B[<1;10;20M')
    expect(events[0].button).toBe(1)
  })

  it('parses right click (button=2)', () => {
    const events = simulateEvents('\x1B[<2;10;20M')
    expect(events[0].button).toBe(2)
  })

  it('detects drag events (bit 5 set)', () => {
    const events = simulateEvents('\x1B[<32;10;20M')
    expect(events[0].drag).toBe(true)
  })

  it('detects scroll events (bit 6 set)', () => {
    const events = simulateEvents('\x1B[<64;10;20M')
    expect(events[0].scroll).toBe(true)
    expect(events[0].scrollDirection).toBe('up')
  })

  it('detects scroll down (bit 6 set + button=1)', () => {
    const events = simulateEvents('\x1B[<65;10;20M')
    expect(events[0].scroll).toBe(true)
    expect(events[0].scrollDirection).toBe('down')
  })

  it('parses multiple events in one buffer', () => {
    const events = simulateEvents('\x1B[<0;10;20M\x1B[<1;15;25M\x1B[<2;30;40M')
    expect(events).toHaveLength(3)
    expect(events[0].col).toBe(9)
    expect(events[1].col).toBe(14)
    expect(events[2].col).toBe(29)
  })

  it('ignores non-mouse data interspersed', () => {
    const events = simulateEvents('some text \x1B[<0;1;1M more text')
    expect(events).toHaveLength(1)
  })

  it('handles large coordinate values', () => {
    const events = simulateEvents('\x1B[<0;999;999M')
    expect(events[0].col).toBe(998)
    expect(events[0].row).toBe(998)
  })
})
