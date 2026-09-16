(() => {
  'use strict';

  const API_BASE = '/api';
  const TOKEN_KEY = 'kontak_auth_token';
  const USER_KEY = 'kontak_user';
  const state = {
    contacts: [],
    editingId: null,
    authMode: 'login',
    phoneRows: [],
  };

  const elements = {
    authView: document.querySelector('#auth-view'),
    listView: document.querySelector('#list-view'),
    formView: document.querySelector('#form-view'),
    headerActions: document.querySelector('#header-actions'),
    userGreeting: document.querySelector('#user-greeting'),
    authTitle: document.querySelector('#auth-title'),
    authForm: document.querySelector('#auth-form'),
    authNameField: document.querySelector('#name-field'),
    authName: document.querySelector('#auth-name'),
    authEmail: document.querySelector('#auth-email'),
    authPassword: document.querySelector('#auth-password'),
    authError: document.querySelector('#auth-error'),
    authSubmit: document.querySelector('#auth-submit'),
    loginTab: document.querySelector('#login-tab'),
    registerTab: document.querySelector('#register-tab'),
    logoutButton: document.querySelector('#logout-button'),
    listTitle: document.querySelector('#list-title'),
    addContactButton: document.querySelector('#add-contact-button'),
    searchInput: document.querySelector('#search-input'),
    contactCount: document.querySelector('#contact-count'),
    listStatus: document.querySelector('#list-status'),
    contactGrid: document.querySelector('#contact-grid'),
    emptyState: document.querySelector('#empty-state'),
    formEyebrow: document.querySelector('#form-eyebrow'),
    formTitle: document.querySelector('#form-title'),
    contactForm: document.querySelector('#contact-form'),
    contactName: document.querySelector('#contact-name'),
    contactAddress: document.querySelector('#contact-address'),
    contactBirthday: document.querySelector('#contact-birthday'),
    phoneNote: document.querySelector('#phone-note'),
    phoneList: document.querySelector('#phone-list'),
    addPhoneButton: document.querySelector('#add-phone-button'),
    contactError: document.querySelector('#contact-error'),
    saveContact: document.querySelector('#save-contact'),
    cancelForm: document.querySelector('#cancel-form'),
    backToList: document.querySelector('#back-to-list'),
    toast: document.querySelector('#toast'),
  };

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function getStoredUser() {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    } catch {
      return null;
    }
  }

  function setAuth(token, user = null) {
    localStorage.setItem(TOKEN_KEY, token);
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  function clearAuth() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;',
    })[character]);
  }

  function formatDate(value) {
    if (!value) return 'Birthday not set';
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
  }

  function initials(name) {
    return String(name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  }

  function showView(view) {
    elements.authView.hidden = view !== 'auth';
    elements.listView.hidden = view !== 'list';
    elements.formView.hidden = view !== 'form';
    elements.headerActions.hidden = view === 'auth';
  }

  function setError(element, message) {
    element.textContent = message;
    element.hidden = !message;
  }

  function showToast(message, isError = false) {
    elements.toast.textContent = message;
    elements.toast.classList.toggle('is-error', isError);
    elements.toast.hidden = false;
    window.clearTimeout(showToast.timeout);
    showToast.timeout = window.setTimeout(() => { elements.toast.hidden = true; }, 3200);
  }

  function apiError(payload, response) {
    if (payload?.errors) {
      return Object.values(payload.errors).flat().join(' ');
    }
    return payload?.message || `Request failed (${response.status}).`;
  }

  async function request(path, options = {}) {
    const headers = { Accept: 'application/json', ...(options.headers || {}) };
    if (options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
    if (getToken()) headers.Authorization = `Bearer ${getToken()}`;
    const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
    const text = await response.text();
    let payload = null;
    try { payload = text ? JSON.parse(text) : null; } catch { payload = { message: text }; }
    if (!response.ok) {
      if (response.status === 401) {
        clearAuth();
        showView('auth');
      }
      throw new Error(apiError(payload, response));
    }
    return payload;
  }

  function updateAuthMode(mode) {
    state.authMode = mode;
    const register = mode === 'register';
    elements.authNameField.hidden = !register;
    elements.authPassword.autocomplete = register ? 'new-password' : 'current-password';
    elements.authTitle.textContent = register ? 'Make room for your people.' : 'Keep your people close.';
    elements.authSubmit.textContent = register ? 'Create account' : 'Log in';
    elements.loginTab.classList.toggle('is-active', !register);
    elements.registerTab.classList.toggle('is-active', register);
    elements.loginTab.setAttribute('aria-selected', String(!register));
    elements.registerTab.setAttribute('aria-selected', String(register));
    setError(elements.authError, '');
  }

  async function handleAuth(event) {
    event.preventDefault();
    setError(elements.authError, '');
    const isRegister = state.authMode === 'register';
    const body = {
      email: elements.authEmail.value.trim(),
      password: elements.authPassword.value,
    };
    if (isRegister) body.name = elements.authName.value.trim();
    if (!body.email || !body.password || (isRegister && !body.name)) {
      setError(elements.authError, 'Please fill in every field.');
      return;
    }
    elements.authSubmit.disabled = true;
    elements.authSubmit.textContent = isRegister ? 'Creating...' : 'Logging in...';
    try {
      const payload = await request(isRegister ? '/register' : '/login', { method: 'POST', body: JSON.stringify(body) });
      setAuth(payload.token, payload.user || null);
      elements.authForm.reset();
      await enterApp();
      showToast(isRegister ? 'Your account is ready.' : 'Welcome back.');
    } catch (error) {
      setError(elements.authError, error.message);
    } finally {
      elements.authSubmit.disabled = false;
      elements.authSubmit.textContent = isRegister ? 'Create account' : 'Log in';
    }
  }

  function renderContactCard(contact) {
    const phones = Array.isArray(contact.phones) ? contact.phones : [];
    const phoneMarkup = phones.length
      ? phones.map((phone) => `<span class="phone-chip"><strong>${escapeHtml(phone.jenis)}</strong><span>${escapeHtml(phone.nomor_telepon)}</span></span>`).join('')
      : '<span class="contact-meta">No phone numbers</span>';
    return `<article class="contact-card card">
      <div class="contact-card-top">
        <div class="contact-avatar" aria-hidden="true">${escapeHtml(initials(contact.nama))}</div>
        <div class="contact-menu">
          <button class="icon-button" type="button" data-edit-id="${contact.id}" aria-label="Edit ${escapeHtml(contact.nama)}" title="Edit">✎</button>
          <button class="icon-button" type="button" data-delete-id="${contact.id}" aria-label="Delete ${escapeHtml(contact.nama)}" title="Delete">×</button>
        </div>
      </div>
      <h2>${escapeHtml(contact.nama)}</h2>
      <p class="contact-address">${escapeHtml(contact.alamat)}</p>
      <div class="phone-chips">${phoneMarkup}</div>
      <div class="contact-meta"><span>Born</span><strong>${escapeHtml(formatDate(contact.tanggal_lahir))}</strong></div>
    </article>`;
  }

  function renderContacts() {
    const query = elements.searchInput.value.trim().toLowerCase();
    const filtered = state.contacts.filter((contact) => [contact.nama, contact.alamat].some((value) => String(value || '').toLowerCase().includes(query)));
    elements.contactGrid.innerHTML = filtered.map(renderContactCard).join('');
    elements.contactCount.textContent = `${filtered.length} ${filtered.length === 1 ? 'contact' : 'contacts'}`;
    elements.emptyState.hidden = state.contacts.length !== 0 || query !== '';
    elements.contactGrid.hidden = filtered.length === 0;
    if (query && filtered.length === 0) {
      elements.listStatus.textContent = `No contacts match "${query}".`;
      elements.listStatus.hidden = false;
    } else {
      elements.listStatus.hidden = true;
    }
  }

  async function loadContacts() {
    elements.contactGrid.hidden = true;
    elements.emptyState.hidden = true;
    elements.listStatus.textContent = 'Loading contacts...';
    elements.listStatus.hidden = false;
    try {
      const payload = await request('/kontak');
      state.contacts = Array.isArray(payload) ? payload : [];
      renderContacts();
    } catch (error) {
      elements.listStatus.textContent = error.message;
      elements.listStatus.hidden = false;
    }
  }

  function addPhoneRow(phone = { jenis: 'HP', nomor_telepon: '' }) {
    state.phoneRows.push({ jenis: phone.jenis || 'HP', nomor_telepon: phone.nomor_telepon || '' });
    renderPhoneRows();
  }

  function renderPhoneRows() {
    elements.phoneList.innerHTML = state.phoneRows.map((phone, index) => `<div class="phone-row" data-phone-index="${index}">
      <div class="field"><label for="phone-type-${index}">Jenis</label><select id="phone-type-${index}" data-phone-field="jenis"><option ${phone.jenis === 'Rumah' ? 'selected' : ''}>Rumah</option><option ${phone.jenis === 'HP' ? 'selected' : ''}>HP</option><option ${phone.jenis === 'Kantor' ? 'selected' : ''}>Kantor</option></select></div>
      <div class="field"><label for="phone-number-${index}">Nomor telepon</label><input id="phone-number-${index}" data-phone-field="nomor_telepon" type="tel" value="${escapeHtml(phone.nomor_telepon)}" placeholder="08..." required></div>
      <button class="remove-phone" type="button" data-remove-phone="${index}" aria-label="Remove phone number">×</button>
    </div>`).join('');
    elements.phoneNote.textContent = `${state.phoneRows.length} ${state.phoneRows.length === 1 ? 'number' : 'numbers'} added`;
  }

  function openContactForm(contact = null) {
    state.editingId = contact?.id || null;
    state.phoneRows = contact?.phones?.length ? contact.phones.map((phone) => ({ jenis: phone.jenis, nomor_telepon: phone.nomor_telepon })) : [];
    elements.formEyebrow.textContent = contact ? 'Update entry' : 'New entry';
    elements.formTitle.textContent = contact ? 'Edit a kontak' : 'Add a kontak';
    elements.saveContact.textContent = contact ? 'Save changes' : 'Save kontak';
    elements.contactName.value = contact?.nama || '';
    elements.contactAddress.value = contact?.alamat || '';
    elements.contactBirthday.value = contact?.tanggal_lahir ? String(contact.tanggal_lahir).slice(0, 10) : '';
    setError(elements.contactError, '');
    renderPhoneRows();
    showView('form');
    elements.contactName.focus();
  }

  function closeContactForm() {
    showView('list');
    renderContacts();
  }

  async function handleContactSave(event) {
    event.preventDefault();
    setError(elements.contactError, '');
    const contact = {
      nama: elements.contactName.value.trim(),
      alamat: elements.contactAddress.value.trim(),
      tanggal_lahir: elements.contactBirthday.value,
    };
    if (!contact.nama || !contact.alamat || !contact.tanggal_lahir) {
      setError(elements.contactError, 'Please complete the contact details.');
      return;
    }
    const phones = state.phoneRows.filter((phone) => phone.nomor_telepon.trim());
    if (phones.length !== state.phoneRows.length) {
      setError(elements.contactError, 'Add a number or remove the empty phone row.');
      return;
    }
    elements.saveContact.disabled = true;
    elements.saveContact.textContent = state.editingId ? 'Saving...' : 'Adding...';
    try {
      if (state.editingId) {
        const updated = await request(`/kontak/${state.editingId}`, { method: 'PUT', body: JSON.stringify(contact) });
        state.contacts = state.contacts.map((item) => item.id === state.editingId ? updated : item);
        showToast('Kontak updated.');
      } else {
        const created = await request('/kontak', { method: 'POST', body: JSON.stringify({ ...contact, phones }) });
        state.contacts = [created, ...state.contacts];
        showToast('Kontak added.');
      }
      closeContactForm();
    } catch (error) {
      setError(elements.contactError, error.message);
    } finally {
      elements.saveContact.disabled = false;
      elements.saveContact.textContent = state.editingId ? 'Save changes' : 'Save kontak';
    }
  }

  async function deleteContact(id) {
    const contact = state.contacts.find((item) => item.id === id);
    if (!contact || !window.confirm(`Delete ${contact.nama}?`)) return;
    try {
      await request(`/kontak/${id}`, { method: 'DELETE' });
      state.contacts = state.contacts.filter((item) => item.id !== id);
      renderContacts();
      showToast('Kontak deleted.');
    } catch (error) {
      showToast(error.message, true);
    }
  }

  async function logout() {
    try { await request('/logout', { method: 'POST' }); } catch { /* Token may already be expired. */ }
    clearAuth();
    state.contacts = [];
    showView('auth');
    updateAuthMode('login');
    showToast('You are logged out.');
  }

  async function enterApp() {
    const user = getStoredUser();
    elements.userGreeting.textContent = user?.name ? `Hi, ${user.name}` : 'Your contacts';
    showView('list');
    await loadContacts();
  }

  elements.loginTab.addEventListener('click', () => updateAuthMode('login'));
  elements.registerTab.addEventListener('click', () => updateAuthMode('register'));
  elements.authForm.addEventListener('submit', handleAuth);
  elements.logoutButton.addEventListener('click', logout);
  elements.addContactButton.addEventListener('click', () => openContactForm());
  document.querySelector('[data-empty-add]').addEventListener('click', () => openContactForm());
  elements.searchInput.addEventListener('input', renderContacts);
  elements.contactForm.addEventListener('submit', handleContactSave);
  elements.cancelForm.addEventListener('click', closeContactForm);
  elements.backToList.addEventListener('click', closeContactForm);
  elements.addPhoneButton.addEventListener('click', () => addPhoneRow());
  elements.phoneList.addEventListener('input', (event) => {
    const row = event.target.closest('[data-phone-index]');
    if (!row) return;
    state.phoneRows[Number(row.dataset.phoneIndex)][event.target.dataset.phoneField] = event.target.value;
  });
  elements.phoneList.addEventListener('change', (event) => {
    const row = event.target.closest('[data-phone-index]');
    if (!row) return;
    state.phoneRows[Number(row.dataset.phoneIndex)][event.target.dataset.phoneField] = event.target.value;
  });
  elements.phoneList.addEventListener('click', (event) => {
    const button = event.target.closest('[data-remove-phone]');
    if (!button) return;
    state.phoneRows.splice(Number(button.dataset.removePhone), 1);
    renderPhoneRows();
  });
  elements.contactGrid.addEventListener('click', (event) => {
    const editButton = event.target.closest('[data-edit-id]');
    const deleteButton = event.target.closest('[data-delete-id]');
    if (editButton) openContactForm(state.contacts.find((item) => item.id === Number(editButton.dataset.editId)));
    if (deleteButton) deleteContact(Number(deleteButton.dataset.deleteId));
  });

  updateAuthMode('login');
  if (getToken()) enterApp(); else showView('auth');
})();
