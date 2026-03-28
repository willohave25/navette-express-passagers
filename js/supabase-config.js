/*
 * Configuration Supabase - Navette Express
 * Backend et authentification
 * W2K-Digital 2025
 * 
 * PLACEHOLDER : Les clés API seront fournies ultérieurement
 */

const SUPABASE_CONFIG = {
  /* URL et clé API Supabase - À REMPLACER */
  url: 'https://VOTRE_PROJET.supabase.co',
  anonKey: 'VOTRE_CLE_ANON_PUBLIQUE',
  
  /* Tables de la base de données */
  tables: {
    users: 'users',
    lignes: 'lignes',
    reservations: 'reservations',
    abonnements: 'abonnements',
    notifications: 'notifications',
    historique: 'historique',
    evenements: 'evenements'
  }
};

/* Initialisation du client Supabase */
let supabaseClient = null;

function initSupabase() {
  if (typeof supabase !== 'undefined') {
    supabaseClient = supabase.createClient(
      SUPABASE_CONFIG.url,
      SUPABASE_CONFIG.anonKey
    );
    console.log('[Supabase] Client initialisé');
    return supabaseClient;
  } else {
    console.warn('[Supabase] Bibliothèque non chargée');
    return null;
  }
}

/* Authentification */
const SupabaseAuth = {
  /* Inscription d'un nouvel utilisateur */
  async signUp(email, password, userData) {
    try {
      const { data, error } = await supabaseClient.auth.signUp({
        email: email,
        password: password,
        options: {
          data: userData
        }
      });
      
      if (error) throw error;
      return { success: true, data: data };
    } catch (error) {
      console.error('[Supabase] Erreur inscription:', error.message);
      return { success: false, error: error.message };
    }
  },
  
  /* Connexion utilisateur */
  async signIn(email, password) {
    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
      });
      
      if (error) throw error;
      return { success: true, data: data };
    } catch (error) {
      console.error('[Supabase] Erreur connexion:', error.message);
      return { success: false, error: error.message };
    }
  },
  
  /* Connexion par téléphone (OTP) */
  async signInWithPhone(phone) {
    try {
      const { data, error } = await supabaseClient.auth.signInWithOtp({
        phone: phone
      });
      
      if (error) throw error;
      return { success: true, data: data };
    } catch (error) {
      console.error('[Supabase] Erreur OTP:', error.message);
      return { success: false, error: error.message };
    }
  },
  
  /* Déconnexion */
  async signOut() {
    try {
      const { error } = await supabaseClient.auth.signOut();
      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('[Supabase] Erreur déconnexion:', error.message);
      return { success: false, error: error.message };
    }
  },
  
  /* Récupérer l'utilisateur actuel */
  async getCurrentUser() {
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      return user;
    } catch (error) {
      console.error('[Supabase] Erreur récupération utilisateur:', error.message);
      return null;
    }
  },
  
  /* Réinitialisation mot de passe */
  async resetPassword(email) {
    try {
      const { data, error } = await supabaseClient.auth.resetPasswordForEmail(email);
      if (error) throw error;
      return { success: true, data: data };
    } catch (error) {
      console.error('[Supabase] Erreur réinitialisation:', error.message);
      return { success: false, error: error.message };
    }
  }
};

/* Opérations sur les données */
const SupabaseDB = {
  /* Récupérer toutes les lignes */
  async getLignes(filters = {}) {
    try {
      let query = supabaseClient
        .from(SUPABASE_CONFIG.tables.lignes)
        .select('*');
      
      if (filters.quartier) {
        query = query.eq('quartier_depart', filters.quartier);
      }
      if (filters.statut) {
        query = query.eq('statut', filters.statut);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return { success: true, data: data };
    } catch (error) {
      console.error('[Supabase] Erreur lignes:', error.message);
      return { success: false, error: error.message };
    }
  },
  
  /* Récupérer une ligne par ID */
  async getLigneById(id) {
    try {
      const { data, error } = await supabaseClient
        .from(SUPABASE_CONFIG.tables.lignes)
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return { success: true, data: data };
    } catch (error) {
      console.error('[Supabase] Erreur ligne:', error.message);
      return { success: false, error: error.message };
    }
  },
  
  /* Créer une réservation */
  async createReservation(reservationData) {
    try {
      const { data, error } = await supabaseClient
        .from(SUPABASE_CONFIG.tables.reservations)
        .insert([reservationData])
        .select();
      
      if (error) throw error;
      return { success: true, data: data };
    } catch (error) {
      console.error('[Supabase] Erreur réservation:', error.message);
      return { success: false, error: error.message };
    }
  },
  
  /* Récupérer l'historique des trajets */
  async getHistorique(userId, filters = {}) {
    try {
      let query = supabaseClient
        .from(SUPABASE_CONFIG.tables.historique)
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });
      
      if (filters.mois) {
        const debut = new Date(filters.mois);
        const fin = new Date(debut.getFullYear(), debut.getMonth() + 1, 0);
        query = query.gte('date', debut.toISOString()).lte('date', fin.toISOString());
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return { success: true, data: data };
    } catch (error) {
      console.error('[Supabase] Erreur historique:', error.message);
      return { success: false, error: error.message };
    }
  },
  
  /* Récupérer les notifications */
  async getNotifications(userId) {
    try {
      const { data, error } = await supabaseClient
        .from(SUPABASE_CONFIG.tables.notifications)
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return { success: true, data: data };
    } catch (error) {
      console.error('[Supabase] Erreur notifications:', error.message);
      return { success: false, error: error.message };
    }
  },
  
  /* Souscrire un abonnement */
  async createAbonnement(abonnementData) {
    try {
      const { data, error } = await supabaseClient
        .from(SUPABASE_CONFIG.tables.abonnements)
        .insert([abonnementData])
        .select();
      
      if (error) throw error;
      return { success: true, data: data };
    } catch (error) {
      console.error('[Supabase] Erreur abonnement:', error.message);
      return { success: false, error: error.message };
    }
  },
  
  /* Demande de location événement */
  async createEvenement(evenementData) {
    try {
      const { data, error } = await supabaseClient
        .from(SUPABASE_CONFIG.tables.evenements)
        .insert([evenementData])
        .select();
      
      if (error) throw error;
      return { success: true, data: data };
    } catch (error) {
      console.error('[Supabase] Erreur événement:', error.message);
      return { success: false, error: error.message };
    }
  },
  
  /* Mettre à jour le profil utilisateur */
  async updateProfile(userId, profileData) {
    try {
      const { data, error } = await supabaseClient
        .from(SUPABASE_CONFIG.tables.users)
        .update(profileData)
        .eq('id', userId)
        .select();
      
      if (error) throw error;
      return { success: true, data: data };
    } catch (error) {
      console.error('[Supabase] Erreur profil:', error.message);
      return { success: false, error: error.message };
    }
  }
};

/* Temps réel - Suivi GPS */
const SupabaseRealtime = {
  /* S'abonner aux mises à jour de position d'un bus */
  subscribeToBusPosition(busId, callback) {
    return supabaseClient
      .channel(`bus-${busId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'bus_positions',
        filter: `bus_id=eq.${busId}`
      }, callback)
      .subscribe();
  },
  
  /* Se désabonner */
  unsubscribe(channel) {
    supabaseClient.removeChannel(channel);
  }
};

/* Export pour utilisation globale */
window.SupabaseConfig = SUPABASE_CONFIG;
window.initSupabase = initSupabase;
window.SupabaseAuth = SupabaseAuth;
window.SupabaseDB = SupabaseDB;
window.SupabaseRealtime = SupabaseRealtime;
