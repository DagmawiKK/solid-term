import { render } from 'html-term/solid'
import { tailwind } from 'html-term/resolvers'

const FLEX_BASES = new Set(['flex', 'flex-row', 'flex-col', 'flex-1', 'flex-wrap'])
const GAP_RE = /^gap-\d+$/
const WIDTH_RE = /^(w-\d+\/\d+|flex-1|w-full|w-auto)$/

function isFlex(c) {
  const base = c.replace(/^(sm:|md:|lg:|xl:|2xl:)/, '')
  return FLEX_BASES.has(base) || GAP_RE.test(base)
}

function isWidth(c) {
  return WIDTH_RE.test(c.replace(/^(sm:|md:|lg:|xl:|2xl:)/, ''))
}

function txt(s) {
  return { kind: 'text', text: s, style: {} }
}

function el(tag, children, classList = [], extra = {}) {
  return {
    kind: 'element', tag, children,
    style: extra.style ?? {},
    box: {
      paddingTop: 0, paddingRight: 0, paddingBottom: 0, paddingLeft: 0,
      borderTop: 0, borderRight: 0, borderBottom: 0, borderLeft: 0,
      borderStyle: 'single',
    },
    classList,
    flexClasses: classList.filter(isFlex),
    widthClasses: classList.filter(isWidth),
    scrollTop: 0,
    ...extra,
  }
}

function card(label, value, valCls) {
  return el('div', [
    el('div', [txt(label)], ['text-gray-400', 'italic']),
    el('div', [txt(value)], [valCls, 'font-bold']),
  ], ['border', 'flex-1', 'p-1'])
}

const app = render(() =>
  el('div', [
    el('div', [txt('  \u{1F4CA}  Dashboard')], ['text-blue-400', 'font-bold', 'p-1', 'bg-slate-800']),
    el('div', [
      card('Users',   '1,234',  'text-green-400'),
      card('Revenue', '$45.2K', 'text-yellow-400'),
      card('Orders',  '89',     'text-blue-400'),
      card('Growth',  '+12.5%', 'text-green-400'),
    ], ['flex', 'flex-row', 'gap-2', 'p-1', 'pt-0']),
    el('div', [txt('  Recent Activity')], ['text-cyan-400', 'italic', 'p-1']),
    el('table', [
      el('tr', [
        el('th', [txt('User')],   ['font-bold']),
        el('th', [txt('Action')], ['font-bold']),
        el('th', [txt('Status')], ['font-bold']),
        el('th', [txt('Time')],   ['font-bold']),
      ]),
      el('tr', [el('td', [txt('Alice')]),  el('td', [txt('Login')]),    el('td', [txt('OK')]),     el('td', [txt('2m')])]),
      el('tr', [el('td', [txt('Bob')]),    el('td', [txt('Buy')]),      el('td', [txt('Wait')]),   el('td', [txt('5m')])]),
      el('tr', [el('td', [txt('Charlie')]),el('td', [txt('Signup')]),   el('td', [txt('OK')]),     el('td', [txt('10m')])]),
    ], ['text-gray-300', 'p-1']),
  ], ['w-full', 'border', 'bg-zinc-900']),
  { width: 80, height: 24, classResolver: tailwind() },
)

const frame = app.flushFrame()
if (frame) process.stdout.write(frame)
app.unmount()
