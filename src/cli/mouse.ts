export interface MouseEvent {
  row: number
  col: number
  button: number
  action: 'down' | 'up'
  drag: boolean
  scroll: boolean
  scrollDirection?: 'up' | 'down'
}

type MouseHandler = (event: MouseEvent) => void

let mouseBuffer = ''
let mouseDataListener: ((chunk: Buffer) => void) | null = null

export function initMouse(handler: MouseHandler): void {
  process.stdout.write('\x1B[?1000h')
  process.stdout.write('\x1B[?1002h')
  process.stdout.write('\x1B[?1006h')

  mouseDataListener = (chunk: Buffer) => {
    mouseBuffer += chunk.toString('binary')
    const consumed = parseMouseSequences(mouseBuffer, handler)
    mouseBuffer = mouseBuffer.slice(consumed)
  }

  process.stdin.on('data', mouseDataListener)
}

export function stopMouse(): void {
  process.stdout.write('\x1B[?1000l')
  process.stdout.write('\x1B[?1002l')
  process.stdout.write('\x1B[?1006l')

  if (mouseDataListener) {
    process.stdin.off('data', mouseDataListener)
    mouseDataListener = null
  }
  mouseBuffer = ''
}

function parseMouseSequences(buffer: string, handler: MouseHandler): number {
  const regex = /\x1B\[<(\d+);(\d+);(\d+)([Mm])/g
  let lastMatchEnd = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(buffer)) !== null) {
    const buttonCode = parseInt(match[1])
    const col = parseInt(match[2]) - 1
    const row = parseInt(match[3]) - 1
    const pressed = match[4] === 'M'

    const drag = (buttonCode & 32) !== 0
    const scroll = (buttonCode & 64) !== 0
    const button = buttonCode & 3

    const event: MouseEvent = {
      row,
      col,
      button,
      action: pressed ? 'down' : 'up',
      drag,
      scroll,
      scrollDirection: scroll ? (button === 0 ? 'up' : 'down') : undefined,
    }

    handler(event)
    lastMatchEnd = match.index + match[0].length
  }

  return lastMatchEnd
}
