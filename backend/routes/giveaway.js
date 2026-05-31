const express = require('express')
const axios = require('axios')
const supabase = require('../db/supabase')
const { requireAuth, requireAdmin } = require('../middleware/auth')
const router = express.Router()

const SE_API = 'https://api.streamelements.com/kappa/v2'

async function getSEPoints(username) {
  try {
    const r = await axios.get(`${SE_API}/points/${process.env.SE_ACCOUNT_ID}/${username}`, {
      headers: { Authorization: `Bearer ${process.env.SE_JWT}` }
    })
    return r.data.points || 0
  } catch(e) { return 0 }
}

async function removeSEPoints(username, amount) {
  // SE API: PUT with negative value to subtract points
  const res = await axios.put(
    `${SE_API}/points/${process.env.SE_ACCOUNT_ID}/${username}/-${amount}`,
    {},
    { headers: { Authorization: `Bearer ${process.env.SE_JWT}` } }
  )
  return res.data
}

// ── GET /giveaway/active ───────────────────────────
router.get('/active', async (req, res) => {
  const { data, error } = await supabase
    .from('giveaways')
    .select('*')
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error) return res.json({ giveaway: null })

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

  if (error) return res.status(500).json({ error: error.message })
  res.json(data.map(e => e.users))
})

// ── POST /giveaway/:id/enter ───────────────────────
router.post('/:id/enter', requireAuth, async (req, res) => {
  const { id } = req.params
  const { tickets = 1 } = req.body
  const userId = req.session.user.id

  // Buscar giveaway
  const { data: gw } = await supabase
    .from('giveaways')
    .select('*')
    .eq('id', id)
    .eq('active', true)
    .single()

  if (!gw) return res.status(404).json({ error: 'Giveaway não encontrado.' })

  const maxTickets = gw.max_tickets || 5

  // Contar tickets actuais do utilizador
  const { count: myCount } = await supabase
    .from('giveaway_entries')
    .select('*', { count: 'exact', head: true })
    .eq('giveaway_id', id)
    .eq('user_id', userId)

  const currentTickets = myCount || 0
  const requestedTickets = Math.min(tickets, maxTickets - currentTickets)

  if (requestedTickets <= 0) {
    return res.status(400).json({ error: `Já atingiste o limite de ${maxTickets} tickets.` })
  }

  // Verificar e descontar pontos no StreamElements
  const totalCost = (gw.cost || 0) * requestedTickets
  if (totalCost > 0) {
    const username = req.session.user.username
    const sePoints = await getSEPoints(username)

    if (sePoints < totalCost) {
      return res.status(400).json({ error: `Precisas de ${totalCost} pontos para ${requestedTickets} ticket(s). Tens ${sePoints}.` })
    }

    try {
      await removeSEPoints(username, totalCost)
    } catch(e) {
      return res.status(500).json({ error: 'Erro ao descontar pontos no StreamElements.' })
    }
  }

  // Inserir tickets (cada ticket = 1 entrada na tabela)
  const entries = Array.from({ length: requestedTickets }, () => ({
    giveaway_id: id,
    user_id: userId
  }))

  // Remove unique constraint issue - use insert multiple
  for (const entry of entries) {
    await supabase.from('giveaway_entries').insert(entry)
  }

  res.json({ ok: true, tickets: requestedTickets, totalCost })
})

// ── POST /giveaway ─────────────────────────────────
router.post('/', requireAdmin, async (req, res) => {
  const { prize, description, cost, max_tickets, image_url } = req.body
  if (!prize) return res.status(400).json({ error: 'Prémio obrigatório.' })

  await supabase.from('giveaways').update({ active: false }).eq('active', true)

  const { data, error } = await supabase
    .from('giveaways')
    .insert({
      prize,
      description,
      cost: cost || 0,
      max_tickets: max_tickets || 5,
      active: true,
      image_url: image_url || null
    })
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// ── POST /giveaway/:id/draw ────────────────────────
router.post('/:id/draw', requireAdmin, async (req, res) => {
  const { id } = req.params

  const { data: entries } = await supabase
    .from('giveaway_entries')
    .select('user_id, users(username, display_name)')
    .eq('giveaway_id', id)

  if (!entries?.length) return res.status(400).json({ error: 'Sem participantes.' })

  // Cada entrada = 1 ticket = maior chance de ganhar
  const winner = entries[Math.floor(Math.random() * entries.length)]

  await supabase.from('giveaways').update({
    winner_id: winner.user_id
  }).eq('id', id)

  res.json({ winner: winner.users })
})

// ── DELETE /giveaway/:id ───────────────────────────
router.delete('/:id', requireAdmin, async (req, res) => {
  await supabase.from('giveaways').update({
    active: false,
    ended_at: new Date().toISOString()
  }).eq('id', req.params.id)

  res.json({ ok: true })
})

module.exports = router
