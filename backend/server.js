require('dotenv').config()
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const session = require('express-session')

const app = express()

// ── MIDDLEWARE ─────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }))

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
app.use(express.json({ limit: '5mb' }))
app.use(express.urlencoded({ extended: true }))

// ── SESSÃO (memória — simples e fiável) ────────────
app.set('trust proxy', 1)

app.use(session({
  secret: process.env.SESSION_SECRET || 'inuhzao_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    sameSite: 'none'
  }
}))

// ── DISCORD BOT ────────────────────────────────────
require('./discord-bot') // inicializar bot

// ── ROUTES ─────────────────────────────────────────
app.use('/auth',     require('./routes/auth'))
app.use('/discord',  require('./routes/discord-notify'))
app.use('/points',   require('./routes/points'))
app.use('/shop',     require('./routes/shop'))
app.use('/coupons',  require('./routes/coupons'))
app.use('/giveaway', require('./routes/giveaway'))
app.use('/game',     require('./routes/game'))
app.use('/admin',    require('./routes/admin'))

// ── HEALTH ─────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', env: process.env.NODE_ENV, time: new Date().toISOString() })
})

app.use((req, res) => res.status(404).json({ error: 'Rota nao encontrada.' }))

app.use((err, req, res, next) => {
  console.error(err.message)
  res.status(500).json({ error: 'Erro interno.' })
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`INUHZAO Backend porta ${PORT}`))
