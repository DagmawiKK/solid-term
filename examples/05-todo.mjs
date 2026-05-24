import { render } from 'html-term/solid'
import { tailwind } from 'html-term/resolvers'
import readline from 'readline'

readline.emitKeypressEvents(process.stdin)
process.stdin.setRawMode(true)

const state = {
  todos: [
    { text: 'Learn html-term', done: true },
    { text: 'Write an interactive example', done: false },
    { text: 'Add keyboard navigation', done: false },
    { text: 'Build something cool', done: false },
  ],
  selected: 0,
}

let isRunning = true

function txt(s) {
  return { kind: 'text', text: s, style: {} }
}

function el(tag, children, classList = []) {
  const isFlex = (c) => /^(flex|flex-.+|gap-\d+)$/.test(c)
  const isWidth = (c) => /^w-.+$/.test(c)
  return {
    kind: 'element', tag, children,
    style: {},
    box: {
      paddingTop: 0, paddingRight: 0, paddingBottom: 0, paddingLeft: 0,
      borderTop: 0, borderRight: 0, borderBottom: 0, borderLeft: 0,
      borderStyle: 'single',
    },
    classList,
    flexClasses: classList.filter(isFlex),
    widthClasses: classList.filter(isWidth),
    scrollTop: 0,
  }
}

function todoItem(todo, index, selected) {
  const mark = todo.done ? '\u2713' : '\u25CB'
  const isSel = index === selected
  const cls = ['p-1']
  if (isSel) cls.push('bg-blue-900', 'font-bold')
  if (todo.done) cls.push('line-through', 'text-green-400')
  else cls.push('text-gray-200')
  return el('div', [txt(` ${mark} ${todo.text}`)], cls)
}

const tree = el('div', [
  el('div', [txt('  \uD83D\uDCCB Todo List')], ['font-bold', 'text-blue-400', 'bg-slate-800', 'p-1']),
  el('div', state.todos.map((t, i) => todoItem(t, i, state.selected)), ['flex-1']),
  el('div', [txt('  j/\u2193: down  k/\u2191: up  x/\u2423: toggle  d: delete  n: add  q: quit')], ['text-gray-500', 'p-1', 'bg-slate-800']),
], ['w-full', 'bg-zinc-900', 'flex', 'flex-col', 'h-full'])

const app = render(() => tree, { width: 80, height: 24, classResolver: tailwind() })

const listContainer = tree.children[1]

function renderFrame() {
  const frame = app.flushFrame()
  if (frame) {
    process.stdout.write('\x1B[H')
    process.stdout.write(frame)
  }
}

renderFrame()

function cleanup() {
  isRunning = false
  process.stdout.write('\x1B[?25h')
  process.stdout.write('\x1B[0m')
  process.stdout.write('\x1B[2J\x1B[H')
  try { process.stdin.setRawMode(false) } catch {}
  app.unmount()
  process.exit(0)
}

process.stdin.on('keypress', (str, key) => {
  if (!key || !isRunning) return

  if (key.ctrl && key.name === 'c') { cleanup(); return }

  const prevLen = state.todos.length

  switch (key.name) {
    case 'j': case 'down':
      state.selected = Math.min(state.selected + 1, state.todos.length - 1)
      break
    case 'k': case 'up':
      state.selected = Math.max(state.selected - 1, 0)
      break
    case 'x': case 'space':
      state.todos[state.selected].done = !state.todos[state.selected].done
      break
    case 'd':
      state.todos.splice(state.selected, 1)
      state.selected = Math.min(state.selected, state.todos.length - 1)
      break
    case 'n':
      state.todos.push({ text: 'New task', done: false })
      state.selected = state.todos.length - 1
      break
    case 'q':
      cleanup()
      return
    default:
      return
  }

  listContainer.children = state.todos.map((t, i) => todoItem(t, i, state.selected))
  app.scheduleRender()
  renderFrame()
})
