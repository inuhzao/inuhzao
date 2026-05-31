const express = require('express')
const supabase = require('../db/supabase')
const { requireAuth, requireAdmin } = require('../middleware/auth')
const router = express.Router()

// ── GET /giveaway/active ───────────────────────────
router.get('/active', async (req, res) => {
  const { data, error } = await supabase
    .from('giveaways')
    .select('*, giveaway_entries(count)')
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error) return res.json({ giveaway: null })

  // Contar participantes
  const { count } = await supabase
    .from('giveaway_entries')
    .select('*', { count: 'exact', head: true })
    .eq('giveaway_id', data.id)

  res.json({ giveaway: { ...data, participant_count: count || 0 } })
})

// ── GET /giveaway/:id/participants ─────────────────
router.get('/:id/participants', async (req, res) => {
  const { data, error } = await supabase
    .from('giveaway_entries')
    .select('users(username, display_name, avatar_url)')
    .eq('giveaway_id', req.params.id)
    .limit(20)

  if (error) return res.status(500).json({ error: error.message })
  res.json(data.map(e => e.users))
})

// ── POST /giveaway/:id/enter ───────────────────────
router.post('/:id/enter', requireAuth, async (req, res) => {
  const { id } = req.params
  const userId = req.session.user.id

  // Buscar giveaway
  const { data: gw } = await supabase
    .from('giveaways')
    .select('*')
    .eq('id', id)
    .eq('active', true)
    .single()

  if (!gw) return res.status(404).json({ error: 'Giveaway não encontrado.' })

  // Verificar se já entrou
  const { data: existing } = await supabase
    .from('giveaway_entries')
    .select('id')
    .eq('giveaway_id', id)
    .eq('user_id', userId)
    .single()

  if (existing) return res.status(400).json({ error: 'Já estás inscrito.' })

  // Verificar pontos
  if (gw.cost > 0) {
    const { data: user } = await supabase
      .from('users')
      .select('points')
      .eq('id', userId)
      .single()

    if (!user || user.points < gw.cost) {
      return res.status(400).json({ error: `Precisas de ${gw.cost} pontos.` })
    }

    await supabase.from('users').update({
      points: user.points - gw.cost
    }).eq('id', userId)
  }

  await supabase.from('giveaway_entries').insert({
    giveaway_id: id,
    user_id: userId
  })

  res.json({ ok: true })
})

// ── POST /giveaway ─────────────────────────────────
// Admin: criar giveaway
router.post('/', requireAdmin, async (req, res) => {
  const { prize, description, cost, image_url } = req.body
  if (!prize) return res.status(400).json({ error: 'Prémio obrigatório.' })

  // Fechar giveaways activos anteriores
  await supabase.from('giveaways').update({ active: false }).eq('active', true)

  const { data, error } = await supabase
    .from('giveaways')
    .insert({ prize, description, cost: cost || 0, active: true, image_url: image_url || null })
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// ── POST /giveaway/:id/draw ────────────────────────
// Admin: sortear vencedor
router.post('/:id/draw', requireAdmin, async (req, res) => {
  const { id } = req.params

  const { data: entries } = await supabase
    .from('giveaway_entries')
    .select('user_id, users(username, display_name)')
    .eq('giveaway_id', id)

  if (!entries?.length) return res.status(400).json({ error: 'Sem participantes.' })

  const winner = entries[Math.floor(Math.random() * entries.length)]

  await supabase.from('giveaways').update({
    winner_id: winner.user_id
  }).eq('id', id)

  res.json({ winner: winner.users })
})

// ── DELETE /giveaway/:id ───────────────────────────
// Admin: terminar giveaway
router.delete('/:id', requireAdmin, async (req, res) => {
  await supabase.from('giveaways').update({
    active: false,
    ended_at: new Date().toISOString()
  }).eq('id', req.params.id)

  res.json({ ok: true })
})

module.exports = router
