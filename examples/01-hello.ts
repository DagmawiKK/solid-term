import { render } from '../src/solid/index.js'
import { tailwind } from '../src/resolvers/tailwind.js'

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
if (frame) process.stdout.write(frame)
app.unmount()
