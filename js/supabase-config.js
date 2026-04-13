/**
 * Configuration Supabase — Navette Express Passagers
 * Schéma unifié JAEBETS HOLDING
 * W2K-Digital 2025
 */

const SUPABASE_URL = 'https://ilycnutphhmuvaonkrsa.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlseWNudXRwaGhtdXZhb25rcnNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1MjY5NDcsImV4cCI6MjA5MDEwMjk0N30.80ipBwMVvAkC2f0Oz2Wzl8E6GjMwlLCoE72XbePtmnM';

const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.supabaseClient = supabaseClient;

// ─── AUTHENTIFICATION ────────────────────────────────────────────────

/**
 * Inscription d'un nouveau passager
 */
async function inscrireUtilisateur(data) {
    const { phone, email, full_name, password, quartier, lieu_travail, horaires } = data;

    try {
        // Créer le compte Supabase Auth
        const { data: authData, error: authError } = await supabaseClient.auth.signUp({
            email,
            password,
            options: {
                data: { full_name, role: 'passenger' }
            }
        });

        if (authError) throw authError;

        // Créer le profil dans public.users
        // (le trigger crée aussi une ligne, on fait un upsert pour compléter)
        const { data: userRow, error: profileError } = await supabaseClient
            .from('users')
            .upsert({
                auth_id: authData.user.id,
                email,
                phone,
                full_name,
                quartier: quartier || null,
                lieu_travail: lieu_travail || null,
                horaires: horaires || 'matin',
                role: 'passenger'
            }, { onConflict: 'auth_id' })
            .select()
            .single();

        if (profileError) throw profileError;

        localStorage.setItem('userId', userRow.id);
        localStorage.setItem('userName', userRow.full_name);
        localStorage.setItem('userPhone', userRow.phone || phone);
        localStorage.setItem('isLoggedIn', 'true');

        return userRow;
    } catch (error) {
        console.error('[Inscription] Erreur:', error.message);
        throw error;
    }
}

/**
 * Connexion passager (email ou téléphone + mot de passe)
 */
async function connecterUtilisateur(identifier, password) {
    try {
        // Déterminer si c'est un email ou un téléphone
        const isEmail = identifier.includes('@');
        let email = identifier;

        if (!isEmail) {
            // Chercher l'email correspondant au téléphone
            const { data: userRow, error: lookupErr } = await supabaseClient
                .from('users')
                .select('email')
                .eq('phone', identifier)
                .single();

            if (lookupErr || !userRow) throw new Error('Numéro de téléphone introuvable');
            email = userRow.email;
        }

        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw error;

        // Récupérer le profil
        const { data: userProfile, error: profileErr } = await supabaseClient
            .from('users')
            .select('*')
            .eq('auth_id', data.user.id)
            .single();

        if (profileErr || !userProfile) throw new Error('Profil introuvable');

        localStorage.setItem('userId', userProfile.id);
        localStorage.setItem('userName', userProfile.full_name);
        localStorage.setItem('userPhone', userProfile.phone || '');
        localStorage.setItem('isLoggedIn', 'true');

        return userProfile;
    } catch (error) {
        console.error('[Connexion] Erreur:', error.message);
        throw new Error('Identifiants incorrects');
    }
}

/**
 * Déconnexion
 */
async function deconnecterUtilisateur() {
    await supabaseClient.auth.signOut();
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
    localStorage.removeItem('userPhone');
    localStorage.removeItem('isLoggedIn');
    window.location.href = 'connexion.html';
}

/**
 * Vérifier si l'utilisateur est connecté
 */
function estConnecte() {
    return localStorage.getItem('isLoggedIn') === 'true';
}

// ─── LIGNES ──────────────────────────────────────────────────────────

/**
 * Récupérer toutes les lignes avec filtres optionnels
 */
async function getLignes(filtres = {}) {
    let query = supabaseClient.from('lines').select('*');

    if (filtres.depart)  query = query.eq('origin', filtres.depart);
    if (filtres.statut)  query = query.eq('status', filtres.statut);
    if (!filtres.statut) query = query.neq('status', 'inactive'); // par défaut : actives + pending

    const { data, error } = await query.order('name');
    if (error) throw error;

    // Mapper vers les noms attendus par les pages HTML
    return (data || []).map(l => ({
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
    }));
}

/**
 * Récupérer toutes les lignes actives uniquement
 */
async function getLignesActives() {
    return getLignes({ statut: 'active' });
}

/**
 * Récupérer une ligne par son ID
 */
async function getLigneById(id) {
    const { data, error } = await supabaseClient
        .from('lines')
        .select('*')
        .eq('id', id)
        .single();

    if (error) throw error;
    return {
        ...data,
        nom: data.name,
        depart: data.origin,
        destination: data.destination,
        prix_mensuel: data.price_monthly,
        statut: data.status
    };
}

// ─── ABONNEMENTS ─────────────────────────────────────────────────────

/**
 * Récupérer toutes les lignes actives (grille tarifaire)
 */
async function getGrilleTarifaire() {
    const { data, error } = await supabaseClient
        .from('lines')
        .select('*')
        .eq('status', 'active')
        .order('origin');

    if (error) throw error;
    return (data || []).map(l => ({
        ...l,
        depart: l.origin,
        destination: l.destination,
        prix: l.price_monthly,
        actif: true
    }));
}

/**
 * Rechercher le tarif pour un trajet donné
 */
async function getTarifTrajet(depart, destination) {
    const { data, error } = await supabaseClient
        .from('lines')
        .select('*')
        .eq('origin', depart)
        .eq('destination', destination)
        .single();

    if (error) return null;
    return { ...data, prix: data.price_monthly };
}

/**
 * Souscrire à un abonnement mensuel
 */
async function souscrireAbonnement(ligneId, options = {}) {
    const userId = localStorage.getItem('userId');
    if (!userId) throw new Error('Non connecté');

    const dateDebut = new Date();
    const dateFin = new Date();
    dateFin.setMonth(dateFin.getMonth() + 1);

    // Récupérer le prix de la ligne
    const { data: ligne } = await supabaseClient
        .from('lines')
        .select('price_monthly')
        .eq('id', ligneId)
        .single();

    const { data, error } = await supabaseClient
        .from('subscriptions')
        .insert({
            user_id: userId,
            line_id: ligneId,
            start_date: dateDebut.toISOString().split('T')[0],
            end_date: dateFin.toISOString().split('T')[0],
            price_paid: options.price || ligne?.price_monthly || 0,
            payment_method: options.paymentMethod || null,
            payment_reference: options.paymentReference || null,
            status: 'pending',
            is_round_trip: true
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Récupérer les abonnements de l'utilisateur connecté
 */
async function getMesAbonnements() {
    const userId = localStorage.getItem('userId');
    if (!userId) return [];

    const { data, error } = await supabaseClient
        .from('subscriptions')
        .select(`
            *,
            ligne:lines(id, name, origin, destination, price_monthly, departure_time, return_time, status)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(s => ({
        ...s,
        date_debut: s.start_date,
        date_fin: s.end_date,
        montant: s.price_paid,
        statut: s.status,
        nom_ligne: s.ligne?.name,
        depart: s.ligne?.origin,
        destination: s.ligne?.destination
    }));
}

// ─── RÉSERVATIONS ────────────────────────────────────────────────────

/**
 * Créer une réservation ponctuelle
 */
async function creerReservation(tripId, siege, montant, options = {}) {
    const userId = localStorage.getItem('userId');
    if (!userId) throw new Error('Non connecté');

    const { data, error } = await supabaseClient
        .from('reservations')
        .insert({
            user_id: userId,
            trip_id: tripId,
            seat_number: siege || null,
            price_paid: montant,
            payment_method: options.paymentMethod || null,
            payment_reference: options.paymentReference || null,
            status: 'confirmed',
            boarding_status: 'waiting'
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Récupérer l'historique des trajets du passager
 */
async function getHistorique() {
    const userId = localStorage.getItem('userId');
    if (!userId) return [];

    const { data, error } = await supabaseClient
        .from('reservations')
        .select(`
            *,
            trajet:trips(
                trip_date, departure_time,
                ligne:lines(name, origin, destination)
            )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(r => ({
        ...r,
        date_trajet: r.trajet?.trip_date,
        nom_ligne: r.trajet?.ligne?.name,
        depart: r.trajet?.ligne?.origin,
        destination: r.trajet?.ligne?.destination,
        montant: r.price_paid,
        statut: r.status
    }));
}

// ─── NOTIFICATIONS ───────────────────────────────────────────────────

/**
 * Récupérer les notifications du passager
 */
async function getNotifications() {
    const userId = localStorage.getItem('userId');
    if (!userId) return [];

    const { data, error } = await supabaseClient
        .from('notifications')
        .select('*')
        .or(`target_audience.eq.all,target_audience.eq.passengers,target_user_id.eq.${userId}`)
        .order('created_at', { ascending: false })
        .limit(50);

    if (error) throw error;

    return (data || []).map(n => ({
        ...n,
        lu: n.is_read,
        date_creation: n.created_at
    }));
}

/**
 * Marquer une notification comme lue
 */
async function marquerNotificationLue(notificationId) {
    const { error } = await supabaseClient
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

    if (error) throw error;
}

/**
 * Compter les notifications non lues
 */
async function compterNotificationsNonLues() {
    const userId = localStorage.getItem('userId');
    if (!userId) return 0;

    const { count, error } = await supabaseClient
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .or(`target_audience.eq.all,target_audience.eq.passengers,target_user_id.eq.${userId}`)
        .eq('is_read', false);

    if (error) return 0;
    return count;
}

// ─── ÉVÉNEMENTS ──────────────────────────────────────────────────────

/**
 * Créer une demande de location pour événement
 */
async function creerDemandeEvenement(data) {
    const userId = localStorage.getItem('userId');
    if (!userId) throw new Error('Non connecté');

    const { data: demande, error } = await supabaseClient
        .from('event_requests')
        .insert({
            user_id: userId,
            event_type: data.type || data.event_type,
            event_date: data.date || data.event_date,
            departure: data.depart || data.departure,
            destination: data.destination,
            passenger_count: data.nombre_personnes || data.passenger_count,
            vehicle_type: data.type_vehicule || data.vehicle_type,
            duration_hours: data.duree || data.duration_hours,
            message: data.message,
            status: 'pending'
        })
        .select()
        .single();

    if (error) throw error;
    return demande;
}

// ─── PROFIL ──────────────────────────────────────────────────────────

/**
 * Récupérer le profil de l'utilisateur connecté
 */
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

/**
 * Mettre à jour le profil
 */
async function updateProfil(updates) {
    const userId = localStorage.getItem('userId');
    if (!userId) throw new Error('Non connecté');

    const { data, error } = await supabaseClient
        .from('users')
        .update({
            full_name: updates.full_name || updates.nom,
            phone: updates.phone || updates.telephone,
            quartier: updates.quartier,
            lieu_travail: updates.lieu_travail,
            updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

// ─── EXPORT GLOBAL ───────────────────────────────────────────────────
window.inscrireUtilisateur      = inscrireUtilisateur;
window.connecterUtilisateur     = connecterUtilisateur;
window.deconnecterUtilisateur   = deconnecterUtilisateur;
window.estConnecte              = estConnecte;
window.getLignes                = getLignes;
window.getLignesActives         = getLignesActives;
window.getLigneById             = getLigneById;
window.getGrilleTarifaire       = getGrilleTarifaire;
window.getTarifTrajet           = getTarifTrajet;
window.souscrireAbonnement      = souscrireAbonnement;
window.getMesAbonnements        = getMesAbonnements;
window.creerReservation         = creerReservation;
window.getHistorique            = getHistorique;
window.getNotifications         = getNotifications;
window.marquerNotificationLue   = marquerNotificationLue;
window.compterNotificationsNonLues = compterNotificationsNonLues;
window.creerDemandeEvenement    = creerDemandeEvenement;
window.getProfil                = getProfil;
window.updateProfil             = updateProfil;
