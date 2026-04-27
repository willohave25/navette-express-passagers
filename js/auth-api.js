/**
 * NAVETTE EXPRESS — Auth Bridge API
 * PWA Passagers — Remplace la simulation par l'API backend
 * JAEBETS HOLDING
 */
(function () {
  'use strict';

  const API_BASE = 'https://api.jaebets-holding.com';

  // ─── Helpers ──────────────────────────────────────────
  function saveToken(token, user) {
    localStorage.setItem('userToken', token);
    localStorage.setItem('userName', user.full_name);
    localStorage.setItem('navette_user', JSON.stringify(user));
  }

  function getToken() {
    return localStorage.getItem('userToken');
  }

  function clearAuth() {
    localStorage.removeItem('userToken');
    localStorage.removeItem('userName');
    localStorage.removeItem('navette_user');
  }

  async function apiCall(path, method, body, withAuth = false) {
    const headers = { 'Content-Type': 'application/json' };
    if (withAuth) {
      const t = getToken();
      if (t) headers['Authorization'] = 'Bearer ' + t;
    }
    const res = await fetch(API_BASE + path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });
    return res.json();
  }

  function showToastMsg(msg, type = 'error') {
    if (window.showToast) { window.showToast(msg, type); return; }
    if (window.Toast?.error) { window.Toast[type](msg); return; }
    alert(msg);
  }

  function showLoad(msg) {
    if (window.showLoading) window.showLoading(msg || 'Connexion en cours...');
  }

  function hideLoad() {
    if (window.hideLoading) window.hideLoading();
  }

  // ─── Vérification session ─────────────────────────────
  function checkAuth() {
    const page = window.location.pathname.split('/').pop() || 'index.html';
    const publicPages = ['index.html', 'connexion.html', 'inscription.html', 'onboarding.html', 'erreur.html', ''];
    if (publicPages.includes(page)) return;
    if (!getToken()) window.location.href = 'connexion.html';
  }

  // ─── Intercepte formulaire de CONNEXION ───────────────
  function hookConnexionForm() {
    const form = document.querySelector('.auth-form form, form[id*="login"], form[class*="login"]');
    if (!form) return;
    // S'assurer qu'on est sur une page connexion
    const page = window.location.pathname.split('/').pop();
    if (!['connexion.html', ''].includes(page) && page !== '') return;

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      e.stopImmediatePropagation();

      const emailInput = form.querySelector('input[type="email"], input[name="email"], input[id*="email"]');
      const passwordInput = form.querySelector('input[type="password"], input[name="password"]');

      if (!emailInput || !passwordInput) return;

      const email = emailInput.value.trim();
      const password = passwordInput.value;

      if (!email || !password) { showToastMsg('Remplissez tous les champs.'); return; }

      showLoad('Connexion en cours...');

      try {
        const data = await apiCall('/api/auth/login', 'POST', { email, password });
        hideLoad();

        if (!data.success) {
          showToastMsg(data.error?.message || 'Identifiants invalides');
          return;
        }

        saveToken(data.data.token, data.data.user);
        showToastMsg('Connexion réussie !', 'success');
        setTimeout(() => { window.location.href = 'accueil.html'; }, 600);

      } catch (err) {
        hideLoad();
        showToastMsg('Impossible de contacter le serveur.');
      }

    }, true);
  }

  // ─── Intercepte formulaire d'INSCRIPTION ──────────────
  function hookInscriptionForm() {
    const page = window.location.pathname.split('/').pop();
    if (!['inscription.html'].includes(page)) return;

    const form = document.querySelector('.auth-form form, form[id*="register"], form[class*="register"]');
    if (!form) return;

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      e.stopImmediatePropagation();

      const emailInput = form.querySelector('input[type="email"], input[name="email"]');
      const passwordInput = form.querySelector('input[type="password"], input[name="password"]');
      const nameInput = form.querySelector('input[name="name"], input[name="full_name"], input[name="prenom"], input[placeholder*="nom" i], input[placeholder*="prénom" i]');
      const phoneInput = form.querySelector('input[type="tel"], input[name="phone"], input[name="telephone"]');

      const email = emailInput?.value.trim();
      const password = passwordInput?.value;
      const full_name = nameInput?.value.trim() || email?.split('@')[0];
      const phone = phoneInput?.value.trim();

      if (!email || !password) { showToastMsg('Email et mot de passe requis.'); return; }

      showLoad('Création du compte...');

      try {
        const data = await apiCall('/api/auth/register', 'POST', {
          email, password, full_name, phone, role: 'passenger'
        });
        hideLoad();

        if (!data.success) {
          showToastMsg(data.error?.message || 'Erreur lors de l\'inscription');
          return;
        }

        saveToken(data.data.token, data.data.user);
        showToastMsg('Compte créé avec succès !', 'success');
        localStorage.setItem('hasSeenOnboarding', 'true');
        setTimeout(() => { window.location.href = 'lignes-suggerees.html'; }, 800);

      } catch (err) {
        hideLoad();
        showToastMsg('Impossible de contacter le serveur.');
      }

    }, true);
  }

  // ─── Exposer NavetteAuth ──────────────────────────────
  window.NavetteAuth = {
    getToken,
    getUser() {
      try { return JSON.parse(localStorage.getItem('navette_user')); } catch(e) { return null; }
    },
    isLoggedIn: () => !!getToken(),
    logout() { clearAuth(); window.location.href = 'connexion.html'; },
    async apiFetch(path, options = {}) {
      const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
      const t = getToken();
      if (t) headers['Authorization'] = 'Bearer ' + t;
      const res = await fetch(API_BASE + path, { ...options, headers });
      if (res.status === 401) { this.logout(); return null; }
      return res.json();
    }
  };

  // ─── Init ─────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    checkAuth();
    hookConnexionForm();
    hookInscriptionForm();
  });

})();
