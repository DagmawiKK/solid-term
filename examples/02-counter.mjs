import { render } from 'html-term/solid'
import { tailwind } from 'html-term/resolvers'

const textNode = { kind: 'text', text: 'Count: 0', style: {} }

const app = render(() => ({
  kind: 'element',
  tag: 'div',
  children: [
    textNode,
    { kind: 'text', text: '\n(Press Ctrl+C to exit)', style: {} },
  ],
  style: {},
  box: {
    paddingTop: 0, paddingRight: 0, paddingBottom: 0, paddingLeft: 0,
    borderTop: 0, borderRight: 0, borderBottom: 0, borderLeft: 0,
    borderStyle: 'single',
  },
  classList: ['text-green-400', 'font-bold'],
  flexClasses: [],
  widthClasses: [],
  scrollTop: 0,
}), { width: 80, height: 24, classResolver: tailwind() })

let count = 0
function tick() {
  count++
  textNode.text = `Count: ${count}`
  app.scheduleRender()
  const frame = app.flushFrame()
  if (frame) {
    console.clear()
    process.stdout.write(frame)
  }
  if (count < 10) setTimeout(tick, 500)
  else app.unmount()
}
tick()
