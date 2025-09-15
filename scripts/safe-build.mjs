#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

const args = process.argv.slice(2)
const isDev = args.includes('--dev')
const timeoutArg = args.find(a => a.startsWith('--timeout='))
const timeoutMs = Number((timeoutArg?.split('=')[1])) || Number(process.env.SAFE_BUILD_TIMEOUT_MS) || (isDev ? 180000 : 300000)

const nextBin = resolve(__dirname, '../node_modules/next/dist/bin/next')
const cmdArgs = [nextBin, isDev ? 'dev' : 'build']

const child = spawn(process.execPath, cmdArgs, {
  stdio: 'inherit',
  env: {
    ...process.env,
    CI: process.env.CI ?? '1',
    NEXT_TELEMETRY_DISABLED: '1',
    DEBUG: process.env.DEBUG ?? 'next:*',
    NODE_OPTIONS: [process.env.NODE_OPTIONS, '--max-old-space-size=4096'].filter(Boolean).join(' '),
  },
})

const timer = setTimeout(() => {
  console.error(`\n[safe-build] Timeout of ${timeoutMs}ms reached. Killing Next ${isDev ? 'dev' : 'build'} process...`)
  try {
    child.kill('SIGTERM')
  } catch {}
  console.error('[safe-build] Tips:')
  console.error('- Ensure no long-running getStaticProps/getServerSideProps loops (App Router should avoid these).')
  console.error('- Check dynamic imports or top-level awaits that never resolve.')
  console.error('- Try running with DEBUG=next:* for more detail (already enabled).')
  console.error('- If SWC hangs, set NEXT_DISABLE_SWC_WASM=1 to force native binary.')
  process.exit(1)
}, timeoutMs)

child.on('exit', (code) => {
  clearTimeout(timer)
  process.exit(code ?? 0)
})

