// api.js — cliente centralizado para todas as chamadas ao backend

const BASE = import.meta.env.PROD ? '' : ''

async function req(method, path, body) {
  const opts = {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' }
  }
  if (body) opts.body = JSON.stringify(body)
  const res = await fetch(BASE + path, opts)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Erro desconhecido')
  return data
}

export const api = {
  // AUTH
  me:           () => req('GET',  '/auth/me'),
  logout:       () => req('POST', '/auth/logout'),

  // POINTS
  myPoints:     () => req('GET',  '/points/me'),
  leaderboard:  () => req('GET',  '/points/leaderboard'),
  givePoints:   (username, amount) => req('POST', '/points/add', { username, amount }),

  // SHOP
  shopItems:    () => req('GET',  '/shop'),
  redeemItem:   (item_id) => req('POST', '/shop/redeem', { item_id }),
  redemptions:  (status) => req('GET',  `/shop/redemptions${status ? '?status='+status : ''}`),
  updateRed:    (id, status, note) => req('PATCH', `/shop/redemptions/${id}`, { status, note }),
  createItem:   (data) => req('POST',  '/shop/items', data),
  updateItem:   (id, data) => req('PATCH', `/shop/items/${id}`, data),
  deleteItem:   (id) => req('DELETE', `/shop/items/${id}`),

  // COUPONS
  redeemCoupon: (code) => req('POST', '/coupons/redeem', { code }),
  listCoupons:  () => req('GET',  '/coupons'),
  createCoupon: (data) => req('POST', '/coupons', data),
  deleteCoupon: (id) => req('DELETE', `/coupons/${id}`),

  // GIVEAWAY
  activeGW:     () => req('GET',  '/giveaway/active'),
  gwParts:      (id) => req('GET',  `/giveaway/${id}/participants`),
  enterGW:      (id) => req('POST', `/giveaway/${id}/enter`),
  createGW:     (data) => req('POST', '/giveaway', data),
  drawGW:       (id) => req('POST', `/giveaway/${id}/draw`),
  endGW:        (id) => req('DELETE', `/giveaway/${id}`),

  // GAME
  timers:       () => req('GET',  '/game/timers'),
  createTimer:  (data) => req('POST', '/game/timers', data),
  updateTimer:  (id, data) => req('PATCH', `/game/timers/${id}`, data),
  deleteTimer:  (id) => req('DELETE', `/game/timers/${id}`),

  hidraLog:     () => req('GET',  '/game/hidra'),
  addHidra:     (data) => req('POST', '/game/hidra', data),
  clearHidra:   () => req('DELETE', '/game/hidra'),

  disguises:    () => req('GET',  '/game/disguises'),
  addDisguise:  (data) => req('POST', '/game/disguises', data),
  renewDisguise:(id) => req('PATCH', `/game/disguises/${id}/renew`),
  delDisguise:  (id) => req('DELETE', `/game/disguises/${id}`),

  // ADMIN
  adminUsers:   () => req('GET',  '/admin/users'),
  adminStats:   () => req('GET',  '/admin/stats'),
  updateUser:   (id, data) => req('PATCH', `/admin/users/${id}`, data)
}
