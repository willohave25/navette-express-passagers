/* 
 * Service Worker - Navette Express PWA
 * Gestion du cache et mode offline
 * W2K-Digital 2025
 */

const CACHE_NAME = 'navette-express-v1';
const OFFLINE_URL = 'erreur.html';

/* Ressources à mettre en cache lors de l'installation */
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/onboarding.html',
  '/inscription.html',
  '/connexion.html',
  '/accueil.html',
  '/lignes-suggerees.html',
  '/lignes.html',
  '/detail-ligne.html',
  '/reservation.html',
  '/abonnements.html',
  '/paiement.html',
  '/suivi.html',
  '/location-evenement.html',
  '/profil.html',
  '/historique.html',
  '/notifications.html',
  '/erreur.html',
  '/a-propos.html',
  '/installation.html',
  '/css/app.css',
  '/js/app.js',
  '/js/supabase-config.js',
  '/js/fineopay-config.js',
  '/manifest.json',
  '/images/logo/logo-jaebets.png',
  '/images/logo/logo-jaebets.webp'
];

/* Installation du Service Worker */
self.addEventListener('install', (event) => {
  console.log('[SW] Installation en cours...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Mise en cache des ressources');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => {
        console.log('[SW] Installation terminée');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Erreur lors de l\'installation:', error);
      })
  );
});

/* Activation du Service Worker */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activation en cours...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME)
            .map((cacheName) => {
              console.log('[SW] Suppression ancien cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('[SW] Activation terminée');
        return self.clients.claim();
      })
  );
});

/* Interception des requêtes réseau */
self.addEventListener('fetch', (event) => {
  /* Ignorer les requêtes non-GET */
  if (event.request.method !== 'GET') {
    return;
  }

  /* Ignorer les requêtes vers des API externes */
  if (event.request.url.includes('supabase') || 
      event.request.url.includes('fineopay') ||
      event.request.url.includes('googleapis')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        /* Retourner la version en cache si disponible */
        if (cachedResponse) {
          /* Mettre à jour le cache en arrière-plan */
          event.waitUntil(
            fetch(event.request)
              .then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                  caches.open(CACHE_NAME)
                    .then((cache) => cache.put(event.request, networkResponse.clone()));
                }
              })
              .catch(() => {
                /* Ignorer les erreurs réseau */
              })
          );
          return cachedResponse;
        }

        /* Sinon, récupérer depuis le réseau */
        return fetch(event.request)
          .then((networkResponse) => {
            /* Mettre en cache la nouvelle ressource */
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then((cache) => cache.put(event.request, responseClone));
            }
            return networkResponse;
          })
          .catch(() => {
            /* En cas d'erreur réseau, afficher la page offline pour les pages HTML */
            if (event.request.destination === 'document') {
              return caches.match(OFFLINE_URL);
            }
            return new Response('Ressource non disponible hors ligne', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
      })
  );
});

/* Gestion des notifications push */
self.addEventListener('push', (event) => {
  console.log('[SW] Notification push reçue');
  
  const options = {
    body: event.data ? event.data.text() : 'Nouvelle notification Navette Express',
    icon: '/images/icons/icon-192x192.png',
    badge: '/images/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Voir',
        icon: '/images/icons/checkmark.png'
      },
      {
        action: 'close',
        title: 'Fermer',
        icon: '/images/icons/close.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Navette Express', options)
  );
});

/* Gestion des clics sur les notifications */
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Clic sur notification');
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/notifications.html')
    );
  }
});

/* Synchronisation en arrière-plan */
self.addEventListener('sync', (event) => {
  console.log('[SW] Synchronisation en arrière-plan:', event.tag);
  
  if (event.tag === 'sync-reservations') {
    event.waitUntil(syncReservations());
  }
});

/* Fonction de synchronisation des réservations */
async function syncReservations() {
  try {
    /* Récupérer les réservations en attente depuis IndexedDB */
    const pendingReservations = await getPendingReservations();
    
    for (const reservation of pendingReservations) {
      await sendReservationToServer(reservation);
      await markReservationAsSynced(reservation.id);
    }
    
    console.log('[SW] Synchronisation des réservations terminée');
  } catch (error) {
    console.error('[SW] Erreur de synchronisation:', error);
  }
}

/* Placeholder - À implémenter avec IndexedDB */
async function getPendingReservations() {
  return [];
}

async function sendReservationToServer(reservation) {
  /* Placeholder - Envoi vers Supabase */
}

async function markReservationAsSynced(id) {
  /* Placeholder - Mise à jour IndexedDB */
}
