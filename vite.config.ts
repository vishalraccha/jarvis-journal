import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

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

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      {
        name: 'jarvis-ai-server-endpoint',
        configureServer(server) {
          server.middlewares.use('/api/ai/audit', async (req, res) => {
            if (req.method !== 'POST') {
              res.statusCode = 405
              res.end('Method Not Allowed')
              return
            }

            let body = ''
            req.on('data', (chunk) => { body += chunk })
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

                // High-precision factual audit fallback based on user's actual data
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
