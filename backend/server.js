require('dotenv').config()
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const session = require('express-session')
const SupabaseSessionStore = require('./session-store')
const { generalLimiter, authLimiter } = require('./middleware/rateLimit')

const app = express()

// ── SECURITY HEADERS ───────────────────────────────
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }))

// ── CORS ───────────────────────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'https://inuhzao-site.vercel.app'
].filter(Boolean)

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true)
    if (allowedOrigins.includes(origin)) return callback(null, true)
    if (origin.includes('inuhzao') && origin.includes('vercel.app')) return callback(null, true)
    callback(new Error('CORS blocked: ' + origin))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))

app.options('*', cors())
app.use(generalLimiter)
app.use(express.json({ limit: '2mb' }))
app.use(express.urlencoded({ extended: true, limit: '2mb' }))

// ── SESSÃO (Supabase REST — persiste entre deploys) ─
app.set('trust proxy', 1)

app.use(session({
  store: new SupabaseSessionStore(),
  secret: process.env.SESSION_SECRET || 'inuhzao_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,
    httpOnly: true,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 dias
    sameSite: 'none'
  }
}))

// ── DISCORD BOT + SCHEDULER ────────────────────────
require('./discord-bot')
const { startScheduler } = require('./scheduler')
startScheduler()

// ── ROUTES ─────────────────────────────────────────
app.use('/auth',     authLimiter, require('./routes/auth'))
app.use('/points',   require('./routes/points'))
app.use('/shop',     require('./routes/shop'))
app.use('/coupons',  require('./routes/coupons'))
app.use('/giveaway', require('./routes/giveaway'))
app.use('/game',     require('./routes/game'))
app.use('/admin',    require('./routes/admin'))
app.use('/discord',  require('./routes/discord-notify'))

// ── HEALTH ─────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', env: process.env.NODE_ENV, time: new Date().toISOString() })
})

app.use((req, res) => res.status(404).json({ error: 'Rota não encontrada.' }))

app.use((err, req, res, next) => {
  console.error(err.message)
  if (err.message?.includes('CORS')) return res.status(403).json({ error: 'Acesso negado.' })
  res.status(500).json({ error: 'Erro interno.' })
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`INUHZAO Backend porta ${PORT}`))
