// ── Input validation helpers ───────────────────────

function sanitizeStr(str, maxLen = 200) {
  if (typeof str !== 'string') return ''
  return str.trim().slice(0, maxLen).replace(/<[^>]*>/g, '') // remove HTML tags
}

function validateInt(val, min = 0, max = 999999999) {
  const n = parseInt(val)
  if (isNaN(n)) return null
  if (n < min || n > max) return null
  return n
}

// ── Route validators ───────────────────────────────

function validateCouponRedeem(req, res, next) {
  const { code } = req.body
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Código inválido.' })
  }
  req.body.code = sanitizeStr(code, 30).toUpperCase()
  next()
}

function validateShopRedeem(req, res, next) {
  const { item_id } = req.body
  if (!item_id || typeof item_id !== 'string' || item_id.length > 40) {
    return res.status(400).json({ error: 'Item inválido.' })
  }
  next()
}

function validateGiveawayEnter(req, res, next) {
  const tickets = validateInt(req.body?.tickets, 1, 100)
  if (!tickets) req.body.tickets = 1
  else req.body.tickets = tickets
  next()
}

function validateCouponCreate(req, res, next) {
  const { code, points, description, max_uses } = req.body
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Código obrigatório.' })
  }
  const pts = validateInt(points, 1, 1000000)
  if (!pts) return res.status(400).json({ error: 'Pontos inválidos (1 - 1,000,000).' })
  const mu = validateInt(max_uses, 1, 1000)
  req.body.code = sanitizeStr(code, 30).toUpperCase()
  req.body.points = pts
  req.body.max_uses = mu || 1
  req.body.description = description ? sanitizeStr(description, 200) : ''
  next()
}

function validateShopItem(req, res, next) {
  const { name, price, stock, description } = req.body
  if (!name) return res.status(400).json({ error: 'Nome obrigatório.' })
  const p = validateInt(price, 1, 10000000)
  if (!p) return res.status(400).json({ error: 'Preço inválido (1 - 10,000,000).' })
  const s = validateInt(stock, 0, 10000)
  req.body.name = sanitizeStr(name, 100)
  req.body.price = p
  req.body.stock = s !== null ? s : 0
  req.body.description = description ? sanitizeStr(description, 300) : ''
  next()
}

function validateGiveawayCreate(req, res, next) {
  const { prize, cost } = req.body
  if (!prize) return res.status(400).json({ error: 'Prémio obrigatório.' })
  const c = validateInt(cost, 0, 10000000)
  req.body.prize = sanitizeStr(prize, 100)
  req.body.cost = c !== null ? c : 0
  req.body.description = req.body.description ? sanitizeStr(req.body.description, 300) : ''
  next()
}

function validateDiscordId(req, res, next) {
  const { discord_id } = req.body
  if (!discord_id || !/^\d{17,20}$/.test(discord_id)) {
    return res.status(400).json({ error: 'Discord ID inválido.' })
  }
  next()
}

function validatePoints(req, res, next) {
  const { username, amount } = req.body
  if (!username || typeof username !== 'string') {
    return res.status(400).json({ error: 'Username inválido.' })
  }
  const a = validateInt(amount, 1, 1000000)
  if (!a) return res.status(400).json({ error: 'Quantidade inválida (1 - 1,000,000).' })
  req.body.username = sanitizeStr(username, 50)
  req.body.amount = a
  next()
}

module.exports = {
  validateCouponRedeem, validateShopRedeem, validateGiveawayEnter,
  validateCouponCreate, validateShopItem, validateGiveawayCreate,
  validateDiscordId, validatePoints, sanitizeStr, validateInt
}
