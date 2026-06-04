const express = require('express')
const axios = require('axios')
const supabase = require('../db/supabase')
const { requireAuth } = require('../middleware/auth')
const { notifyDisguise, sendDM } = require('../discord-bot')
const { discordLimiter } = require('../middleware/rateLimit')
const { validateDiscordId } = require('../middleware/validate')
const router = express.Router()

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || '1510972013416808518'
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET
const DISCORD_REDIRECT = process.env.DISCORD_REDIRECT_URI || 'https://inuhzao-production.up.railway.app/discord/callback'

// ── GET /discord/connect ───────────────────────────
// Inicia OAuth Discord
router.get('/connect', requireAuth, (req, res) => {
  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: DISCORD_REDIRECT,
    response_type: 'code',
    scope: 'identify',
    state: req.session.user.id
  })
  res.redirect(`https://discord.com/oauth2/authorize?${params}`)
})

// ── GET /discord/callback ──────────────────────────
// Discord redireciona aqui após autorização
router.get('/callback', async (req, res) => {
  const { code, state } = req.query
  if (!code) return res.redirect(`${process.env.FRONTEND_URL}?discord=error`)

  try {
    // Trocar code por token
    const tokenRes = await axios.post('https://discord.com/api/oauth2/token',
      new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: DISCORD_REDIRECT
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    )

    const { access_token } = tokenRes.data

    // Buscar dados do utilizador Discord
    const userRes = await axios.get('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${access_token}` }
    })

    const discordUser = userRes.data

    // Guardar Discord ID na BD associado ao utilizador (state = user_id)
    await supabase
      .from('users')
      .update({ discord_id: discordUser.id })
      .eq('id', state)

    res.redirect(`${process.env.FRONTEND_URL}?discord=success&discord_tag=${encodeURIComponent(discordUser.username)}`)

  } catch (err) {
    console.error('Discord OAuth error:', err.message)
    res.redirect(`${process.env.FRONTEND_URL}?discord=error`)
  }
})

// ── POST /discord/test ─────────────────────────────
router.post('/test', discordLimiter, requireAuth, async (req, res) => {
  const { data: user } = await supabase
    .from('users')
    .select('discord_id')
    .eq('id', req.session.user.id)
    .single()

  if (!user?.discord_id) {
    return res.status(400).json({ error: 'Liga primeiro a tua conta Discord.' })
  }

  const { EmbedBuilder } = require('discord.js')
  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle('✅ Notificações activas!')
    .setDescription('O bot vai avisar-te quando os teus disfarces estiverem a expirar.')
    .setFooter({ text: 'INUHZAO Platform' })

  const ok = await sendDM(user.discord_id, embed)
  if (ok) res.json({ ok: true })
  else res.status(500).json({ error: 'Não foi possível enviar DM. Verifica as definições de privacidade no Discord.' })
})

// ── GET /discord/status ────────────────────────────
router.get('/status', requireAuth, async (req, res) => {
  const { data: user } = await supabase
    .from('users')
    .select('discord_id')
    .eq('id', req.session.user.id)
    .single()
  res.json({ connected: !!user?.discord_id, discord_id: user?.discord_id || null })
})

// ── POST /discord/disconnect ───────────────────────
router.post('/disconnect', requireAuth, async (req, res) => {
  await supabase.from('users').update({ discord_id: null }).eq('id', req.session.user.id)
  res.json({ ok: true })
})

// ── POST /discord/notify-disguise ─────────────────
router.post('/notify-disguise', async (req, res) => {
  const { user_id, disguise_name, remaining_secs, zone } = req.body
  const { data: user } = await supabase
    .from('users')
    .select('discord_id')
    .eq('id', user_id)
    .single()

  if (!user?.discord_id) return res.json({ ok: false, reason: 'no_discord_id' })
  const ok = await notifyDisguise(user.discord_id, disguise_name, remaining_secs, zone)
  res.json({ ok })
})

module.exports = router
