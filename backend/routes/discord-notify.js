const express = require('express')
const supabase = require('../db/supabase')
const { requireAuth } = require('../middleware/auth')
const { notifyDisguise } = require('../discord-bot')
const router = express.Router()

// ── POST /discord/test ─────────────────────────────
// Testar DM do bot
router.post('/test', requireAuth, async (req, res) => {
  const { data: user } = await supabase
    .from('users')
    .select('discord_id')
    .eq('id', req.session.user.id)
    .single()

  if (!user?.discord_id) {
    return res.status(400).json({ error: 'Sem Discord ID configurado no perfil.' })
  }

  const { EmbedBuilder } = require('discord.js')
  const { sendDM } = require('../discord-bot')

  const embed = new EmbedBuilder()
    .setColor(0x5b9cf6)
    .setTitle('✅ Notificações activas!')
    .setDescription('O bot vai avisar-te quando os teus disfarces estiverem a expirar.')
    .setFooter({ text: 'INUHZAO Platform' })

  const ok = await sendDM(user.discord_id, embed)
  if (ok) res.json({ ok: true })
  else res.status(500).json({ error: 'Não foi possível enviar DM. Verifica se o teu Discord permite mensagens de bots.' })
})

// ── POST /discord/save-id ──────────────────────────
// Guardar Discord ID do utilizador
router.post('/save-id', requireAuth, async (req, res) => {
  const { discord_id } = req.body
  if (!discord_id) return res.status(400).json({ error: 'Discord ID obrigatório.' })

  const { error } = await supabase
    .from('users')
    .update({ discord_id })
    .eq('id', req.session.user.id)

  if (error) return res.status(500).json({ error: error.message })
  res.json({ ok: true })
})

// ── POST /discord/notify-disguise ─────────────────
// Backend chama este endpoint para notificar
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
