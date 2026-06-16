import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const VIRTUAL_GOOGLE = '\0virtual:google-client-id'

/**
 * Read KEY=value from a .env file (no dependency on dotenv).
 * Used so one Web Client ID can live in Backend/.env as GOOGLE_CLIENT_ID when VITE_GOOGLE_CLIENT_ID is empty.
 */
function readDotEnvKey(filePath, key) {
  try {
    let text = fs.readFileSync(filePath, 'utf8')
    if (text.charCodeAt(0) === 0xfeff) {
      text = text.slice(1)
    }
    for (const line of text.split(/\r?\n/)) {
      const s = line.trim()
      if (!s || s.startsWith('#')) continue
      const i = s.indexOf('=')
      if (i === -1) continue
      const k = s.slice(0, i).trim()
      if (k !== key) continue
      let v = s.slice(i + 1).trim()
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1)
      }
      return v
    }
  } catch {
    // missing or unreadable file
  }
  return ''
}

function backendEnvCandidates() {
  const out = []
  const envPath = process.env.SPECIAL_LEARNER_BACKEND_ENV?.trim()
  if (envPath) {
    out.push(path.resolve(envPath))
  }
  out.push(path.resolve(__dirname, '../../Backend/.env'))
  out.push(path.resolve(__dirname, '../../backend/.env'))
  return out
}

function resolveGoogleClientId(mode) {
  const fromVite = loadEnv(mode, __dirname, 'VITE_').VITE_GOOGLE_CLIENT_ID?.trim() ?? ''
  if (fromVite) {
    return fromVite
  }
  for (const p of backendEnvCandidates()) {
    const v = readDotEnvKey(p, 'GOOGLE_CLIENT_ID').trim()
    if (v) {
      return v
    }
  }
  return (
    process.env.VITE_GOOGLE_CLIENT_ID?.trim() ||
    process.env.GOOGLE_CLIENT_ID?.trim() ||
    ''
  )
}

function googleClientIdVirtualModule(clientId) {
  return {
    name: 'google-client-id-virtual',
    resolveId(id) {
      if (id === 'virtual:google-client-id') {
        return VIRTUAL_GOOGLE
      }
    },
    load(id) {
      if (id === VIRTUAL_GOOGLE) {
        return `export const GOOGLE_CLIENT_ID = ${JSON.stringify(clientId)};\n`
      }
    },
  }
}

export default defineConfig(({ mode }) => {
  const googleClientId = resolveGoogleClientId(mode)

  return {
    plugins: [react(), googleClientIdVirtualModule(googleClientId)],
    server: {
      host: process.env.VITE_DEV_HOST === 'true',
      port: 5175,
    },
  }
})
