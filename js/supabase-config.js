/**
 * NAVETTE EXPRESS — API Bridge (remplace Supabase)
 * PWA Passagers — Toutes les fonctions appellent https://api.jaebets-holding.com
 * JAEBETS HOLDING — W2K-Digital 2025
 */

const API_BASE = 'https://api.jaebets-holding.com';

// Stub vide pour éviter les erreurs JS résiduelles sur window.supabaseClient
window.supabaseClient = {
  auth: { signUp: () => {}, signInWithPassword: () => {}, signOut: () => {} },
  from: () => ({ select: () => {}, insert: () => {}, update: () => {}, eq: () => {} })
};

// ─── Helpers internes ─────────────────────────────────────────────────

function _getToken() {
  return localStorage.getItem('userToken');
}

function _getUser() {
  try { return JSON.parse(localStorage.getItem('navette_user')); } catch(e) { return null; }
}

async function _apiFetch(path, options = {}) {
  const token = _getToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const res = await fetch(API_BASE + path, { ...options, headers });
  if (!res.ok && res.status === 401) {
    _clearAuth();
    window.location.href = 'connexion.html';
    return null;
  }
  return res.json();
}

function _clearAuth() {
  localStorage.removeItem('userToken');
  localStorage.removeItem('navette_user');
  localStorage.removeItem('userName');
  localStorage.removeItem('userId');
  localStorage.removeItem('userPhone');
  localStorage.removeItem('isLoggedIn');
}

function _saveAuth(token, user) {
  localStorage.setItem('userToken', token);
  localStorage.setItem('navette_user', JSON.stringify(user));
  localStorage.setItem('userName', user.full_name || '');
  localStorage.setItem('userId', user.id || '');
  localStorage.setItem('userPhone', user.phone || '');
  localStorage.setItem('isLoggedIn', 'true');
}

function _mapLigne(l) {
  return {
    ...l,
    nom: l.name,
    depart: l.origin,
    destination: l.destination,
    zone_depart: l.origin_zone,
    zone_destination: l.destination_zone,
    prix_mensuel: l.price_monthly,
    prix_unitaire: l.price_single,
    statut: l.status,
    aller_retour: l.is_round_trip,
    heure_depart: l.departure_time,
    heure_retour: l.return_time,
    jours: l.days_active
  };
}

// ─── AUTHENTIFICATION ─────────────────────────────────────────────────

async function inscrireUtilisateur(data) {
  const { phone, email, full_name, password, quartier, lieu_travail, horaires } = data;
  const res = await fetch(API_BASE + '/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, full_name, phone, role: 'passenger' })
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message || 'Erreur inscription');
  _saveAuth(json.data.token, json.data.user);
  return json.data.user;
}

async function connecterUtilisateur(identifier, password) {
  const res = await fetch(API_BASE + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: identifier, password })
  });
  const json = await res.json();
  if (!json.success) throw new Error('Identifiants incorrects');
  _saveAuth(json.data.token, json.data.user);
  return json.data.user;
}

async function deconnecterUtilisateur() {
  _clearAuth();
  window.location.href = 'connexion.html';
}

function estConnecte() {
  return !!_getToken();
}

// ─── LIGNES ───────────────────────────────────────────────────────────

async function getLignes(filtres = {}) {
  const params = new URLSearchParams();
  if (filtres.statut) params.set('status', filtres.statut);
  if (filtres.depart) params.set('origin', filtres.depart);
  const qs = params.toString();
  const json = await _apiFetch('/api/lines' + (qs ? '?' + qs : ''));
  const list = json?.data || json?.lines || [];
  return list.map(_mapLigne);
}

async function getLignesActives() {
  return getLignes({ statut: 'active' });
}

async function getLigneById(id) {
  const json = await _apiFetch('/api/lines/' + id);
  const l = json?.data || json;
  if (!l) throw new Error('Ligne introuvable');
  return _mapLigne(l);
}

// ─── ABONNEMENTS ──────────────────────────────────────────────────────

async function getGrilleTarifaire() {
  const json = await _apiFetch('/api/lines?status=active');
  const list = json?.data || json?.lines || [];
  return list.map(l => ({ ...l, depart: l.origin, destination: l.destination, prix: l.price_monthly, actif: true }));
}

async function getTarifTrajet(depart, destination) {
  const json = await _apiFetch('/api/lines?origin=' + encodeURIComponent(depart) + '&destination=' + encodeURIComponent(destination));
  const list = json?.data || json?.lines || [];
  if (!list.length) return null;
  const l = list[0];
  return { ...l, prix: l.price_monthly };
}

async function souscrireAbonnement(ligneId, options = {}) {
  const json = await _apiFetch('/api/subscriptions', {
    method: 'POST',
    body: JSON.stringify({
      line_id: ligneId,
      payment_method: options.paymentMethod || null,
      payment_reference: options.paymentReference || null,
      price_paid: options.price || null
    })
  });
  if (!json?.success) throw new Error(json?.error?.message || 'Erreur souscription');
  return json.data;
}

async function getMesAbonnements() {
  const json = await _apiFetch('/api/subscriptions/me');
  const list = json?.data || [];
  return list.map(s => ({
    ...s,
    date_debut: s.start_date,
    date_fin: s.end_date,
    montant: s.price_paid,
    statut: s.status,
    nom_ligne: s.line?.name || s.ligne?.name,
    depart: s.line?.origin || s.ligne?.origin,
    destination: s.line?.destination || s.ligne?.destination
  }));
}

// ─── RÉSERVATIONS ─────────────────────────────────────────────────────

async function creerReservation(tripId, siege, montant, options = {}) {
  const json = await _apiFetch('/api/reservations', {
    method: 'POST',
    body: JSON.stringify({
      trip_id: tripId,
      seat_number: siege || null,
      price_paid: montant,
      payment_method: options.paymentMethod || null,
      payment_reference: options.paymentReference || null
    })
  });
  if (!json?.success) throw new Error(json?.error?.message || 'Erreur réservation');
  return json.data;
}

async function getHistorique() {
  const json = await _apiFetch('/api/reservations/me');
  const list = json?.data || [];
  return list.map(r => ({
    ...r,
    date_trajet: r.trip?.trip_date || r.trip_date,
    nom_ligne: r.trip?.line?.name || r.nom_ligne,
    depart: r.trip?.line?.origin || r.depart,
    destination: r.trip?.line?.destination || r.destination,
    montant: r.price_paid,
    statut: r.status
  }));
}

// ─── NOTIFICATIONS ────────────────────────────────────────────────────

async function getNotifications() {
  const json = await _apiFetch('/api/notifications?limit=50');
  const list = json?.data || [];
  return list.map(n => ({ ...n, lu: n.is_read, date_creation: n.created_at }));
}

async function marquerNotificationLue(notificationId) {
  await _apiFetch('/api/notifications/' + notificationId + '/read', { method: 'PUT' });
}

async function compterNotificationsNonLues() {
  const json = await _apiFetch('/api/notifications/unread-count');
  return json?.data?.count ?? json?.count ?? 0;
}

// ─── ÉVÉNEMENTS ───────────────────────────────────────────────────────

async function creerDemandeEvenement(data) {
  const json = await _apiFetch('/api/events', {
    method: 'POST',
    body: JSON.stringify({
      event_type: data.type || data.event_type,
      event_date: data.date || data.event_date,
      departure: data.depart || data.departure,
      destination: data.destination,
      passenger_count: data.nombre_personnes || data.passenger_count,
      vehicle_type: data.type_vehicule || data.vehicle_type,
      duration_hours: data.duree || data.duration_hours,
      message: data.message
    })
  });
  if (!json?.success) throw new Error(json?.error?.message || 'Erreur demande événement');
  return json.data;
}

// ─── PROFIL ───────────────────────────────────────────────────────────

async function getProfil() {
  const json = await _apiFetch('/api/users/me');
  return json?.data || null;
}

async function updateProfil(updates) {
  const json = await _apiFetch('/api/users/me', {
    method: 'PUT',
    body: JSON.stringify({
      full_name: updates.full_name || updates.nom,
      phone: updates.phone || updates.telephone,
      quartier: updates.quartier,
      lieu_travail: updates.lieu_travail
    })
  });
  if (!json?.success) throw new Error(json?.error?.message || 'Erreur mise à jour profil');
  return json.data;
}

// ─── EXPORT GLOBAL ────────────────────────────────────────────────────
window.inscrireUtilisateur         = inscrireUtilisateur;
window.connecterUtilisateur        = connecterUtilisateur;
window.deconnecterUtilisateur      = deconnecterUtilisateur;
window.estConnecte                 = estConnecte;
window.getLignes                   = getLignes;
window.getLignesActives            = getLignesActives;
window.getLigneById                = getLigneById;
window.getGrilleTarifaire          = getGrilleTarifaire;
window.getTarifTrajet              = getTarifTrajet;
window.souscrireAbonnement         = souscrireAbonnement;
window.getMesAbonnements           = getMesAbonnements;
window.creerReservation            = creerReservation;
window.getHistorique               = getHistorique;
window.getNotifications            = getNotifications;
window.marquerNotificationLue      = marquerNotificationLue;
window.compterNotificationsNonLues = compterNotificationsNonLues;
window.creerDemandeEvenement       = creerDemandeEvenement;
window.getProfil                   = getProfil;
window.updateProfil                = updateProfil;
