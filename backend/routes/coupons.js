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

  const { data: coupon, error } = await supabase
    .from('coupons')
    .select('*')
    .eq('code', code.toUpperCase().trim())
    .single()

  if (error || !coupon) return res.status(404).json({ error: 'Cupão não encontrado.' })

  const maxUses = coupon.max_uses || 1
  const useCount = coupon.use_count || 0

  if (useCount >= maxUses) {
    return res.status(400).json({ error: maxUses === 1 ? 'Cupão já utilizado.' : 'Cupão esgotado.' })
  }

  const userId = req.session.user.id
  const username = req.session.user.username

  // Adicionar pontos no StreamElements
  try {
    await axios.put(
      `${SE_API}/points/${process.env.SE_ACCOUNT_ID}/${username}/${coupon.points}`,
      {},
      { headers: { Authorization: `Bearer ${process.env.SE_JWT}` } }
    )
  } catch (seErr) {
    return res.status(500).json({ error: 'Erro ao adicionar pontos no StreamElements.' })
  }

  // Actualizar uso do cupão
  const newCount = useCount + 1
  const updateData = {
    use_count: newCount,
    used_at: new Date().toISOString()
  }
  // Para compatibilidade: marcar used_by no primeiro uso
  if (newCount === 1) updateData.used_by = userId

  await supabase.from('coupons').update(updateData).eq('id', coupon.id)

  res.json({ ok: true, points: coupon.points, message: `+${coupon.points} pontos adicionados!` })
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
  const { code, points, description, max_uses } = req.body
  if (!code || !points) return res.status(400).json({ error: 'Código e pontos obrigatórios.' })

  const { data, error } = await supabase
    .from('coupons')
    .insert({
      code: code.toUpperCase().trim(),
      points,
      description,
      max_uses: max_uses || 1,
      use_count: 0
    })
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
  const { error } = await supabase.from('coupons').delete().eq('id', req.params.id)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ ok: true })
})

module.exports = router
