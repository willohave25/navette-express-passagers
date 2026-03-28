/*
 * Navette Express - PWA Passagers
 * JavaScript principal - Navigation et interactions
 * W2K-Digital 2025
 */

/* ============================================
   CONFIGURATION GLOBALE
   ============================================ */
const APP_CONFIG = {
  appName: 'Navette Express',
  version: '1.0.0',
  whatsappNumber: '+2250703285359',
  splashDuration: 2500,
  toastDuration: 3000,
  transitionDuration: 300
};

/* État global de l'application */
const APP_STATE = {
  currentPage: '',
  isOnline: navigator.onLine,
  user: null,
  notifications: 0
};

/* ============================================
   INITIALISATION
   ============================================ */
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function initApp() {
  console.log(`[${APP_CONFIG.appName}] Initialisation v${APP_CONFIG.version}`);
  
  /* Enregistrer le Service Worker */
  registerServiceWorker();
  
  /* Détecter la page actuelle */
  detectCurrentPage();
  
  /* Initialiser la navigation */
  initNavigation();
  
  /* Initialiser les événements globaux */
  initGlobalEvents();
  
  /* Initialiser le bouton WhatsApp */
  initWhatsAppButton();
  
  /* Écouter les changements de connexion */
  initOnlineStatus();
  
  /* Initialiser les composants spécifiques à la page */
  initPageComponents();
}

/* ============================================
   SERVICE WORKER
   ============================================ */
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('[SW] Enregistré avec succès:', registration.scope);
        
        /* Vérifier les mises à jour */
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              showToast('Nouvelle version disponible. Rechargez pour mettre à jour.', 'info');
            }
          });
        });
      })
      .catch((error) => {
        console.error('[SW] Erreur d\'enregistrement:', error);
      });
  }
}

/* ============================================
   NAVIGATION
   ============================================ */
function detectCurrentPage() {
  const path = window.location.pathname;
  const filename = path.split('/').pop() || 'splash.html';
  APP_STATE.currentPage = filename.replace('.html', '');
  
  /* Mettre à jour l'onglet actif dans la navigation */
  updateActiveNavItem();
}

function initNavigation() {
  /* Gérer les clics sur la navigation bottom */
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const href = item.getAttribute('href');
      if (href) {
        navigateTo(href);
      }
    });
  });
  
  /* Gérer les boutons retour */
  const backButtons = document.querySelectorAll('.header-btn[data-action="back"]');
  backButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      goBack();
    });
  });
  
  /* Gérer les liens internes */
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href]');
    if (link && !link.hasAttribute('target') && !link.getAttribute('href').startsWith('http') && !link.getAttribute('href').startsWith('tel:') && !link.getAttribute('href').startsWith('mailto:')) {
      e.preventDefault();
      navigateTo(link.getAttribute('href'));
    }
  });
}

function updateActiveNavItem() {
  const navItems = document.querySelectorAll('.nav-item');
  const pageToNav = {
    'accueil': 'accueil',
    'lignes': 'lignes',
    'lignes-suggerees': 'lignes',
    'detail-ligne': 'lignes',
    'suivi': 'suivi',
    'notifications': 'notifications',
    'profil': 'profil',
    'historique': 'profil',
    'abonnements': 'profil',
    'a-propos': 'profil'
  };
  
  const activeNav = pageToNav[APP_STATE.currentPage] || '';
  
  navItems.forEach(item => {
    const href = item.getAttribute('href');
    if (href && href.includes(activeNav)) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
}

function navigateTo(url, direction = 'forward') {
  /* Animation de transition */
  const transition = document.createElement('div');
  transition.className = 'page-transition';
  document.body.appendChild(transition);
  
  setTimeout(() => {
    window.location.href = url;
  }, APP_CONFIG.transitionDuration / 2);
}

function goBack() {
  if (window.history.length > 1) {
    window.history.back();
  } else {
    navigateTo('accueil.html');
  }
}

/* Navigation globale accessible */
window.navigateTo = navigateTo;
window.goBack = goBack;

/* ============================================
   ÉVÉNEMENTS GLOBAUX
   ============================================ */
function initGlobalEvents() {
  /* Empêcher le zoom sur double tap (iOS) */
  let lastTouchEnd = 0;
  document.addEventListener('touchend', (e) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
      e.preventDefault();
    }
    lastTouchEnd = now;
  }, false);
  
  /* Pull to refresh */
  initPullToRefresh();
  
  /* Gérer les modals */
  initModals();
  
  /* Gérer les accordéons */
  initAccordions();
  
  /* Gérer les FAQ */
  initFAQ();
}

/* ============================================
   PULL TO REFRESH
   ============================================ */
function initPullToRefresh() {
  let startY = 0;
  let isPulling = false;
  const threshold = 80;
  
  const pullablePages = ['accueil', 'lignes', 'notifications', 'historique'];
  if (!pullablePages.includes(APP_STATE.currentPage)) return;
  
  document.addEventListener('touchstart', (e) => {
    if (window.scrollY === 0) {
      startY = e.touches[0].pageY;
      isPulling = true;
    }
  }, { passive: true });
  
  document.addEventListener('touchmove', (e) => {
    if (!isPulling) return;
    
    const currentY = e.touches[0].pageY;
    const diff = currentY - startY;
    
    if (diff > 0 && diff < threshold * 2) {
      const indicator = document.querySelector('.pull-indicator');
      if (indicator) {
        indicator.classList.add('visible');
        indicator.style.transform = `translateY(${Math.min(diff, threshold)}px)`;
      }
    }
  }, { passive: true });
  
  document.addEventListener('touchend', () => {
    if (!isPulling) return;
    isPulling = false;
    
    const indicator = document.querySelector('.pull-indicator');
    if (indicator) {
      indicator.classList.remove('visible');
      indicator.style.transform = '';
    }
    
    /* Recharger la page si le seuil est atteint */
    /* Pour l'instant, simuler un rechargement */
  });
}

/* ============================================
   MODALS
   ============================================ */
function initModals() {
  /* Fermer en cliquant sur l'overlay */
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeModal(overlay);
      }
    });
  });
  
  /* Boutons de fermeture */
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
      const modal = btn.closest('.modal-overlay');
      if (modal) closeModal(modal);
    });
  });
  
  /* Fermer avec Escape */
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const activeModal = document.querySelector('.modal-overlay.active');
      if (activeModal) closeModal(activeModal);
    }
  });
}

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(modal) {
  if (typeof modal === 'string') {
    modal = document.getElementById(modal);
  }
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

window.openModal = openModal;
window.closeModal = closeModal;

/* ============================================
   ACCORDÉONS
   ============================================ */
function initAccordions() {
  document.querySelectorAll('.accordion-header').forEach(header => {
    header.addEventListener('click', () => {
      const item = header.closest('.accordion-item');
      const isActive = item.classList.contains('active');
      
      /* Fermer tous les autres */
      item.parentElement.querySelectorAll('.accordion-item').forEach(i => {
        i.classList.remove('active');
      });
      
      /* Toggle celui-ci */
      if (!isActive) {
        item.classList.add('active');
      }
    });
  });
}

/* ============================================
   FAQ
   ============================================ */
function initFAQ() {
  document.querySelectorAll('.faq-question').forEach(question => {
    question.addEventListener('click', () => {
      const item = question.closest('.faq-item');
      const isActive = item.classList.contains('active');
      
      /* Fermer tous les autres */
      document.querySelectorAll('.faq-item').forEach(i => {
        i.classList.remove('active');
      });
      
      /* Toggle celui-ci */
      if (!isActive) {
        item.classList.add('active');
      }
    });
  });
}

/* ============================================
   WHATSAPP
   ============================================ */
function initWhatsAppButton() {
  const fab = document.querySelector('.whatsapp-fab');
  if (fab) {
    fab.addEventListener('click', (e) => {
      e.preventDefault();
      openWhatsApp();
    });
  }
}

function openWhatsApp(message = '') {
  const phone = APP_CONFIG.whatsappNumber.replace(/[^0-9]/g, '');
  const url = `https://wa.me/${phone}${message ? '?text=' + encodeURIComponent(message) : ''}`;
  window.open(url, '_blank');
}

window.openWhatsApp = openWhatsApp;

/* ============================================
   STATUT EN LIGNE
   ============================================ */
function initOnlineStatus() {
  window.addEventListener('online', () => {
    APP_STATE.isOnline = true;
    showToast('Connexion rétablie', 'success');
  });
  
  window.addEventListener('offline', () => {
    APP_STATE.isOnline = false;
    showToast('Connexion perdue. Mode hors ligne activé.', 'warning');
  });
}

/* ============================================
   TOASTS / NOTIFICATIONS
   ============================================ */
function showToast(message, type = 'info') {
  /* Supprimer les toasts existants */
  document.querySelectorAll('.toast').forEach(t => t.remove());
  
  const icons = {
    success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-6"/></svg>',
    error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>',
    warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9v4M12 17h.01"/><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>'
  };
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type]}</span>
    <span class="toast-message">${message}</span>
    <button class="toast-close" onclick="this.parentElement.remove()">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
    </button>
  `;
  
  document.body.appendChild(toast);
  
  /* Afficher avec animation */
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });
  
  /* Auto-fermeture */
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, APP_CONFIG.toastDuration);
}

window.showToast = showToast;

/* ============================================
   LOADING
   ============================================ */
function showLoading(message = 'Chargement...') {
  const overlay = document.createElement('div');
  overlay.className = 'loading-overlay';
  overlay.id = 'loading-overlay';
  overlay.innerHTML = `
    <div class="loading-spinner"></div>
    <p class="loading-text">${message}</p>
  `;
  document.body.appendChild(overlay);
}

function hideLoading() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) {
    overlay.remove();
  }
}

window.showLoading = showLoading;
window.hideLoading = hideLoading;

/* ============================================
   COMPOSANTS SPÉCIFIQUES AUX PAGES
   ============================================ */
function initPageComponents() {
  switch (APP_STATE.currentPage) {
    case 'splash':
      initSplashScreen();
      break;
    case 'onboarding':
      initOnboarding();
      break;
    case 'inscription':
    case 'connexion':
      initAuthForms();
      break;
    case 'reservation':
      initSeatSelection();
      break;
    case 'paiement':
      initPaymentMethods();
      break;
    case 'location-evenement':
      initEventWizard();
      break;
  }
}

/* ============================================
   SPLASH SCREEN
   ============================================ */
function initSplashScreen() {
  setTimeout(() => {
    /* Vérifier si l'utilisateur a déjà vu l'onboarding */
    const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');
    const isLoggedIn = localStorage.getItem('userToken');
    
    if (isLoggedIn) {
      navigateTo('accueil.html');
    } else if (hasSeenOnboarding) {
      navigateTo('connexion.html');
    } else {
      navigateTo('onboarding.html');
    }
  }, APP_CONFIG.splashDuration);
}

/* ============================================
   ONBOARDING
   ============================================ */
function initOnboarding() {
  let currentSlide = 0;
  const slides = document.querySelectorAll('.onboarding-slide');
  const dots = document.querySelectorAll('.onboarding-dot');
  const totalSlides = slides.length;
  
  if (!slides.length) return;
  
  /* Afficher le premier slide */
  updateSlide(0);
  
  /* Swipe detection */
  let startX = 0;
  let endX = 0;
  
  const slidesContainer = document.querySelector('.onboarding-slides');
  if (slidesContainer) {
    slidesContainer.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
    }, { passive: true });
    
    slidesContainer.addEventListener('touchend', (e) => {
      endX = e.changedTouches[0].clientX;
      const diff = startX - endX;
      
      if (Math.abs(diff) > 50) {
        if (diff > 0 && currentSlide < totalSlides - 1) {
          /* Swipe left - next */
          currentSlide++;
          updateSlide(currentSlide);
        } else if (diff < 0 && currentSlide > 0) {
          /* Swipe right - prev */
          currentSlide--;
          updateSlide(currentSlide);
        }
      }
    }, { passive: true });
  }
  
  /* Bouton suivant/CTA */
  const nextBtn = document.querySelector('.onboarding-next');
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (currentSlide < totalSlides - 1) {
        currentSlide++;
        updateSlide(currentSlide);
      } else {
        finishOnboarding();
      }
    });
  }
  
  /* Bouton skip */
  const skipBtn = document.querySelector('.onboarding-skip');
  if (skipBtn) {
    skipBtn.addEventListener('click', finishOnboarding);
  }
  
  function updateSlide(index) {
    slides.forEach((slide, i) => {
      slide.classList.remove('active', 'prev');
      if (i === index) {
        slide.classList.add('active');
      } else if (i < index) {
        slide.classList.add('prev');
      }
    });
    
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === index);
    });
    
    /* Changer le texte du bouton sur le dernier slide */
    if (nextBtn) {
      nextBtn.textContent = index === totalSlides - 1 ? 'Rejoindre Navette Express' : 'Suivant';
    }
  }
  
  function finishOnboarding() {
    localStorage.setItem('hasSeenOnboarding', 'true');
    navigateTo('inscription.html');
  }
}

/* ============================================
   FORMULAIRES AUTH
   ============================================ */
function initAuthForms() {
  const form = document.querySelector('.auth-form form');
  if (!form) return;
  
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    /* Validation */
    let isValid = true;
    const inputs = form.querySelectorAll('.form-input[required]');
    
    inputs.forEach(input => {
      if (!validateInput(input)) {
        isValid = false;
      }
    });
    
    if (isValid) {
      /* Simuler l'envoi */
      showLoading('Connexion en cours...');
      
      setTimeout(() => {
        hideLoading();
        /* Stocker un token fictif */
        localStorage.setItem('userToken', 'demo-token');
        localStorage.setItem('userName', 'Utilisateur');
        
        /* Rediriger vers les lignes suggérées (après inscription) ou accueil (connexion) */
        if (APP_STATE.currentPage === 'inscription') {
          navigateTo('lignes-suggerees.html');
        } else {
          navigateTo('accueil.html');
        }
      }, 1500);
    }
  });
  
  /* Validation en temps réel */
  form.querySelectorAll('.form-input').forEach(input => {
    input.addEventListener('blur', () => validateInput(input));
    input.addEventListener('input', () => {
      input.classList.remove('error');
      const errorMsg = input.parentElement.querySelector('.form-error');
      if (errorMsg) errorMsg.remove();
    });
  });
}

function validateInput(input) {
  const value = input.value.trim();
  const type = input.type;
  const name = input.name;
  let isValid = true;
  let errorMessage = '';
  
  /* Supprimer les erreurs précédentes */
  input.classList.remove('error');
  const existingError = input.parentElement.querySelector('.form-error');
  if (existingError) existingError.remove();
  
  /* Vérifications */
  if (input.required && !value) {
    isValid = false;
    errorMessage = 'Ce champ est requis';
  } else if (type === 'email' && value && !isValidEmail(value)) {
    isValid = false;
    errorMessage = 'Email invalide';
  } else if (type === 'tel' && value && !isValidPhone(value)) {
    isValid = false;
    errorMessage = 'Numéro de téléphone invalide';
  } else if (name === 'password' && value && value.length < 8) {
    isValid = false;
    errorMessage = 'Minimum 8 caractères';
  }
  
  if (!isValid) {
    input.classList.add('error');
    const errorDiv = document.createElement('div');
    errorDiv.className = 'form-error';
    errorDiv.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg> ${errorMessage}`;
    input.parentElement.appendChild(errorDiv);
  }
  
  return isValid;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone) {
  return /^[0-9\s\-\+]{8,}$/.test(phone);
}

/* ============================================
   SÉLECTION DE SIÈGE
   ============================================ */
function initSeatSelection() {
  const seats = document.querySelectorAll('.seat:not(.taken):not(.aisle)');
  let selectedSeat = null;
  
  seats.forEach(seat => {
    seat.addEventListener('click', () => {
      /* Désélectionner le précédent */
      if (selectedSeat) {
        selectedSeat.classList.remove('selected');
      }
      
      /* Sélectionner le nouveau */
      seat.classList.add('selected');
      selectedSeat = seat;
      
      /* Mettre à jour l'info */
      const seatInfo = document.querySelector('.selected-seat-info');
      if (seatInfo) {
        seatInfo.innerHTML = `Siège sélectionné : <strong>${seat.textContent}</strong>`;
        seatInfo.classList.add('fade-in');
      }
      
      /* Activer le bouton de confirmation */
      const confirmBtn = document.querySelector('.btn-confirm-reservation');
      if (confirmBtn) {
        confirmBtn.disabled = false;
      }
    });
  });
}

/* ============================================
   MÉTHODES DE PAIEMENT
   ============================================ */
function initPaymentMethods() {
  const methods = document.querySelectorAll('.payment-method');
  
  methods.forEach(method => {
    method.addEventListener('click', () => {
      /* Désélectionner tous */
      methods.forEach(m => m.classList.remove('selected'));
      
      /* Sélectionner celui-ci */
      method.classList.add('selected');
      
      /* Stocker la méthode sélectionnée */
      const methodId = method.dataset.method;
      localStorage.setItem('selectedPaymentMethod', methodId);
      
      /* Activer le bouton payer */
      const payBtn = document.querySelector('.btn-pay');
      if (payBtn) {
        payBtn.disabled = false;
      }
    });
  });
}

/* ============================================
   WIZARD ÉVÉNEMENT
   ============================================ */
function initEventWizard() {
  let currentStep = 1;
  const totalSteps = 6;
  const wizardData = {};
  
  /* Types d'événements */
  const eventTypes = document.querySelectorAll('.event-type');
  eventTypes.forEach(type => {
    type.addEventListener('click', () => {
      eventTypes.forEach(t => t.classList.remove('selected'));
      type.classList.add('selected');
      wizardData.eventType = type.dataset.type;
    });
  });
  
  /* Options de bus */
  const busOptions = document.querySelectorAll('.bus-option');
  busOptions.forEach(option => {
    option.addEventListener('click', () => {
      busOptions.forEach(o => o.classList.remove('selected'));
      option.classList.add('selected');
      wizardData.busType = option.dataset.bus;
    });
  });
  
  /* Navigation wizard */
  const nextBtns = document.querySelectorAll('.wizard-next');
  const prevBtns = document.querySelectorAll('.wizard-prev');
  
  nextBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (currentStep < totalSteps) {
        goToStep(currentStep + 1);
      }
    });
  });
  
  prevBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (currentStep > 1) {
        goToStep(currentStep - 1);
      }
    });
  });
  
  function goToStep(step) {
    /* Mettre à jour les indicateurs */
    document.querySelectorAll('.wizard-step').forEach((s, i) => {
      s.classList.remove('active', 'completed');
      if (i + 1 < step) s.classList.add('completed');
      if (i + 1 === step) s.classList.add('active');
    });
    
    document.querySelectorAll('.wizard-line').forEach((l, i) => {
      l.classList.toggle('completed', i + 1 < step);
    });
    
    /* Afficher le contenu de l'étape */
    document.querySelectorAll('.wizard-content > div').forEach((content, i) => {
      content.classList.toggle('hidden', i + 1 !== step);
    });
    
    currentStep = step;
  }
}

/* ============================================
   UTILITAIRES
   ============================================ */

/* Formater un montant en FCFA */
function formatCurrency(amount) {
  return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
}

/* Formater une date */
function formatDate(date, format = 'short') {
  const d = new Date(date);
  const options = format === 'short' 
    ? { day: '2-digit', month: '2-digit', year: 'numeric' }
    : { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
  return d.toLocaleDateString('fr-FR', options);
}

/* Formater une heure */
function formatTime(date) {
  return new Date(date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

/* Debounce */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/* Throttle */
function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/* Storage helpers */
const Storage = {
  get(key, defaultValue = null) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : defaultValue;
    } catch {
      return defaultValue;
    }
  },
  
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },
  
  remove(key) {
    localStorage.removeItem(key);
  },
  
  clear() {
    localStorage.clear();
  }
};

/* Export des utilitaires */
window.formatCurrency = formatCurrency;
window.formatDate = formatDate;
window.formatTime = formatTime;
window.Storage = Storage;

/* ============================================
   DÉCONNEXION
   ============================================ */
function logout() {
  Storage.remove('userToken');
  Storage.remove('userName');
  navigateTo('connexion.html');
}

window.logout = logout;

/* ============================================
   FIN DU FICHIER
   ============================================ */
console.log(`[${APP_CONFIG.appName}] Script principal chargé`);
