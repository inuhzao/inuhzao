const express = require('express')
const supabase = require('../db/supabase')
const { requireAdmin } = require('../middleware/auth')
const router = express.Router()

// ── GET /admin/users ───────────────────────────────
router.get('/users', requireAdmin, async (req, res) => {
  const { data, error } = await supabase
    .from('users')
    .select('id, username, display_name, avatar_url, points, total_points, spent_points, is_admin, created_at')
    .order('total_points', { ascending: false })
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// ── GET /admin/stats ───────────────────────────────
router.get('/stats', requireAdmin, async (req, res) => {
  const [users, redemptions, coupons, giveaways] = await Promise.all([
    supabase.from('users').select('*', { count: 'exact', head: true }),
    supabase.from('redemptions').select('*', { count: 'exact', head: true }),
    supabase.from('coupons').select('*', { count: 'exact', head: true }).is('used_by', null),
    supabase.from('giveaways').select('*', { count: 'exact', head: true }).eq('active', true)
  ])

  res.json({
    total_users: users.count || 0,
    total_redemptions: redemptions.count || 0,
    active_coupons: coupons.count || 0,
    active_giveaways: giveaways.count || 0
  })
})

// ── PATCH /admin/users/:id ─────────────────────────
router.patch('/users/:id', requireAdmin, async (req, res) => {
  const { is_admin, points } = req.body
  const updates = {}
  if (typeof is_admin === 'boolean') updates.is_admin = is_admin
  if (typeof points === 'number') {
    updates.points = points
    updates.total_points = points
  }

  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', req.params.id)
    .select().single()

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// ── GET /admin/users/me ────────────────────────────
router.get('/users/me', async (req, res) => {
  if (!req.session?.user) return res.json({})
  const { data } = await supabase
    .from('users')
    .select('discord_id')
    .eq('id', req.session.user.id)
    .single()
  res.json(data || {})
})

module.exports = router
