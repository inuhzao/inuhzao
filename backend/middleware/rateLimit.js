const rateLimit = require('express-rate-limit')

// ── Rate limiters ──────────────────────────────────

// Geral — 100 requests por minuto por IP
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados pedidos. Tenta novamente em 1 minuto.' }
})

// Auth — 10 tentativas por 15 minutos
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Demasiadas tentativas de login. Tenta novamente em 15 minutos.' }
})

// Cupões — 5 resgates por hora
const couponLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: 'Demasiados resgates de cupões. Tenta novamente em 1 hora.' }
})

// Loja — 10 resgates por hora
const shopLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { error: 'Demasiados resgates na loja. Tenta novamente em 1 hora.' }
})

// Giveaway — 20 entradas por hora
const giveawayLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: { error: 'Demasiadas entradas no giveaway. Tenta novamente em 1 hora.' }
})

// Discord test — 3 testes por hora
const discordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { error: 'Demasiados testes Discord. Tenta novamente em 1 hora.' }
})

module.exports = { generalLimiter, authLimiter, couponLimiter, shopLimiter, giveawayLimiter, discordLimiter }
