import vm from 'node:vm'
import {
  createSignal, createEffect, createMemo, createResource,
  onMount, onCleanup, untrack, batch,
  For, Show, Switch, Match, ErrorBoundary, Suspense,
} from 'solid-js'

const SOLID_SCOPE = {
  createSignal,
  createEffect,
  createMemo,
  createResource,
  onMount,
  onCleanup,
  untrack,
  batch,

  For,
  Show,
  Switch,
  Match,
  ErrorBoundary,
  Suspense,

  console,
  Math,
  Date,
  JSON,
  parseInt,
  parseFloat,
  isNaN,
  isFinite,
  encodeURIComponent,
  decodeURIComponent,
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  Promise,
  Array,
  Object,
  String,
  Number,
  Boolean,
  Map,
  Set,
  WeakMap,
  WeakSet,
  Error,
  TypeError,
  RangeError,
}

export interface SandboxOptions {
  allowFetch?: boolean
  allowFetchDomains?: string[]
}

export type ComponentFactory = () => any

export function runInSandbox(
  compiledSource: string,
  options: SandboxOptions = {},
): ComponentFactory {
  const scope: Record<string, any> = { ...SOLID_SCOPE }

  if (options.allowFetch) {
    if (options.allowFetchDomains && options.allowFetchDomains.length > 0) {
      scope.fetch = (url: string, init?: RequestInit) => {
        const hostname = new URL(url).hostname
        if (!options.allowFetchDomains!.some(d => hostname === d || hostname.endsWith('.' + d))) {
          throw new Error(`fetch blocked: ${hostname} not in allowlist`)
        }
        return globalThis.fetch(url, init)
      }
    } else {
      scope.fetch = globalThis.fetch
    }
  }

  const wrapped = `
    (function(scope) {
      const {
        ${Object.keys(scope).join(',\n        ')}
      } = scope;

      ${compiledSource}

      if (typeof Widget !== 'undefined') return Widget;
      if (typeof App !== 'undefined') return App;
      if (typeof Component !== 'undefined') return Component;

      throw new Error('html-term: component source must define Widget, App, or Component function');
    })(scope)
  `

  const context = vm.createContext({ scope })

  try {
    const factory = vm.runInContext(wrapped, context, {
      timeout: 2000,
      filename: 'html-term-widget.js',
    })

    if (typeof factory !== 'function') {
      throw new Error('html-term: compiled code did not return a function')
    }

    return factory
  } catch (err) {
    throw new Error(`html-term sandbox error: ${(err as Error).message}`)
  }
}
