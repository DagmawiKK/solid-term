import readline from 'readline'

export function initTerminal(): void {
  readline.emitKeypressEvents(process.stdin)

  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true)
  }

  process.stdout.write('\x1B[?25l')

  process.stdout.write('\x1B[2J\x1B[H')
}

export function cleanupTerminal(): void {
  process.stdout.write('\x1B[?25h')

  process.stdout.write('\x1B[?1000l\x1B[?1002l\x1B[?1006l')

  process.stdout.write('\x1B[0m')

  if (process.stdin.isTTY) {
    try {
      process.stdin.setRawMode(false)
    } catch {}
  }
}

export function registerCleanupHandlers(cleanup: () => void): void {
  let cleaned = false
  const doCleanup = () => {
    if (cleaned) return
    cleaned = true
    cleanup()
  }

  process.on('SIGINT', doCleanup)
  process.on('SIGTERM', doCleanup)
  process.on('uncaughtException', (err) => {
    cleanup()
    console.error('\nUncaught exception:', err)
    process.exit(1)
  })
}
