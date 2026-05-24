export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

export function validateModelCompliance(source: string): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (/^\s*import\s+/m.test(source)) {
    errors.push('Source contains import statements. All APIs are injected; imports are not allowed.')
  }

  if (/\bdocument\b|\bwindow\b|\blocal[Ss]torage\b/.test(source)) {
    errors.push('Source references document, window, or localStorage. There is no DOM.')
  }

  const hasNamedComponent = /function\s+(Widget|App|Component)\s*\(/.test(source)
  const hasConstComponent = /(const|let)\s+(Widget|App|Component)\s*=\s*(async\s*)?\(.*\)\s*=>/.test(source)

  if (!hasNamedComponent && !hasConstComponent) {
    errors.push('Source must define a top-level function named Widget, App, or Component. Anonymous functions are not supported.')
  }

  const openTags = (source.match(/<[A-Z][a-zA-Z0-9]*/g) || []).length
  const closeTags = (source.match(/<\/[A-Z][a-zA-Z0-9]*>/g) || []).length
  const selfClosingTags = (source.match(/<[A-Z][a-zA-Z0-9]*\s[^>]*\/>/g) || []).length

  if (openTags > closeTags + selfClosingTags + 2) {
    warnings.push('Source may have unbalanced JSX tags. Double-check the component structure.')
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}
