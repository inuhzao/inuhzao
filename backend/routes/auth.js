const express = require('express')
const axios = require('axios')
const supabase = require('../db/supabase')
const router = express.Router()

const TWITCH_AUTH_URL = 'https://id.twitch.tv/oauth2/authorize'
const TWITCH_TOKEN_URL = 'https://id.twitch.tv/oauth2/token'
const TWITCH_USERS_URL = 'https://api.twitch.tv/helix/users'

// ── GET /auth/login ────────────────────────────────
// Redireciona para Twitch OAuth
router.get('/login', (req, res) => {
  const params = new URLSearchParams({
    client_id: process.env.TWITCH_CLIENT_ID,
    redirect_uri: process.env.TWITCH_REDIRECT_URI,
    response_type: 'code',
    scope: 'user:read:email',
    state: Math.random().toString(36).substring(2)
  })
  res.redirect(`${TWITCH_AUTH_URL}?${params}`)
})

// ── GET /auth/callback ─────────────────────────────
// Twitch redireciona aqui após login
router.get('/callback', async (req, res) => {
  const { code, error } = req.query

  if (error || !code) {
    return res.redirect(`${process.env.FRONTEND_URL}?auth=error`)
  }

  try {
    // 1. Trocar code por access_token
    const tokenRes = await axios.post(TWITCH_TOKEN_URL, null, {
      params: {
        client_id: process.env.TWITCH_CLIENT_ID,
        client_secret: process.env.TWITCH_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: process.env.TWITCH_REDIRECT_URI
      }
    })
    const { access_token } = tokenRes.data

    // 2. Buscar dados do utilizador na Twitch
    const userRes = await axios.get(TWITCH_USERS_URL, {
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Client-Id': process.env.TWITCH_CLIENT_ID
      }
    })
    const twitchUser = userRes.data.data[0]

    // 3. Verificar se é admin
    const admins = (process.env.ADMIN_USERS || '').split(',').map(a => a.trim().toLowerCase())
    const isAdmin = admins.includes(twitchUser.login.toLowerCase())

    // 4. Upsert utilizador na base de dados
    const { data: dbUser, error: dbError } = await supabase
      .from('users')
      .upsert({
        twitch_id: twitchUser.id,
        username: twitchUser.login,
        display_name: twitchUser.display_name,
        avatar_url: twitchUser.profile_image_url,
        email: twitchUser.email || null,
        is_admin: isAdmin,
        updated_at: new Date().toISOString()
      }, { onConflict: 'twitch_id' })
      .select()
      .single()

    if (dbError) throw dbError

    // 5. Guardar na sessão
    req.session.user = {
      id: dbUser.id,
      twitch_id: dbUser.twitch_id,
      username: dbUser.username,
      display_name: dbUser.display_name,
      avatar_url: dbUser.avatar_url,
      is_admin: dbUser.is_admin
    }

    res.redirect(`${process.env.FRONTEND_URL}?auth=success`)

  } catch (err) {
    console.error('Auth callback error:', err.message)
    res.redirect(`${process.env.FRONTEND_URL}?auth=error`)
  }
})

// ── GET /auth/me ───────────────────────────────────
// Retorna utilizador da sessão actual
router.get('/me', (req, res) => {
  if (!req.session?.user) {
    return res.json({ user: null })
  }
  res.json({ user: req.session.user })
})

// ── POST /auth/logout ──────────────────────────────
router.post('/logout', (req, res) => {
  req.session.destroy()
  res.json({ ok: true })
})

module.exports = router
