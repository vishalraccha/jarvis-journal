import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

const DB_FILE = path.resolve(process.cwd(), 'data/jarvis_database.json')

function readDatabase() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8')
      return JSON.parse(content)
    }
  } catch (err) {
    console.error('Error reading DB_FILE:', err)
  }
  return { accounts: [], trades: [], instruments: [], tags: [], strategies: [], journals: [], routines: [] }
}

function writeDatabase(data: any) {
  try {
    fs.mkdirSync(path.dirname(DB_FILE), { recursive: true })
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8')
    return true
  } catch (err) {
    console.error('Error writing DB_FILE:', err)
    return false
  }
}

function generateRuleBasedAudit(prompt: string, metrics: any) {
  const m = metrics || {}
  const total = m.totalTrades || 0
  const winRate = m.winRate || 0
  const pf = m.profitFactor || 0
  const exp = m.expectancy || 0

  if (total === 0) {
    return `Jarvis Audit: No closed trades recorded yet. Log your first trades using "+ Add Trade" or import broker records to activate real-time mathematical edge analysis.`
  }

  const p = (prompt || '').toLowerCase()

  if (p.includes('consecutive') || p.includes('loss') || p.includes('losing')) {
    return `Quantitative Risk Audit:\n• Consecutive Loss Streak: ${m.consecutiveLosses || 0} trades\n• Average Loss: -$${Math.abs(m.averageLoss || 0).toFixed(2)}\n• Mathematical Expectancy: +$${exp.toFixed(2)} per trade\n\nPrescription: When enduring consecutive drawdowns, reduce position size by 50% until two consecutive winning trades are logged. Enforce a mandatory 30-minute cooling-off period after 2 consecutive stop-outs to avoid emotional tilt.`
  }

  if (p.includes('setup') || p.includes('strategy') || p.includes('perform')) {
    return `Strategy Expectancy Audit:\n• Current Win Rate: ${winRate.toFixed(1)}%\n• Profit Factor: ${pf.toFixed(2)}\n• Average Win vs Loss: +$${(m.averageWin || 0).toFixed(2)} / -$${Math.abs(m.averageLoss || 0).toFixed(2)}\n\nRecommendation: Focus exclusively on your defined playbook setups during peak volume hours (09:30 - 11:30 AM EST). Eliminate B-grade impulse trades entered outside of key support/resistance levels.`
  }

  if (p.includes('hours') || p.includes('sessions') || p.includes('time')) {
    return `Session & Timing Analysis:\n• Long Win Rate: ${(m.longWinRate || 0).toFixed(1)}% | Short Win Rate: ${(m.shortWinRate || 0).toFixed(1)}%\n• Prime Volume Window: Opening 90 minutes of the New York session\n\nInsight: Trades taken during high volatility sessions yield significantly higher R-multiples. Avoid taking new setups during the afternoon lunch chop.`
  }

  return `Jarvis Performance Evaluation:\n• Total Closed Trades: ${total}\n• Net P&L: $${(m.netPnl || 0).toFixed(2)}\n• Mathematical Expectancy: +$${exp.toFixed(2)} / trade\n• Win Rate: ${winRate.toFixed(1)}% | Profit Factor: ${pf.toFixed(2)}\n\nCore Rule: Protect your capital at all costs. Maintain strict 1R risk sizing to let your positive mathematical edge compound over every series of 20+ executions.`
}

function registerApiMiddlewares(server: any, env: any) {
  // 1. Jarvis Institutional AI Audit Endpoint
  server.middlewares.use('/api/ai/audit', async (req: any, res: any) => {
    if (req.method !== 'POST') {
      res.statusCode = 405
      res.end('Method Not Allowed')
      return
    }

    let body = ''
    req.on('data', (chunk: any) => { body += chunk })
    req.on('end', async () => {
      try {
        const { prompt, metrics, tradesSummary } = JSON.parse(body || '{}')
        const apiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY

        if (apiKey) {
          const systemPrompt = `You are JARVIS AI, an institutional quantitative trading coach and performance auditor.
Analyze the user's real trading metrics and closed trade history.
Be direct, mathematical, concise, and practical. Speak like a veteran hedge fund risk manager or senior prop desk trader.
Focus on: risk-to-reward ratio, trade expectancy, execution discipline, avoiding revenge trading, and emotional control.

User's Actual Trading Statistics:
${JSON.stringify(metrics, null, 2)}

Trades Overview:
${tradesSummary || 'No trade records logged yet.'}

User's Question / Prompt:
"${prompt}"`

          try {
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 6000)

            const geminiRes = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal,
                body: JSON.stringify({
                  contents: [{ parts: [{ text: systemPrompt }] }],
                }),
              }
            )
            clearTimeout(timeoutId)

            const data = await geminiRes.json()
            const geminiText = data?.candidates?.[0]?.content?.parts?.[0]?.text
            if (geminiText) {
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ text: geminiText, source: 'gemini-ai' }))
              return
            }
          } catch (fetchErr) {
            // Fall through to rule-based audit on timeout or error
          }
        }

        const fallbackText = generateRuleBasedAudit(prompt, metrics)
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ text: fallbackText, source: 'jarvis-edge-engine' }))
      } catch (err: any) {
        res.statusCode = 500
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: err.message }))
      }
    })
  })

  // 2. Persistent Database Storage Middleware
  server.middlewares.use('/api/db', async (req: any, res: any) => {
    const parts = (req.url || '').split('?')[0].split('/').filter(Boolean)
    const collection = parts[0] // e.g. accounts, trades, instruments, tags, strategies, journals, routines, routine_completions
    const id = parts[1]

    if (!collection) {
      res.statusCode = 400
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: 'Collection name is required' }))
      return
    }

    if (req.method === 'GET') {
      const db = readDatabase()
      const items = db[collection] || []
      if (id) {
        const single = items.find((it: any) => it.id === id) || null
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify(single))
        return
      }
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify(items))
      return
    }

    let body = ''
    req.on('data', (chunk: any) => { body += chunk })
    req.on('end', () => {
      try {
        const parsed = body ? JSON.parse(body) : {}
        const db = readDatabase()
        if (!db[collection]) db[collection] = []

        if (req.method === 'POST') {
          const item = parsed
          const existingIdx = db[collection].findIndex((it: any) => 
            (item.id && it.id === item.id) ||
            (collection === 'journals' && it.date === item.date && it.journal_type === item.journal_type) ||
            (collection === 'routine_completions' && it.item_id === item.item_id && it.date === item.date)
          )
          if (existingIdx !== -1) {
            db[collection][existingIdx] = { ...db[collection][existingIdx], ...item }
          } else {
            db[collection].push(item)
          }
          writeDatabase(db)
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ success: true, item }))
          return
        }

        if (req.method === 'PUT') {
          const targetId = id || parsed.id
          const existingIdx = db[collection].findIndex((it: any) => it.id === targetId)
          if (existingIdx !== -1) {
            db[collection][existingIdx] = { ...db[collection][existingIdx], ...parsed }
            writeDatabase(db)
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ success: true, item: db[collection][existingIdx] }))
            return
          }
          // If not found, add it
          db[collection].push({ id: targetId, ...parsed })
          writeDatabase(db)
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ success: true, item: { id: targetId, ...parsed } }))
          return
        }

        if (req.method === 'DELETE') {
          const targetId = id || parsed.id
          db[collection] = db[collection].filter((it: any) => it.id !== targetId)
          writeDatabase(db)
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ success: true }))
          return
        }

        res.statusCode = 405
        res.end('Method Not Allowed')
      } catch (err: any) {
        res.statusCode = 500
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: err.message }))
      }
    })
  })
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      {
        name: 'jarvis-api-endpoints',
        configureServer(server) {
          registerApiMiddlewares(server, env)
        },
        configurePreview(server) {
          registerApiMiddlewares(server, env)
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 3000,
      host: true,
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      chunkSizeWarningLimit: 1200,
    },
  }
})
