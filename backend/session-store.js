const session = require('express-session')
const supabase = require('./db/supabase')

// Session store usando Supabase REST API (sem ligação directa pg)
class SupabaseSessionStore extends session.Store {
  constructor() {
    super()
    // Limpar sessões expiradas a cada hora
    setInterval(() => this.clearExpired(), 60 * 60 * 1000)
  }

  async get(sid, callback) {
    try {
      const { data } = await supabase
        .from('session')
        .select('sess, expire')
        .eq('sid', sid)
        .single()

      if (!data) return callback(null, null)
      if (new Date(data.expire) < new Date()) {
        await this.destroy(sid, () => {})
        return callback(null, null)
      }
      callback(null, data.sess)
    } catch(e) {
      callback(null, null)
    }
  }

  async set(sid, sess, callback) {
    try {
      const expire = new Date(Date.now() + (sess.cookie?.maxAge || 30 * 24 * 60 * 60 * 1000))
      await supabase
        .from('session')
        .upsert({ sid, sess, expire: expire.toISOString() }, { onConflict: 'sid' })
      callback(null)
    } catch(e) {
      callback(null) // não crashar por erro de sessão
    }
  }

  async destroy(sid, callback) {
    try {
      await supabase.from('session').delete().eq('sid', sid)
      callback(null)
    } catch(e) {
      callback(null)
    }
  }

  async clearExpired() {
    try {
      await supabase
        .from('session')
        .delete()
        .lt('expire', new Date().toISOString())
    } catch(e) {}
  }
}

module.exports = SupabaseSessionStore
