const express = require('express')
const supabase = require('../db/supabase')
const { requireAuth, requireAdmin } = require('../middleware/auth')
const router = express.Router()

// ── GET /shop ──────────────────────────────────────
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('shop_items')
    .select('*')
    .eq('active', true)
    .order('created_at', { ascending: true })

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// ── POST /shop/redeem ──────────────────────────────
router.post('/redeem', requireAuth, async (req, res) => {
  const { item_id } = req.body
  const userId = req.session.user.id

  // 1. Buscar item
  const { data: item, error: itemErr } = await supabase
    .from('shop_items')
    .select('*')
    .eq('id', item_id)
    .eq('active', true)
    .single()

  if (itemErr || !item) return res.status(404).json({ error: 'Item não encontrado.' })
  if (item.stock <= 0) return res.status(400).json({ error: 'Item sem stock.' })

  // 2. Verificar pontos do utilizador
  const { data: user } = await supabase
    .from('users')
    .select('points, spent_points')
    .eq('id', userId)
    .single()

  if (!user || user.points < item.price) {
    return res.status(400).json({ error: 'Pontos insuficientes.' })
  }

  // 3. Transação: debitar pontos + reduzir stock + criar redemption
  const [ptUpdate, stockUpdate, redemption] = await Promise.all([
    supabase.from('users').update({
      points: user.points - item.price,
      spent_points: (user.spent_points || 0) + item.price
    }).eq('id', userId),

    supabase.from('shop_items').update({
      stock: item.stock - 1
    }).eq('id', item_id),

    supabase.from('redemptions').insert({
      user_id: userId,
      item_id: item.id,
      item_name: item.name,
      item_image: item.image_url,
      price: item.price,
      status: 'pending'
    }).select().single()
  ])

  if (ptUpdate.error || stockUpdate.error || redemption.error) {
    return res.status(500).json({ error: 'Erro ao processar resgate.' })
  }

  res.json({ ok: true, redemption: redemption.data })
})

// ── GET /shop/redemptions ──────────────────────────
// Admin: todos os resgates
router.get('/redemptions', requireAdmin, async (req, res) => {
  const { status } = req.query
  let query = supabase
    .from('redemptions')
    .select('*, users(username, display_name, avatar_url)')
    .order('created_at', { ascending: false })

  if (status && status !== 'all') query = query.eq('status', status)

  const { data, error } = await query
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// ── PATCH /shop/redemptions/:id ────────────────────
// Admin: actualizar status de resgate
router.patch('/redemptions/:id', requireAdmin, async (req, res) => {
  const { id } = req.params
  const { status, note } = req.body

  if (!['pending', 'delivered', 'refunded'].includes(status)) {
    return res.status(400).json({ error: 'Status inválido.' })
  }

  // Se refund, devolver pontos
  if (status === 'refunded') {
    const { data: red } = await supabase
      .from('redemptions')
      .select('*, users(points, spent_points)')
      .eq('id', id)
      .single()

    if (red && red.status !== 'refunded') {
      await supabase.from('users').update({
        points: (red.users.points || 0) + red.price,
        spent_points: Math.max(0, (red.users.spent_points || 0) - red.price)
      }).eq('id', red.user_id)

      // Repor stock
      await supabase.rpc('increment_stock', { p_item_id: red.item_id })
    }
  }

  const { data, error } = await supabase
    .from('redemptions')
    .update({ status, note: note || null })
    .eq('id', id)
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// ── POST /shop/items ───────────────────────────────
// Admin: criar item
router.post('/items', requireAdmin, async (req, res) => {
  const { name, description, price, stock, image_url } = req.body
  if (!name || !price) return res.status(400).json({ error: 'Nome e preço obrigatórios.' })

  const { data, error } = await supabase
    .from('shop_items')
    .insert({ name, description, price, stock: stock || 0, image_url })
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// ── PATCH /shop/items/:id ──────────────────────────
// Admin: actualizar item (stock, etc)
router.patch('/items/:id', requireAdmin, async (req, res) => {
  const { id } = req.params
  const updates = req.body

  const { data, error } = await supabase
    .from('shop_items')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// ── DELETE /shop/items/:id ─────────────────────────
router.delete('/items/:id', requireAdmin, async (req, res) => {
  const { error } = await supabase
    .from('shop_items')
    .update({ active: false })
    .eq('id', req.params.id)

  if (error) return res.status(500).json({ error: error.message })
  res.json({ ok: true })
})

module.exports = router
