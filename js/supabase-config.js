/*
 * Configuration Supabase — Navette Express Passagers
 * Backend, authentification et données
 * W2K-Digital 2025
 */

const SUPABASE_URL = 'https://ilycnutphhmuvaonkrsa.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlseWNudXRwaGhtdXZhb25rcnNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1MjY5NDcsImV4cCI6MjA5MDEwMjk0N30.80ipBwMVvAkC2f0Oz2Wzl8E6GjMwlLCoE72XbePtmnM';

/* Initialisation du client Supabase (CDN global) */
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* Export global pour toutes les pages */
window.supabaseClient = supabaseClient;

// ========== AUTHENTIFICATION ==========

/* Inscription d'un nouvel utilisateur */
async function inscrireUtilisateur(data) {
  const { phone, email, full_name, password, quartier, lieu_travail, horaires } = data;

  const { data: user, error } = await supabaseClient
    .from('users')
    .insert([{
      phone,
      email,
      full_name,
      password_hash: password,
      quartier,
      lieu_travail,
      horaires: horaires || 'matin'
    }])
    .select()
    .single();

  if (error) throw error;

  localStorage.setItem('userId', user.id);
  localStorage.setItem('userName', user.full_name);
  localStorage.setItem('userPhone', user.phone);
  localStorage.setItem('isLoggedIn', 'true');

  return user;
}

/* Connexion par téléphone ou email */
async function connecterUtilisateur(identifier, password) {
  const { data: user, error } = await supabaseClient
    .from('users')
    .select('*')
    .or(`phone.eq.${identifier},email.eq.${identifier}`)
    .eq('password_hash', password)
    .single();

  if (error || !user) throw new Error('Identifiants incorrects');

  localStorage.setItem('userId', user.id);
  localStorage.setItem('userName', user.full_name);
  localStorage.setItem('userPhone', user.phone);
  localStorage.setItem('isLoggedIn', 'true');

  return user;
}

/* Déconnexion */
function deconnecterUtilisateur() {
  localStorage.removeItem('userId');
  localStorage.removeItem('userName');
  localStorage.removeItem('userPhone');
  localStorage.removeItem('isLoggedIn');
  window.location.href = 'connexion.html';
}

/* Vérifier si l'utilisateur est connecté */
function estConnecte() {
  return localStorage.getItem('isLoggedIn') === 'true';
}

// ========== LIGNES ==========

/* Récupérer toutes les lignes avec filtres optionnels */
async function getLignes(filtres = {}) {
  let query = supabaseClient.from('lignes').select('*');

  if (filtres.depart) query = query.eq('depart', filtres.depart);
  if (filtres.statut) query = query.eq('statut', filtres.statut);

  const { data, error } = await query.order('nom');
  if (error) throw error;
  return data;
}

/* Récupérer une ligne par son ID */
async function getLigneById(id) {
  const { data, error } = await supabaseClient
    .from('lignes')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

// ========== ABONNEMENTS ==========

/* Récupérer toute la grille tarifaire active */
async function getGrilleTarifaire() {
  const { data, error } = await supabaseClient
    .from('abonnements')
    .select('*')
    .eq('actif', true)
    .order('depart');

  if (error) throw error;
  return data;
}

/* Rechercher le tarif pour un trajet donné */
async function getTarifTrajet(depart, destination) {
  const { data, error } = await supabaseClient
    .from('abonnements')
    .select('*')
    .eq('depart', depart)
    .eq('destination', destination)
    .single();

  if (error) return null;
  return data;
}

/* Souscrire à un abonnement mensuel */
async function souscrireAbonnement(abonnementId, ligneId) {
  const userId = localStorage.getItem('userId');
  if (!userId) throw new Error('Non connecté');

  const dateDebut = new Date();
  const dateFin = new Date();
  dateFin.setMonth(dateFin.getMonth() + 1);

  const { data, error } = await supabaseClient
    .from('user_subscriptions')
    .insert([{
      user_id: userId,
      abonnement_id: abonnementId,
      ligne_id: ligneId,
      date_debut: dateDebut.toISOString().split('T')[0],
      date_fin: dateFin.toISOString().split('T')[0]
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/* Récupérer les abonnements de l'utilisateur connecté */
async function getMesAbonnements() {
  const userId = localStorage.getItem('userId');
  if (!userId) return [];

  const { data, error } = await supabaseClient
    .from('user_subscriptions')
    .select(`
      *,
      abonnement:abonnements(*),
      ligne:lignes(*)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

// ========== RÉSERVATIONS ==========

/* Créer une réservation ponctuelle */
async function creerReservation(ligneId, dateTrajet, siege, montant) {
  const userId = localStorage.getItem('userId');
  if (!userId) throw new Error('Non connecté');

  const { data, error } = await supabaseClient
    .from('reservations')
    .insert([{
      user_id: userId,
      ligne_id: ligneId,
      date_trajet: dateTrajet,
      siege,
      montant
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/* Récupérer l'historique des trajets */
async function getHistorique() {
  const userId = localStorage.getItem('userId');
  if (!userId) return [];

  const { data, error } = await supabaseClient
    .from('reservations')
    .select(`
      *,
      ligne:lignes(nom, depart, destination)
    `)
    .eq('user_id', userId)
    .order('date_trajet', { ascending: false });

  if (error) throw error;
  return data;
}

// ========== NOTIFICATIONS ==========

/* Récupérer les notifications de l'utilisateur */
async function getNotifications() {
  const userId = localStorage.getItem('userId');
  if (!userId) return [];

  const { data, error } = await supabaseClient
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

/* Marquer une notification comme lue */
async function marquerNotificationLue(notificationId) {
  const { error } = await supabaseClient
    .from('notifications')
    .update({ lu: true })
    .eq('id', notificationId);

  if (error) throw error;
}

/* Compter les notifications non lues */
async function compterNotificationsNonLues() {
  const userId = localStorage.getItem('userId');
  if (!userId) return 0;

  const { count, error } = await supabaseClient
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('lu', false);

  if (error) return 0;
  return count;
}

// ========== ÉVÉNEMENTS ==========

/* Créer une demande de location pour événement */
async function creerDemandeEvenement(data) {
  const userId = localStorage.getItem('userId');
  if (!userId) throw new Error('Non connecté');

  const { data: demande, error } = await supabaseClient
    .from('demandes_evenements')
    .insert([{
      user_id: userId,
      ...data
    }])
    .select()
    .single();

  if (error) throw error;
  return demande;
}

// ========== PROFIL ==========

/* Récupérer le profil de l'utilisateur connecté */
async function getProfil() {
  const userId = localStorage.getItem('userId');
  if (!userId) return null;

  const { data, error } = await supabaseClient
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
}

/* Mettre à jour le profil */
async function updateProfil(updates) {
  const userId = localStorage.getItem('userId');
  if (!userId) throw new Error('Non connecté');

  const { data, error } = await supabaseClient
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/* Export global pour toutes les pages */
window.inscrireUtilisateur = inscrireUtilisateur;
window.connecterUtilisateur = connecterUtilisateur;
window.deconnecterUtilisateur = deconnecterUtilisateur;
window.estConnecte = estConnecte;
window.getLignes = getLignes;
window.getLigneById = getLigneById;
window.getGrilleTarifaire = getGrilleTarifaire;
window.getTarifTrajet = getTarifTrajet;
window.souscrireAbonnement = souscrireAbonnement;
window.getMesAbonnements = getMesAbonnements;
window.creerReservation = creerReservation;
window.getHistorique = getHistorique;
window.getNotifications = getNotifications;
window.marquerNotificationLue = marquerNotificationLue;
window.compterNotificationsNonLues = compterNotificationsNonLues;
window.creerDemandeEvenement = creerDemandeEvenement;
window.getProfil = getProfil;
window.updateProfil = updateProfil;
