// ── requireAuth ────────────────────────────────────
// Verifica que o utilizador tem sessão activa
function requireAuth(req, res, next) {
  if (!req.session?.user) {
    return res.status(401).json({ error: 'Não autenticado. Faz login com Twitch.' })
  }
  next()
}

// ── requireAdmin ───────────────────────────────────
// Verifica que o utilizador é admin (username na lista ADMIN_USERS)
function requireAdmin(req, res, next) {
  if (!req.session?.user) {
    return res.status(401).json({ error: 'Não autenticado.' })
  }
  const admins = (process.env.ADMIN_USERS || '').split(',').map(a => a.trim().toLowerCase())
  if (!admins.includes(req.session.user.username?.toLowerCase())) {
    return res.status(403).json({ error: 'Acesso negado. Apenas admins.' })
  }
  next()
}

module.exports = { requireAuth, requireAdmin }
