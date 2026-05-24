export interface FenceDetectorOptions {
  onProse: (chunk: string) => void
  onWidget: (source: string, meta: WidgetMeta) => void
}

export interface WidgetMeta {
  height: number | 'auto'
  title?: string
}

type State = 'prose' | 'in-fence'

export class FenceDetector {
  private state: State = 'prose'
  private buffer = ''
  private widgetBuffer = ''
  private widgetMeta: WidgetMeta = { height: 10 }
  private readonly onProse: (chunk: string) => void
  private readonly onWidget: (source: string, meta: WidgetMeta) => void

  constructor(options: FenceDetectorOptions) {
    this.onProse = options.onProse
    this.onWidget = options.onWidget
  }

  write(chunk: string): void {
    this.buffer += chunk

    while (true) {
      if (this.state === 'prose') {
        const fenceStart = this.buffer.indexOf('```html-term')
        if (fenceStart === -1) {
          const safe = Math.max(0, this.buffer.length - 12)
          if (safe > 0) {
            this.onProse(this.buffer.slice(0, safe))
            this.buffer = this.buffer.slice(safe)
          }
          break
        }

        if (fenceStart > 0) {
          this.onProse(this.buffer.slice(0, fenceStart))
        }

        const lineEnd = this.buffer.indexOf('\n', fenceStart)
        if (lineEnd === -1) break

        const fenceLine = this.buffer.slice(fenceStart, lineEnd)
        this.widgetMeta = parseFenceMeta(fenceLine)
        this.widgetBuffer = ''
        this.state = 'in-fence'
        this.buffer = this.buffer.slice(lineEnd + 1)

      } else {
        const combined = this.widgetBuffer + this.buffer
        let fenceEnd = combined.indexOf('\n```')
        let closeLen = 4

        if (fenceEnd === -1 && combined.startsWith('```')) {
          fenceEnd = 0
          closeLen = 3
        }

        if (fenceEnd === -1) {
          this.widgetBuffer += this.buffer
          this.buffer = ''
          break
        }

        const source = combined.slice(0, fenceEnd)
        this.onWidget(source, this.widgetMeta)
        this.widgetBuffer = ''
        this.state = 'prose'
        this.buffer = combined.slice(fenceEnd + closeLen)
      }
    }
  }

  flush(): void {
    if (this.buffer && this.state === 'prose') {
      this.onProse(this.buffer)
      this.buffer = ''
    }
  }
}

function parseFenceMeta(fenceLine: string): WidgetMeta {
  const heightStr = fenceLine.match(/height=(\w+)/)?.[1]
  let height: number | 'auto' = 'auto'

  if (heightStr === 'auto' || !heightStr) {
    height = 'auto'
  } else {
    const parsed = parseInt(heightStr)
    if (!isNaN(parsed)) {
      height = Math.max(3, Math.min(parsed, 50))
    }
  }

  const title = fenceLine.match(/title="([^"]+)"/)?.[1]
  return { height, title }
}
