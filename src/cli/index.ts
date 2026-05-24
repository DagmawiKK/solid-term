import { render } from '../solid/index.js'
import type { RenderOptions } from '../solid/index.js'
import { initMouse, stopMouse } from './mouse.js'
import { initTerminal, cleanupTerminal, registerCleanupHandlers } from './terminal.js'
import { hitTest } from '../solid/hit-test.js'

export interface RenderLoopOptions extends RenderOptions {
  fps?: number
  keybindings?: Record<string, () => void>
}

export function renderLoop(Component: () => any, options?: RenderLoopOptions): { cleanup: () => void } {
  const fps = options?.fps ?? 30
  const frameMs = 1000 / fps

  const app = render(Component, options)
  let running = true

  initTerminal()

  initMouse((event) => {
    if (event.scroll) {
      const delta = event.scrollDirection === 'up' ? -1 : 1
      const scrollable = findScrollable(app.root)
      if (scrollable) {
        scrollable.scrollTop = Math.max(0, (scrollable.scrollTop ?? 0) + delta)
        app.scheduleRender()
      }
      return
    }

    if (event.action === 'down') {
      const node = hitTest(app.root, event.col, event.row)
      if (node?.onClick) {
        node.onClick()
      }
    }
  })

  process.stdout.on('resize', () => {
    const w = process.stdout.columns ?? 80
    const h = process.stdout.rows ?? 24
    app.resize(w, h)
  })

  process.stdin.on('keypress', (str: string, key: any) => {
    if (!key) return

    if (key.ctrl && key.name === 'c') {
      cleanup()
      return
    }

    if (key.name && options?.keybindings?.[key.name]) {
      options.keybindings[key.name]()
      return
    }

    const focused = findFocused(app.root) ?? findInput(app.root)
    if (focused?.tag === 'input' && focused.onInput) {
      if (key.name === 'backspace') {
        focused.inputValue = (focused.inputValue ?? '').slice(0, -1)
        focused.onInput(focused.inputValue)
        app.scheduleRender()
        return
      }
      if (str && str.length === 1 && !key.ctrl && !key.meta) {
        focused.inputValue = (focused.inputValue ?? '') + str
        focused.onInput(focused.inputValue)
        app.scheduleRender()
        return
      }
    }

    if (focused?.onKeyPress) {
      focused.onKeyPress(key.name ?? str)
    }
  })

  let lastFrame = performance.now()

  function loop() {
    if (!running) return

    const now = performance.now()
    if (now - lastFrame >= frameMs) {
      const frame = app.flushFrame()
      if (frame) process.stdout.write(frame)
      lastFrame = now
    }

    const elapsed = performance.now() - lastFrame
    const delay = Math.max(0, frameMs - elapsed)
    setTimeout(loop, delay)
  }

  loop()

  function cleanup() {
    running = false
    stopMouse()
    cleanupTerminal()
    app.unmount()
  }

  registerCleanupHandlers(cleanup)

  return { cleanup }
}

function findFocused(root: any): any {
  if (root.onKeyPress) return root
  for (const child of root.children ?? []) {
    const found = findFocused(child)
    if (found) return found
  }
  return null
}

function findInput(root: any): any {
  if (root.tag === 'input' && root.onInput) return root
  for (const child of root.children ?? []) {
    if (child.kind === 'element') {
      const found = findInput(child)
      if (found) return found
    }
  }
  return null
}

function findScrollable(root: any): any {
  if ((root.scrollTop ?? 0) >= 0 && root.children?.length > 0) {
    const hasOverflow = root.layout && root.children.some((c: any) => {
      const childBottom = (c.layout?.y ?? 0) + (c.layout?.height ?? 0)
      return childBottom > (root.layout?.y ?? 0) + (root.layout?.height ?? 0)
    })
    if (hasOverflow || root.scrollTop > 0) return root
  }
  for (const child of root.children ?? []) {
    if (child.kind === 'element') {
      const found = findScrollable(child)
      if (found) return found
    }
  }
  return null
}
