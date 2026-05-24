import { describe, it, expect } from 'vitest'
import { render } from '../src/solid/index.js'
import { tailwind } from '../src/resolvers/tailwind.js'

describe('examples: 01-hello', () => {
  it('renders green bold text', () => {
    const app = render(() => ({
      kind: 'element',
      tag: 'div',
      children: [
        { kind: 'text', text: 'Hello from html-term!', style: {} },
      ],
      style: {},
      box: {
        paddingTop: 0, paddingRight: 0, paddingBottom: 0, paddingLeft: 0,
        borderTop: 0, borderRight: 0, borderBottom: 0, borderLeft: 0,
        borderStyle: 'single' as const,
      },
      classList: ['text-green-400', 'font-bold'],
      flexClasses: [],
      widthClasses: [],
      scrollTop: 0,
    }), { width: 80, height: 24, classResolver: tailwind() })

    const frame = app.flushFrame()
    expect(frame).not.toBeNull()
    expect(frame).toContain('Hello from html-term!')
    // bold (1) and truecolor green (38;2;74;222;128) are combined in one code
    expect(frame).toContain('\x1B[0;1;38;2;74;222;128m')
    app.unmount()
  })
})

describe('examples: 02-counter', () => {
  it('renders initial count and updates on scheduleRender', () => {
    const textNode = { kind: 'text', text: 'Count: 0', style: {} } as const

    const app = render(() => ({
      kind: 'element',
      tag: 'div',
      children: [textNode as any],
      style: {},
      box: {
        paddingTop: 0, paddingRight: 0, paddingBottom: 0, paddingLeft: 0,
        borderTop: 0, borderRight: 0, borderBottom: 0, borderLeft: 0,
        borderStyle: 'single' as const,
      },
      classList: ['text-green-400', 'font-bold'],
      flexClasses: [],
      widthClasses: [],
      scrollTop: 0,
    }), { width: 80, height: 24, classResolver: tailwind() })

    const frame1 = app.flushFrame()
    expect(frame1).not.toBeNull()
    expect(frame1).toContain('Count: 0')

    ;(textNode as any).text = 'Count: 5'
    app.scheduleRender()
    const frame2 = app.flushFrame()
    expect(frame2).toContain('Count: 5')

    app.unmount()
  })
})

describe('examples: 05-todo', () => {
  function txt(s: string) {
    return { kind: 'text' as const, text: s, style: {} }
  }

  function el(tag: string, children: any[], classList: string[] = []) {
    const isFlex = (c: string) => /^(flex|flex-.+|gap-\d+)$/.test(c)
    const isWidth = (c: string) => /^w-.+$/.test(c)
    return {
      kind: 'element' as const, tag, children,
      style: {},
      box: {
        paddingTop: 0, paddingRight: 0, paddingBottom: 0, paddingLeft: 0,
        borderTop: 0, borderRight: 0, borderBottom: 0, borderLeft: 0,
        borderStyle: 'single' as const,
      },
      classList,
      flexClasses: classList.filter(isFlex),
      widthClasses: classList.filter(isWidth),
      scrollTop: 0,
    }
  }

  function todoItem(text: string, done: boolean, index: number, selected: number) {
    const mark = done ? '\u2713' : '\u25CB'
    const isSel = index === selected
    const cls = ['p-1']
    if (isSel) cls.push('bg-blue-900', 'font-bold')
    if (done) cls.push('line-through', 'text-green-400')
    else cls.push('text-gray-200')
    return el('div', [txt(` ${mark} ${text}`)], cls)
  }

  it('renders all todo items initially', () => {
    const todos = [
      { text: 'Task A', done: false },
      { text: 'Task B', done: true },
    ]
    let selected = 0

    const tree = el('div', [
      el('div', [txt('  Todo List')], ['font-bold', 'text-blue-400', 'bg-slate-800', 'p-1']),
      el('div', todos.map((t, i) => todoItem(t.text, t.done, i, selected)), ['flex-1']),
      el('div', [txt('  j/\u2193: down')], ['text-gray-500', 'p-1', 'bg-slate-800']),
    ], ['w-full', 'bg-zinc-900', 'flex', 'flex-col', 'h-full'])

    const app = render(() => tree, { width: 80, height: 24, classResolver: tailwind() })
    const frame = app.flushFrame()
    expect(frame).not.toBeNull()
    expect(frame).toContain('Task A')
    expect(frame).toContain('Task B')
    // selected item: bold + gray text + bg-blue-900 combined in one code
    expect(frame).toContain('○ Task A')
    expect(frame).toContain('\x1B[0;1;38;2;229;231;235;48;2;30;58;95m')
    // done item: strikethrough + green text on zinc-900 bg
    expect(frame).toContain('✓ Task B')
    expect(frame).toContain('\x1B[0;9;38;2;74;222;128;48;2;24;24;27m')
    app.unmount()
  })

  it('updates when toggling a todo', () => {
    const todos = [
      { text: 'Toggle me', done: false },
    ]
    let selected = 0

    const tree = el('div', [
      el('div', [txt('  Todo List')], ['p-1']),
      el('div', todos.map((t, i) => todoItem(t.text, t.done, i, selected)), ['flex-1']),
      el('div', [txt('  x: toggle')], ['p-1']),
    ], ['w-full', 'bg-zinc-900', 'flex', 'flex-col', 'h-full'])

    const app = render(() => tree, { width: 80, height: 24, classResolver: tailwind() })
    const listContainer = tree.children[1]

    const frame1 = app.flushFrame()
    expect(frame1).toContain('\u25CB')
    expect(frame1).not.toContain('\u2713')

    todos[0].done = true
    listContainer.children = [todoItem(todos[0].text, todos[0].done, 0, selected)]
    app.scheduleRender()
    const frame2 = app.flushFrame()
    expect(frame2).toContain('\u2713')
    // selected + done: bold + strikethrough + green + bg-blue-900
    expect(frame2).toContain('\x1B[0;1;9;38;2;74;222;128;48;2;30;58;95m')

    app.unmount()
  })

  it('updates when selection changes', () => {
    const todos = [
      { text: 'First', done: false },
      { text: 'Second', done: false },
    ]
    let selected = 0

    const tree = el('div', [
      el('div', [txt('  Todo List')], ['p-1']),
      el('div', todos.map((t, i) => todoItem(t.text, t.done, i, selected)), ['flex-1']),
      el('div', [txt('  j/k: move')], ['p-1']),
    ], ['w-full', 'bg-zinc-900', 'flex', 'flex-col', 'h-full'])

    const app = render(() => tree, { width: 80, height: 24, classResolver: tailwind() })
    const listContainer = tree.children[1]

    app.flushFrame()

    selected = 1
    listContainer.children = todos.map((t, i) => todoItem(t.text, t.done, i, selected))
    app.scheduleRender()
    const frame = app.flushFrame()
    // Second item is now selected: bold + gray + bg-blue-900
    expect(frame).toContain('\x1B[0;1;38;2;229;231;235;48;2;30;58;95m')
    // First is unselected: gray text on zinc bg (no bold)
    expect(frame).toContain('\x1B[0;38;2;229;231;235;48;2;24;24;27m')

    app.unmount()
  })

  it('updates when deleting a todo', () => {
    const todos = [
      { text: 'Keep me', done: false },
      { text: 'Delete me', done: false },
    ]
    let selected = 0

    const tree = el('div', [
      el('div', [txt('  Todo List')], ['p-1']),
      el('div', todos.map((t, i) => todoItem(t.text, t.done, i, selected)), ['flex-1']),
      el('div', [txt('  d: delete')], ['p-1']),
    ], ['w-full', 'bg-zinc-900', 'flex', 'flex-col', 'h-full'])

    const app = render(() => tree, { width: 80, height: 24, classResolver: tailwind() })
    const listContainer = tree.children[1]

    app.flushFrame()

    todos.splice(1, 1)
    selected = 0
    listContainer.children = todos.map((t, i) => todoItem(t.text, t.done, i, selected))
    app.scheduleRender()
    const frame = app.flushFrame()
    expect(frame).toContain('Keep me')
    expect(frame).not.toContain('Delete me')

    app.unmount()
  })

  it('updates when adding a todo', () => {
    const todos: { text: string; done: boolean }[] = []
    let selected = 0

    const tree = el('div', [
      el('div', [txt('  Todo List')], ['p-1']),
      el('div', todos.map((t, i) => todoItem(t.text, t.done, i, selected)), ['flex-1']),
      el('div', [txt('  n: add')], ['p-1']),
    ], ['w-full', 'bg-zinc-900', 'flex', 'flex-col', 'h-full'])

    const app = render(() => tree, { width: 80, height: 24, classResolver: tailwind() })
    const listContainer = tree.children[1]

    app.flushFrame()

    todos.push({ text: 'New task', done: false })
    selected = todos.length - 1
    listContainer.children = todos.map((t, i) => todoItem(t.text, t.done, i, selected))
    app.scheduleRender()
    const frame = app.flushFrame()
    expect(frame).toContain('New task')

    app.unmount()
  })
})

describe('examples: 03-table', () => {
  it('renders table with borders, headers, and body data', () => {
    function text(s: string) {
      return { kind: 'text', text: s, style: {} } as const
    }

    function cell(tag: 'th' | 'td', label: string) {
      return {
        kind: 'element' as const, tag,
        children: [text(label)],
        style: {},
        box: {
          paddingTop: 0, paddingRight: 0, paddingBottom: 0, paddingLeft: 0,
          borderTop: 0, borderRight: 0, borderBottom: 0, borderLeft: 0,
          borderStyle: 'single' as const,
        },
        classList: tag === 'th' ? ['font-bold'] : [],
        flexClasses: [] as string[],
        widthClasses: [] as string[],
        scrollTop: 0,
      }
    }

    function row(cells: any[]) {
      return {
        kind: 'element' as const, tag: 'tr', children: cells,
        style: {}, box: {
          paddingTop: 0, paddingRight: 0, paddingBottom: 0, paddingLeft: 0,
          borderTop: 0, borderRight: 0, borderBottom: 0, borderLeft: 0,
          borderStyle: 'single' as const,
        }, classList: [] as string[], flexClasses: [] as string[],
        widthClasses: [] as string[], scrollTop: 0,
      }
    }

    const app = render(() => ({
      kind: 'element',
      tag: 'table',
      children: [
        row([cell('th', 'Name'), cell('th', 'Role')]),
        row([cell('td', 'Alice'), cell('td', 'Engineer')]),
      ],
      style: {},
      box: {
        paddingTop: 0, paddingRight: 0, paddingBottom: 0, paddingLeft: 0,
        borderTop: 0, borderRight: 0, borderBottom: 0, borderLeft: 0,
        borderStyle: 'single' as const,
      },
      classList: [], flexClasses: [], widthClasses: [], scrollTop: 0,
    }), { width: 80, height: 24 })

    const frame = app.flushFrame()
    expect(frame).not.toBeNull()
    expect(frame).toContain('┌')
    expect(frame).toContain('│')
    expect(frame).toContain('Name')
    expect(frame).toContain('Alice')
    app.unmount()
  })
})
