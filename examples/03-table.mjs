import { render } from 'html-term/solid'

function text(s) {
  return { kind: 'text', text: s, style: {} }
}

function cell(tag, label, meta) {
  return {
    kind: 'element', tag,
    children: [text(label)],
    style: {},
    box: {
      paddingTop: 0, paddingRight: 0, paddingBottom: 0, paddingLeft: 0,
      borderTop: 0, borderRight: 0, borderBottom: 0, borderLeft: 0,
      borderStyle: 'single',
    },
    classList: tag === 'th' ? ['font-bold'] : [],
    flexClasses: [],
    widthClasses: [],
    scrollTop: 0,
    tableCell: meta ? {
      priority: meta.priority ?? 1,
      align: meta.align ?? 'left',
      colSpan: 1,
    } : undefined,
  }
}

function row(cells) {
  return {
    kind: 'element', tag: 'tr', children: cells,
    style: {}, box: {
      paddingTop: 0, paddingRight: 0, paddingBottom: 0, paddingLeft: 0,
      borderTop: 0, borderRight: 0, borderBottom: 0, borderLeft: 0,
      borderStyle: 'single',
    }, classList: [], flexClasses: [], widthClasses: [], scrollTop: 0,
  }
}

const app = render(() => ({
  kind: 'element',
  tag: 'table',
  children: [
    row([cell('th', 'Name'), cell('th', 'Role'), cell('th', 'Value', { align: 'right' })]),
    row([cell('td', 'Alice'), cell('td', 'Engineer'), cell('td', '42', { align: 'right' })]),
    row([cell('td', 'Bob'), cell('td', 'Designer'), cell('td', '7', { align: 'right' })]),
  ],
  style: {},
  box: {
    paddingTop: 0, paddingRight: 0, paddingBottom: 0, paddingLeft: 0,
    borderTop: 0, borderRight: 0, borderBottom: 0, borderLeft: 0,
    borderStyle: 'single',
  },
  classList: [],
  flexClasses: [],
  widthClasses: [],
  scrollTop: 0,
}), { width: 80, height: 24 })

const frame = app.flushFrame()
if (frame) process.stdout.write(frame)
app.unmount()
