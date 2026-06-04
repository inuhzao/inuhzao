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

// Persistência no Supabase: tabela disguise_notifications (disguise_id, checkpoint_key)
// Sobrevive a deploys e restarts — ao contrário de um Map em memória
async function wasNotified(disguiseId, key) {
  try {
    const { data } = await supabase
      .from('disguise_notifications')
      .select('id')
      .eq('disguise_id', disguiseId)
      .eq('checkpoint_key', key)
      .maybeSingle()
    return !!data
  } catch { return false }
}

async function markNotified(disguiseId, key) {
  try {
    await supabase
      .from('disguise_notifications')
      .upsert({ disguise_id: disguiseId, checkpoint_key: key }, { onConflict: 'disguise_id,checkpoint_key' })
  } catch (e) {
    console.error('[Scheduler] Erro ao guardar notificação:', e.message)
  }
}

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
        const key = 'exp'
        if (!(await wasNotified(d.id, key))) {
          await markNotified(d.id, key)
          await notifyDisguise(d.users.discord_id, d.name, 0, 'exp')
          console.log(`[Discord] Notificou expirado: ${d.name} → ${d.users.username}`)
        }
        continue
      }

      // Verificar checkpoints
      for (const cp of CHECKPOINTS) {
        // Dentro de 60 segundos do checkpoint
        if (remSecs <= cp.secs && remSecs > cp.secs - 60) {
          if (!(await wasNotified(d.id, cp.key))) {
            await markNotified(d.id, cp.key)
            await notifyDisguise(d.users.discord_id, d.name, remSecs, cp.zone)
            console.log(`[Discord] Notificou ${cp.key}: ${d.name} → ${d.users.username}`)
          }
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
