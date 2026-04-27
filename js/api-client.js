/**
 * NAVETTE EXPRESS — Client API
 * PWA Passagers
 */
class NavetteAPI {
  constructor() {
    this.baseUrl = API_CONFIG.BASE_URL;
    this.tokenKey = TOKEN_KEY;
  }

  getToken() { return localStorage.getItem(this.tokenKey); }
  setToken(t) { localStorage.setItem(this.tokenKey, t); }
  removeToken() { localStorage.removeItem(this.tokenKey); localStorage.removeItem(USER_KEY); }
  getUser() { const u = localStorage.getItem(USER_KEY); return u ? JSON.parse(u) : null; }
  isLoggedIn() { return !!this.getToken(); }

  getHeaders(withAuth = true) {
    const h = { 'Content-Type': 'application/json' };
    if (withAuth) { const t = this.getToken(); if (t) h['Authorization'] = `Bearer ${t}`; }
    return h;
  }

  async request(method, path, body = null, withAuth = true) {
    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: this.getHeaders(withAuth),
        body: body ? JSON.stringify(body) : undefined
      });
      const data = await response.json();
      if (response.status === 401) { this.removeToken(); window.location.href = '/connexion.html'; return; }
      if (!response.ok && !data.success) throw { status: response.status, ...data.error };
      return data;
    } catch (err) {
      if (err.code) throw err;
      throw { code: 'NETWORK_ERROR', message: 'Erreur de connexion' };
    }
  }

  get(path, auth = true) { return this.request('GET', path, null, auth); }
  post(path, body, auth = true) { return this.request('POST', path, body, auth); }
  put(path, body, auth = true) { return this.request('PUT', path, body, auth); }

  requireAuth() {
    if (!this.isLoggedIn()) { window.location.href = '/connexion.html'; return false; }
    const user = this.getUser();
    if (!['passenger', 'employee', 'enterprise_admin'].includes(user?.role)) {
      window.location.href = '/connexion.html'; return false;
    }
    return true;
  }

  async login(email, password) {
    const res = await this.post('/api/auth/login', { email, password }, false);
    if (res?.success) {
      this.setToken(res.data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(res.data.user));
    }
    return res;
  }

  async register(data) {
    const res = await this.post('/api/auth/register', { ...data, role: 'passenger' }, false);
    if (res?.success) {
      this.setToken(res.data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(res.data.user));
    }
    return res;
  }

  logout() { this.removeToken(); window.location.href = '/connexion.html'; }

  // Profil
  getMe() { return this.get('/api/auth/me'); }
  updateMe(data) { return this.put('/api/auth/me', data); }

  // Lignes
  getActiveLines() { return this.get('/api/lines/active', false); }
  getLine(id) { return this.get(`/api/lines/${id}`); }

  // Abonnements
  getMySubscriptions() { return this.get('/api/subscriptions/mine'); }
  getSubscription(id) { return this.get(`/api/subscriptions/${id}`); }
  subscribe(lineId, startDate, paymentMethod) {
    return this.post('/api/subscriptions', { line_id: lineId, start_date: startDate, payment_method: paymentMethod });
  }
  cancelSubscription(id) { return this.put(`/api/subscriptions/${id}/cancel`); }
  getQRCode(id) { return this.get(`/api/subscriptions/${id}/qrcode`); }

  // Réservations
  getMyReservations() { return this.get('/api/reservations'); }

  // Paiements
  initiatePayment(data) { return this.post('/api/payments/initiate', data); }
  getPaymentHistory() { return this.get('/api/payments/history'); }

  // Notifications
  getNotifications() { return this.get('/api/notifications'); }
  markNotificationRead(id) { return this.put(`/api/notifications/${id}/read`); }

  // Tracking
  getVehiclePosition(vehicleId) { return this.get(`/api/tracking/vehicle/${vehicleId}`); }
}

const API = new NavetteAPI();
