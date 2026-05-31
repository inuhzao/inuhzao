const express = require('express')
const axios = require('axios')
const supabase = require('../db/supabase')
const { requireAuth, requireAdmin } = require('../middleware/auth')
const router = express.Router()

const SE_API = 'https://api.streamelements.com/kappa/v2'

// ── POST /coupons/redeem ───────────────────────────
router.post('/redeem', requireAuth, async (req, res) => {
  const { code } = req.body
  if (!code) return res.status(400).json({ error: 'Código obrigatório.' })

  // 1. Buscar cupão
  const { data: coupon, error } = await supabase
    .from('coupons')
    .select('*')
    .eq('code', code.toUpperCase().trim())
    .single()

  if (error || !coupon) return res.status(404).json({ error: 'Cupão não encontrado.' })
  if (coupon.used_by) return res.status(400).json({ error: 'Cupão já utilizado.' })

  const userId = req.session.user.id
  const username = req.session.user.username
  const channelId = process.env.SE_ACCOUNT_ID

  // 2. Adicionar pontos no StreamElements
  try {
    await axios.put(
      `${SE_API}/points/${channelId}/${username}/${coupon.points}`,
      {},
      { headers: { Authorization: `Bearer ${process.env.SE_JWT}` } }
    )
  } catch (seErr) {
    console.error('SE points error:', seErr?.response?.data || seErr.message)
    // Se o utilizador não existe no SE, tenta criar primeiro
    try {
      await axios.put(
        `${SE_API}/points/${channelId}/${username}/${coupon.points}`,
        {},
        { headers: { Authorization: `Bearer ${process.env.SE_JWT}` } }
      )
    } catch (e) {
      return res.status(500).json({ error: 'Erro ao adicionar pontos no StreamElements.' })
    }
  }

  // 3. Marcar cupão como usado
  await supabase.from('coupons').update({
    used_by: userId,
    used_at: new Date().toISOString()
  }).eq('id', coupon.id)

  // 4. Actualizar pontos na nossa BD também (para referência)
  const { data: user } = await supabase
    .from('users')
    .select('points, total_points')
    .eq('id', userId)
    .single()

  if (user) {
    await supabase.from('users').update({
      points: (user.points || 0) + coupon.points,
      total_points: (user.total_points || 0) + coupon.points
    }).eq('id', userId)
  }

  res.json({ ok: true, points: coupon.points, message: `+${coupon.points} pontos adicionados no StreamElements!` })
})

// ── GET /coupons ───────────────────────────────────
router.get('/', requireAdmin, async (req, res) => {
  const { data, error } = await supabase
    .from('coupons')
    .select('*, used_by_user:used_by(username)')
    .order('created_at', { ascending: false })

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// ── POST /coupons ──────────────────────────────────
router.post('/', requireAdmin, async (req, res) => {
  const { code, points, description } = req.body
  if (!code || !points) return res.status(400).json({ error: 'Código e pontos obrigatórios.' })

  const { data, error } = await supabase
    .from('coupons')
    .insert({ code: code.toUpperCase().trim(), points, description })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') return res.status(400).json({ error: 'Código já existe.' })
    return res.status(500).json({ error: error.message })
  }
  res.json(data)
})

// ── DELETE /coupons/:id ────────────────────────────
router.delete('/:id', requireAdmin, async (req, res) => {
  const { error } = await supabase
    .from('coupons')
    .delete()
    .eq('id', req.params.id)

  if (error) return res.status(500).json({ error: error.message })
  res.json({ ok: true })
})

module.exports = router
