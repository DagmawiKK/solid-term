let sucraseReady = false
let sucraseError: Error | null = null
let babelTransform: ((code: string, options: any) => { code: string }) | null = null
let babelReady = false
let babelError: Error | null = null

warmupSucrase().catch(() => {})

async function warmupSucrase(): Promise<void> {
  try {
    await import('sucrase')
    sucraseReady = true
  } catch (err) {
    sucraseError = err as Error
  }
}

async function warmupBabel(): Promise<void> {
  try {
    const babel = await import('@babel/core')
    const solidPreset = await import('babel-preset-solid')

    babelTransform = (code: string, opts: any) => {
      const result = babel.transformSync(code, opts)
      if (!result?.code) throw new Error('Babel produced no output')
      return { code: result.code }
    }

    babelReady = true
  } catch (err) {
    babelError = err as Error
  }
}

export async function compileJSX(source: string): Promise<string> {
  if (!sucraseReady) {
    await warmupSucrase()
  }

  if (sucraseReady) {
    try {
      const { transform } = await import('sucrase')
      const result = transform(source, {
        transforms: ['jsx'],
        jsxImportSource: 'solid-js',
      })
      return result.code
    } catch (err) {
      if (babelReady || (babelError === null && !babelReady)) {
      } else {
        throw err
      }
    }
  }

  if (!babelReady) {
    await warmupBabel()
  }

  if (babelReady) {
    const result = babelTransform!(source, {
      presets: [
        ['babel-preset-solid', {
          moduleName: 'solid-js',
          generate: 'universal',
        }]
      ],
      filename: 'widget.tsx',
      configFile: false,
      babelrc: false,
    })
    return result.code
  }

  throw new Error(
    'JSX compilation failed. Sucrase is required (installed by default). ' +
    'Babel can be optionally installed as a fallback. ' +
    `Sucrase error: ${sucraseError?.message || 'not available'}. ` +
    `Babel error: ${babelError?.message || 'not installed'}.`
  )
}
