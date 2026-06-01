const express = require('express')
const axios = require('axios')
const supabase = require('../db/supabase')
const { requireAuth } = require('../middleware/auth')
const { validatePoints } = require('../middleware/validate')
const router = express.Router()

const SE_API = 'https://api.streamelements.com/kappa/v2'

// ── GET /points/me ─────────────────────────────────
// Pontos do utilizador actual via StreamElements
router.get('/me', requireAuth, async (req, res) => {
  try {
    const { username } = req.session.user
    const channelId = process.env.SE_ACCOUNT_ID

    const seRes = await axios.get(
      `${SE_API}/points/${channelId}/${username}`,
      { headers: { Authorization: `Bearer ${process.env.SE_JWT}` } }
    )

    const points = seRes.data.points || 0
    const watchtime = seRes.data.watchtime || 0
    const rank = seRes.data.rank || null

    // Sincronizar com a nossa BD
    await supabase
      .from('users')
      .update({ points, watchtime_mins: watchtime })
      .eq('id', req.session.user.id)

    res.json({ points, watchtime, rank })

  } catch (err) {
    // SE pode não ter o utilizador ainda — devolver 0
    res.json({ points: 0, watchtime: 0, rank: null })
  }
})

// ── GET /points/leaderboard ────────────────────────
router.get('/leaderboard', async (req, res) => {
  try {
    const channelId = process.env.SE_ACCOUNT_ID
    const seRes = await axios.get(
      `${SE_API}/points/${channelId}/top?limit=10`,
      { headers: { Authorization: `Bearer ${process.env.SE_JWT}` } }
    )
    res.json(seRes.data.users || [])
  } catch (err) {
    // Fallback: leaderboard da nossa BD
    const { data } = await supabase
      .from('users')
      .select('username, display_name, avatar_url, points')
      .order('points', { ascending: false })
      .limit(10)
    res.json(data || [])
  }
})

// ── POST /points/add ───────────────────────────────
// Admin: adicionar pontos (via SE API)
router.post('/add', requireAuth, validatePoints, async (req, res) => {
  const admins = (process.env.ADMIN_USERS || '').split(',').map(a => a.trim().toLowerCase())
  if (!admins.includes(req.session.user.username?.toLowerCase())) {
    return res.status(403).json({ error: 'Apenas admins.' })
  }

  const { username, amount } = req.body
  if (!username || !amount || amount <= 0) {
    return res.status(400).json({ error: 'Username e amount obrigatórios.' })
  }

  try {
    const channelId = process.env.SE_ACCOUNT_ID
    await axios.put(
      `${SE_API}/points/${channelId}/${username}/${amount}`,
      {},
      { headers: { Authorization: `Bearer ${process.env.SE_JWT}` } }
    )

    // Actualizar na nossa BD também
    await supabase.rpc('increment_points', { p_username: username, p_amount: amount })

    res.json({ ok: true, message: `${amount} pontos adicionados a ${username}` })
  } catch (err) {
    res.status(500).json({ error: 'Erro ao adicionar pontos via StreamElements.' })
  }
})

module.exports = router
