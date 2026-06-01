const express = require('express')
const supabase = require('../db/supabase')
const { requireAuth } = require('../middleware/auth')
const router = express.Router()

// ══════════════════════════════════════════
// TIMERS
// ══════════════════════════════════════════

router.get('/timers', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('timers')
    .select('*')
    .eq('user_id', req.session.user.id)
    .order('created_at')
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

router.post('/timers', requireAuth, async (req, res) => {
  const { name, total_secs } = req.body
  if (!name || !total_secs) return res.status(400).json({ error: 'Nome e duração obrigatórios.' })
  const { data, error } = await supabase
    .from('timers')
    .insert({ user_id: req.session.user.id, name, total_secs, running: false })
    .select().single()
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

router.patch('/timers/:id', requireAuth, async (req, res) => {
  const { started_at, running } = req.body
  const { data, error } = await supabase
    .from('timers')
    .update({ started_at, running })
    .eq('id', req.params.id)
    .eq('user_id', req.session.user.id)
    .select().single()
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

router.delete('/timers/:id', requireAuth, async (req, res) => {
  await supabase.from('timers').delete()
    .eq('id', req.params.id).eq('user_id', req.session.user.id)
  res.json({ ok: true })
})

// ══════════════════════════════════════════
// HIDRA LOG
// ══════════════════════════════════════════

router.get('/hidra', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('hidra_log')
    .select('*')
    .eq('user_id', req.session.user.id)
    .order('created_at', { ascending: false })
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

router.post('/hidra', requireAuth, async (req, res) => {
  const { cofres, yang_por_cofre, notas } = req.body
  if (!cofres || !yang_por_cofre) return res.status(400).json({ error: 'Cofres e yang obrigatórios.' })
  const { data, error } = await supabase
    .from('hidra_log')
    .insert({
      user_id: req.session.user.id,
      cofres,
      yang_por_cofre,
      yang_total: cofres * yang_por_cofre,
      notas: notas || null
    }).select().single()
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

router.delete('/hidra', requireAuth, async (req, res) => {
  await supabase.from('hidra_log').delete().eq('user_id', req.session.user.id)
  res.json({ ok: true })
})

// ══════════════════════════════════════════
// DISGUISES
// ══════════════════════════════════════════

router.get('/disguises', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('disguises')
    .select('*')
    .eq('user_id', req.session.user.id)
    .order('created_at')
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

router.post('/disguises', requireAuth, async (req, res) => {
  const { name, total_secs } = req.body
  if (!name || !total_secs) return res.status(400).json({ error: 'Nome e duração obrigatórios.' })
  const { image_url } = req.body
  const { data, error } = await supabase
    .from('disguises')
    .insert({
      user_id: req.session.user.id,
      name,
      total_secs,
      image_url: image_url || null,
      started_at: new Date().toISOString()
    }).select().single()
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

router.patch('/disguises/:id/renew', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('disguises')
    .update({ started_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .eq('user_id', req.session.user.id)
    .select().single()
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

router.delete('/disguises/:id', requireAuth, async (req, res) => {
  await supabase.from('disguises').delete()
    .eq('id', req.params.id).eq('user_id', req.session.user.id)
  res.json({ ok: true })
})

module.exports = router
