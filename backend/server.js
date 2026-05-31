require('dotenv').config()
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const session = require('express-session')
const ConnectPgSimple = require('connect-pg-simple')

const app = express()
const PgSession = ConnectPgSimple(session)

// ── MIDDLEWARE ─────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false // frontend faz requests ao backend
}))

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
}))

app.use(express.json({ limit: '5mb' }))
app.use(express.urlencoded({ extended: true }))

// ── SESSÃO (PostgreSQL) ────────────────────────────
app.use(session({
  store: new PgSession({
    conString: process.env.DATABASE_URL,
    tableName: 'session',
    createTableIfMissing: true
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  }
}))

// ── ROUTES ─────────────────────────────────────────
app.use('/auth',    require('./routes/auth'))
app.use('/points',  require('./routes/points'))
app.use('/shop',    require('./routes/shop'))
app.use('/coupons', require('./routes/coupons'))
app.use('/giveaway',require('./routes/giveaway'))
app.use('/game',    require('./routes/game'))
app.use('/admin',   require('./routes/admin'))

// ── HEALTH CHECK ───────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', env: process.env.NODE_ENV, time: new Date().toISOString() })
})

// ── 404 ────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada.' })
})

// ── ERROR HANDLER ──────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Erro interno do servidor.' })
})

// ── START ──────────────────────────────────────────
const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`✅ INUHZAO Backend a correr na porta ${PORT}`)
  console.log(`   ENV: ${process.env.NODE_ENV}`)
  console.log(`   Frontend: ${process.env.FRONTEND_URL}`)
})
