const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js')

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.DirectMessages]
})

let botReady = false

client.once('ready', () => {
  console.log(`Discord bot online: ${client.user.tag}`)
  botReady = true
})

client.login(process.env.DISCORD_BOT_TOKEN).catch(err => {
  console.error('Discord bot login error:', err.message)
})

// Enviar DM a um utilizador pelo Discord ID
async function sendDM(discordId, embed) {
  if (!botReady) return false
  try {
    const user = await client.users.fetch(discordId)
    await user.send({ embeds: [embed] })
    return true
  } catch (e) {
    console.error(`DM error for ${discordId}:`, e.message)
    return false
  }
}

// Notificação de disfarce a expirar
async function notifyDisguise(discordId, disguiseName, remainingSecs, zone) {
  const colors = { warn: 0xf59e0b, crit: 0xef4444, exp: 0x6b7280 }
  const icons = { warn: '⚠️', crit: '🚨', exp: '❌' }
  const labels = { warn: 'A expirar em breve', crit: 'CRÍTICO — Expira em minutos!', exp: 'Expirado' }

  const h = Math.floor(remainingSecs / 3600)
  const m = Math.floor((remainingSecs % 3600) / 60)
  const s = remainingSecs % 60
  const timeStr = remainingSecs > 0
    ? `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
    : 'Expirado'

  const embed = new EmbedBuilder()
    .setColor(colors[zone] || 0xef4444)
    .setTitle(`${icons[zone]} Disfarce: ${disguiseName}`)
    .setDescription(labels[zone])
    .addFields({ name: 'Tempo restante', value: `\`${timeStr}\``, inline: true })
    .setFooter({ text: 'INUHZAO Platform' })
    .setTimestamp()

  return sendDM(discordId, embed)
}

module.exports = { notifyDisguise, sendDM }
