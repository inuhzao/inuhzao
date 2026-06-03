const session = require('express-session')
const supabase = require('./db/supabase')

class SupabaseSessionStore extends session.Store {
  constructor() {
    super()
    setInterval(() => this.clearExpired(), 60 * 60 * 1000)
  }

  async get(sid, callback) {
    try {
      const { data, error } = await supabase
        .from('session')
        .select('sess, expire')
        .eq('sid', sid)
        .maybeSingle()

      if (error) { console.error('Session get error:', error.message); return callback(null, null) }
      if (!data) return callback(null, null)
      if (new Date(data.expire) < new Date()) {
        await this.destroy(sid, () => {})
        return callback(null, null)
      }
      callback(null, typeof data.sess === 'string' ? JSON.parse(data.sess) : data.sess)
    } catch(e) {
      console.error('Session get exception:', e.message)
      callback(null, null)
    }
  }

  async set(sid, sess, callback) {
    try {
      const maxAge = sess?.cookie?.maxAge || (30 * 24 * 60 * 60 * 1000)
      const expire = new Date(Date.now() + maxAge).toISOString()
      const { error } = await supabase
        .from('session')
        .upsert({ sid, sess: JSON.stringify(sess), expire }, { onConflict: 'sid' })
      if (error) console.error('Session set error:', error.message)
      callback(null)
    } catch(e) {
      console.error('Session set exception:', e.message)
      callback(null)
    }
  }

  async destroy(sid, callback) {
    try {
      await supabase.from('session').delete().eq('sid', sid)
      callback(null)
    } catch(e) { callback(null) }
  }

  async clearExpired() {
    try {
      await supabase.from('session').delete().lt('expire', new Date().toISOString())
    } catch(e) {}
  }
}

module.exports = SupabaseSessionStore
