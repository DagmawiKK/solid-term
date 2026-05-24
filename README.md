# solid-term

A SolidJS custom renderer for the terminal. Write SolidJS components with signals, effects, and JSX — rendered as ANSI terminal UI, not HTML.

```javascript
import { render } from 'solid-term/solid'
import { tailwind } from 'solid-term/resolvers'

const app = render(() =>
  el('div', [
    txt('Hello from solid-term!'),
  ], ['font-bold', 'text-green-400']),
  { width: 80, height: 24, classResolver: tailwind() }
)

const frame = app.flushFrame()
if (frame) process.stdout.write(frame)
```

## Why

AI coding agents communicate through markdown in the terminal — but markdown can't show interactive content. solid-term gives AI agents (and humans) the ability to render live, reactive UIs directly in the terminal: dashboards that update, counters that tick, tables that sort, forms that validate.

## Install

```bash
npm install solid-term solid-js
```

## How It Works

solid-term replaces the browser DOM with a **terminal canvas**. The SolidJS runtime handles reactivity (`createSignal`, `createEffect`, etc.), control flow (`<Show>`, `<For>`), and lifecycle — solid-term handles only the terminal-specific parts:

| Layer | Responsibility |
|-------|---------------|
| **IR Tree** | Maps Solid's element create/insert/remove to intermediate representation nodes |
| **Style resolver** | Resolves Tailwind classes and inline styles to terminal style tokens |
| **Layout** | Flexbox, text wrapping, table column sizing — all in character units |
| **Canvas** | Double-buffered character grid with ANSI SGR rendering |
| **Paint** | Walks the IR tree and draws to the canvas |

## API

### `render(component, options?)`

One-shot render. Returns a `RenderHandle` with `flushFrame()`, `scheduleRender()`, `resize()`, `unmount()`.

```javascript
import { render } from 'solid-term/solid'

const app = render(() => htmlTree, { width: 80, height: 24 })
const frame = app.flushFrame()
process.stdout.write(frame)
```

### `renderLoop(component, options?)`

Full interactive terminal loop with raw-mode keyboard, mouse, and resize handling. Returns `{ cleanup }`.

```javascript
import { renderLoop } from 'solid-term/cli'

renderLoop(() => htmlTree, {
  fps: 30,
  keybindings: { q: () => process.exit(0) }
})
```

### `tailwind()`

Class resolver supporting ~350+ Tailwind utilities: text colors, background colors, font-weight, italic, underline, strikethrough, responsive breakpoints (`sm:`, `md:`, `lg:`), and dark mode (`dark:`).

```javascript
import { tailwind } from 'solid-term/resolvers'

const resolver = tailwind()
// resolves: ['text-green-400', 'font-bold', 'bg-zinc-900']
```

## Examples

| Example | File | Description |
|---------|------|-------------|
| Hello | `examples/01-hello.mjs` | One-shot render with bold green text |
| Counter | `examples/02-counter.mjs` | Reactive counter, ticks 1→10 |
| Table | `examples/03-table.mjs` | Table with borders and cell alignment |
| Dashboard | `examples/04-dashboard.mjs` | Colorful stat cards + activity table |
| Todo | `examples/05-todo.mjs` | **Interactive** — keyboard controls, selection |

Run any example:

```bash
node examples/05-todo.mjs
```

> **Note**: `.mjs` examples import from the built package. Run `npx tsc` first to compile.

## Exports

```
solid-term            → render, renderLoop, TerminalCanvas, tailwind, createStream
solid-term/solid      → render, hitTest, paintNode
solid-term/cli        → renderLoop
solid-term/canvas     → TerminalCanvas
solid-term/resolvers  → tailwind
solid-term/core       → IR types, class resolver interface
solid-term/stream     → createStream (chatbot streaming integration)
```

## Architecture

```
Component (SolidJS)
    ↓
solid-js/universal renderer
    ↓
IR Tree (element + text nodes)
    ↓
Style resolution (Tailwind → ANSI tokens)
    ↓
Layout (flex, table wrap, character measure)
    ↓
Paint to TerminalCanvas
    ↓
ANSI escape codes to stdout
```

## License

MIT
