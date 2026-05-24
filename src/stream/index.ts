import { FenceDetector } from './fence-detector.js'
import type { WidgetMeta } from './fence-detector.js'
import { compileJSX } from './compiler.js'
import { runInSandbox } from './sandbox.js'
import { validateModelCompliance } from './validator.js'
import { DockManager } from './dock-manager.js'
import { render } from '../solid/index.js'
import { tailwind } from '../resolvers/index.js'
import type { SandboxOptions } from './sandbox.js'

export interface StreamOptions {
  sandbox?: SandboxOptions
  classResolver?: ReturnType<typeof tailwind>
  fps?: number
  onError?: (err: Error, source: string) => void
}

export function createStream(options: StreamOptions = {}) {
  const dock = new DockManager()
  const activeWidgets: Array<{ unmount: () => void }> = []

  const detector = new FenceDetector({
    onProse: (chunk: string) => {
      process.stdout.write(chunk)
    },
    onWidget: async (source: string, meta: WidgetMeta) => {
      try {
        const validation = validateModelCompliance(source)
        if (!validation.valid) {
          throw new Error(`Model compliance check failed: ${validation.errors.join('; ')}`)
        }

        const compiled = await compileJSX(source)

        const ComponentFactory = runInSandbox(compiled, options.sandbox ?? {})

        let region = dock.setDockHeight(meta.height)
        const isAutoHeight = meta.height === 'auto'

        const app = render(ComponentFactory, {
          width: region.width,
          height: region.height,
          classResolver: options.classResolver ?? tailwind(),
        })

        let running = true
        let frameCount = 0
        const fps = options.fps ?? 15
        const frameMs = 1000 / fps

        function widgetLoop() {
          if (!running) return
          const frame = app.flushFrame()
          if (frame) {
            if (isAutoHeight) {
              const updated = dock.autoMeasure(app.root)
              if (updated) {
                region = updated
                app.resize(region.width, region.height)
              }
            }
            const output = frameCount === 0
              ? app.canvas.flushRegion(region.originRow, region.originCol, region.width, region.height)
              : app.canvas.flushRegionDelta(region.originRow, region.originCol, region.width, region.height)
            if (output) process.stdout.write(output)
            frameCount++
          }
          setTimeout(widgetLoop, frameMs)
        }
        widgetLoop()

        activeWidgets.push({
          unmount: () => {
            running = false
            app.unmount()
            dock.reset()
          },
        })

      } catch (err) {
        const error = err as Error
        if (options.onError) {
          options.onError(error, source)
        } else {
          process.stdout.write(`\`\`\`typescript\n${source}\n\`\`\`\n`)
          process.stdout.write(`<!-- html-term widget failed to render: ${error.message} -->\n`)
        }
      }
    },
  })

  return {
    write(chunk: string) {
      detector.write(chunk)
    },
    end() {
      detector.flush()
    },
    cleanup() {
      for (const widget of activeWidgets) {
        widget.unmount()
      }
      activeWidgets.length = 0
    },
  }
}
