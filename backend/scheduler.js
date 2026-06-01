const supabase = require('./db/supabase')
const { notifyDisguise } = require('./discord-bot')

// Checkpoints em segundos
const CHECKPOINTS = [
  { key: '24h', secs: 86400, zone: 'warn' },
  { key: '12h', secs: 43200, zone: 'warn' },
  { key: '6h',  secs: 21600, zone: 'warn' },
  { key: '3h',  secs: 10800, zone: 'warn' },
  { key: '1h',  secs: 3600,  zone: 'crit' },
]

// Guarda quais notificações já foram enviadas: { disguiseId_key: true }
const sentNotifications = new Map()

async function checkDisguises() {
  try {
    // Buscar todos os disfarces activos com discord_id do utilizador
    const { data: disguises } = await supabase
      .from('disguises')
      .select('*, users(discord_id, username)')

    if (!disguises?.length) return

    const now = Date.now()

    for (const d of disguises) {
      if (!d.users?.discord_id) continue

      const startedAt = new Date(d.started_at).getTime()
      const totalMs = d.total_secs * 1000
      const endAt = startedAt + totalMs
      const remMs = endAt - now
      const remSecs = Math.floor(remMs / 1000)

      if (remSecs <= 0) {
        // Expirado
        const key = `${d.id}_exp`
        if (!sentNotifications.has(key)) {
          sentNotifications.set(key, true)
          await notifyDisguise(d.users.discord_id, d.name, 0, 'exp')
          console.log(`[Discord] Notificou expirado: ${d.name} → ${d.users.username}`)
        }
        continue
      }

      // Verificar checkpoints
      for (const cp of CHECKPOINTS) {
        const key = `${d.id}_${cp.key}`
        // Dentro de 60 segundos do checkpoint
        if (remSecs <= cp.secs && remSecs > cp.secs - 60 && !sentNotifications.has(key)) {
          sentNotifications.set(key, true)
          await notifyDisguise(d.users.discord_id, d.name, remSecs, cp.zone)
          console.log(`[Discord] Notificou ${cp.key}: ${d.name} → ${d.users.username}`)
        }
      }
    }
  } catch (err) {
    console.error('[Scheduler] Erro:', err.message)
  }
}

function startScheduler() {
  console.log('[Scheduler] Iniciado — a verificar disfarces a cada 30s')
  // Verificar de 30 em 30 segundos
  setInterval(checkDisguises, 30 * 1000)
  // Primeira verificação imediata
  checkDisguises()
}

module.exports = { startScheduler }
