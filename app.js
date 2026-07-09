// Main application logic for call tracker

// Modal Manager for accessible dialogs
class ModalManager {
  constructor() {
    this.overlay = document.getElementById('modalOverlay');
    this.modal = document.querySelector('.modal');
    this.title = document.getElementById('modalTitle');
    this.message = document.getElementById('modalMessage');
    this.input = document.getElementById('modalInput');
    this.confirmBtn = document.getElementById('modalConfirm');
    this.cancelBtn = document.getElementById('modalCancel');
    this.closeBtn = document.getElementById('modalClose');

    this.confirmCallback = null;
    this.cancelCallback = null;
    this.previousFocus = null;

    this.setupEventListeners();
  }

  setupEventListeners() {
    this.confirmBtn.addEventListener('click', () => this.confirm());
    this.cancelBtn.addEventListener('click', () => this.cancel());
    this.closeBtn.addEventListener('click', () => this.cancel());
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.cancel();
    });

    document.addEventListener('keydown', (e) => {
      if (!this.overlay.classList.contains('active')) return;
      if (e.key === 'Escape') this.cancel();
      if (e.key === 'Enter') {
        e.preventDefault();
        this.confirm();
      }
    });
  }

  show(options = {}) {
    const {
      title = 'Confirm',
      message = '',
      confirmText = 'Confirm',
      cancelText = 'Cancel',
      showInput = false,
      inputValue = '',
      inputPlaceholder = '',
      onConfirm = null,
      onCancel = null
    } = options;

    this.title.textContent = title;
    this.message.textContent = message;
    this.confirmBtn.textContent = confirmText;
    this.cancelBtn.textContent = cancelText;

    if (showInput) {
      this.input.style.display = 'block';
      this.input.value = inputValue;
      this.input.placeholder = inputPlaceholder;
    } else {
      this.input.style.display = 'none';
    }

    this.confirmCallback = onConfirm;
    this.cancelCallback = onCancel;

    this.previousFocus = document.activeElement;
    this.overlay.classList.add('active');
    this.overlay.setAttribute('aria-hidden', 'false');

    // Focus the input if shown, otherwise focus confirm button
    if (showInput) {
      setTimeout(() => this.input.focus(), 100);
    } else {
      setTimeout(() => this.confirmBtn.focus(), 100);
    }
  }

  confirm() {
    const value = this.input.style.display === 'block' ? this.input.value : null;
    this.hide();
    if (this.confirmCallback) this.confirmCallback(value);
  }

  cancel() {
    this.hide();
    if (this.cancelCallback) this.cancelCallback();
  }

  hide() {
    this.overlay.classList.remove('active');
    this.overlay.setAttribute('aria-hidden', 'true');
    if (this.previousFocus) this.previousFocus.focus();
  }
}

class CallTracker {
  constructor() {
    this.currentView   = 'day';
    this.selectedDate  = new Date();
    this.editingCallId = null;
    this.contactFilter = '';
    this.modal = new ModalManager();
    this.init();
  }

  init() {
    Storage.init();
    this.cacheElements();
    this.attachEventListeners();
    this.loadContacts();
    this.render();
    document.addEventListener('keydown', (e) => {
      const active = document.activeElement;
      const isTyping = active === this.sheetLabelInput || active === this.contactSearch ||
                       active === this.manualTime || active.tagName === 'INPUT';
      const modalOpen = document.getElementById('modalOverlay').classList.contains('active');
      if (e.key === 'Enter' && !this.editingCallId && !isTyping && !modalOpen) {
        this.logCall();
      }
    });
  }

  cacheElements() {
    this.logCallBtn      = document.getElementById('logCallBtn');
    this.manualBtn       = document.getElementById('manualBtn');
    this.manualInput     = document.getElementById('manualInput');
    this.manualTime      = document.getElementById('manualTime');
    this.saveManualBtn   = document.getElementById('saveManualBtn');
    this.cancelManualBtn = document.getElementById('cancelManualBtn');

    this.viewDayBtn  = document.getElementById('viewDayBtn');
    this.viewWeekBtn = document.getElementById('viewWeekBtn');
    this.viewAllBtn  = document.getElementById('viewAllBtn');
    this.dateSelector = document.getElementById('dateSelector');

    this.totalCallsEl = document.getElementById('totalCalls');
    this.peakHourEl   = document.getElementById('peakHour');
    this.avgPerHourEl = document.getElementById('avgPerHour');

    this.callCountEl  = document.getElementById('callCount');
    this.callsList    = document.getElementById('callsList');
    this.hourlyChart  = document.getElementById('hourlyChart');
    this.tableBody    = document.getElementById('tableBody');

    this.exportCsvBtn  = document.getElementById('exportCsvBtn');
    this.exportJsonBtn = document.getElementById('exportJsonBtn');
    this.clearDataBtn  = document.getElementById('clearDataBtn');

    // New elements
    this.sheetLabelSection = document.getElementById('sheetLabelSection');
    this.sheetLabelInput   = document.getElementById('sheetLabel');
    this.csvUpload         = document.getElementById('csvUpload');
    this.contactUploadArea = document.getElementById('contactUploadArea');
    this.contactPanel      = document.getElementById('contactPanel');
    this.contactSearch     = document.getElementById('contactSearch');
    this.contactList       = document.getElementById('contactList');
    this.contactCountEl    = document.getElementById('contactCount');
    this.clearContactsBtn  = document.getElementById('clearContactsBtn');
  }

  attachEventListeners() {
    this.logCallBtn.addEventListener('click',      () => this.logCall());
    this.manualBtn.addEventListener('click',       () => this.toggleManualInput());
    this.saveManualBtn.addEventListener('click',   () => this.saveManualCall());
    this.cancelManualBtn.addEventListener('click', () => this.toggleManualInput(false));

    this.viewDayBtn.addEventListener('click',  () => this.setView('day'));
    this.viewWeekBtn.addEventListener('click', () => this.setView('week'));
    this.viewAllBtn.addEventListener('click',  () => this.setView('all'));

    this.dateSelector.addEventListener('change', (e) => {
      // Use noon to avoid UTC-offset edge cases
      this.selectedDate = new Date(e.target.value + 'T12:00:00');
      this.loadSheetLabel();
      this.render();
    });

    this.exportCsvBtn.addEventListener('click',  () => Export.exportToCSV(this.getFilteredCalls()));
    this.exportJsonBtn.addEventListener('click', () => Export.exportToJSON(this.getFilteredCalls()));
    this.clearDataBtn.addEventListener('click',  () => this.clearAllData());

    // Sheet label — save on blur or Enter
    this.sheetLabelInput.addEventListener('blur', () => this.saveSheetLabel());
    this.sheetLabelInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.sheetLabelInput.blur();
    });

    // CSV upload
    this.csvUpload.addEventListener('change', (e) => this.handleCSVUpload(e));

    // Contact search
    this.contactSearch.addEventListener('input', (e) => {
      this.contactFilter = e.target.value;
      this.renderContactPanel();
    });

    // Clear contacts
    this.clearContactsBtn.addEventListener('click', () => {
      this.modal.show({
        title: 'Clear Contact Sheet',
        message: 'Clear the contact sheet? Logged calls will not be affected.',
        confirmText: 'Clear',
        cancelText: 'Cancel',
        onConfirm: () => {
          Storage.clearContacts();
          this.contactFilter = '';
          this.loadContacts();
        }
      });
    });
  }

  // ── Sheet Label ───────────────────────────────────────────

  getDateKey() {
    const d = this.selectedDate;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  loadSheetLabel() {
    this.sheetLabelInput.value = Storage.getSheetLabel(this.getDateKey());
  }

  saveSheetLabel() {
    Storage.setSheetLabel(this.getDateKey(), this.sheetLabelInput.value.trim());
  }

  // ── Contacts ──────────────────────────────────────────────

  handleCSVUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    Export.parseContactsCSV(file)
      .then(contacts => {
        Storage.setContacts(contacts);
        this.contactFilter        = '';
        this.contactSearch.value  = '';
        this.loadContacts();
        e.target.value = ''; // allow re-uploading same file
      })
      .catch(err => {
        alert('Error parsing CSV: ' + err.message);
        e.target.value = '';
      });
  }

  loadContacts() {
    const contacts = Storage.getContacts();
    if (contacts.length > 0) {
      this.contactUploadArea.classList.add('hidden');
      this.contactPanel.classList.remove('hidden');
      this.renderContactPanel();
    } else {
      this.contactUploadArea.classList.remove('hidden');
      this.contactPanel.classList.add('hidden');
      this.contactCountEl.textContent = '';
    }
  }

  renderContactPanel() {
    const allContacts = Storage.getContacts();
    const query       = this.contactFilter.toLowerCase();
    const filtered    = query
      ? allContacts.filter(c =>
          c.name.toLowerCase().includes(query)    ||
          c.company.toLowerCase().includes(query) ||
          c.jobTitle.toLowerCase().includes(query)
        )
      : allContacts;

    this.contactCountEl.textContent = filtered.length === allContacts.length
      ? `${allContacts.length} contacts`
      : `${filtered.length} of ${allContacts.length} contacts`;

    // Count calls per contact logged today for badges
    const todayCalls = Storage.getCallsByDate(new Date());
    const calledToday = {};
    todayCalls.forEach(call => {
      if (call.contactId) calledToday[call.contactId] = (calledToday[call.contactId] || 0) + 1;
    });

    this.contactList.innerHTML = '';

    if (filtered.length === 0) {
      this.contactList.innerHTML = '<p class="empty-state">No contacts match your search.</p>';
      return;
    }

    filtered.forEach(contact => {
      const callCount  = calledToday[contact.id] || 0;
      const item       = document.createElement('div');
      item.className   = 'contact-item' + (callCount > 0 ? ' called-today' : '');

      const telHref = contact.phone
        ? `tel:${contact.phone.replace(/[^\d+]/g, '')}`
        : null;

      const metaParts   = [contact.jobTitle, contact.company].filter(Boolean);
      const linkedinHtml = contact.linkedin
        ? `<a href="${contact.linkedin}" target="_blank" class="contact-linkedin" title="LinkedIn profile">in</a>`
        : '';

      item.innerHTML = `
        <div class="contact-info">
          <div class="contact-name">${this._esc(contact.name)}${linkedinHtml}</div>
          ${metaParts.length ? `<div class="contact-meta">${this._esc(metaParts.join(' · '))}</div>` : ''}
        </div>
        <div class="contact-actions">
          ${callCount > 0 ? `<span class="contact-call-count">${callCount}× today</span>` : ''}
          ${telHref ? `<a href="${telHref}" class="contact-phone-link" data-id="${contact.id}">${this._esc(contact.phone)}</a>` : ''}
          <button class="btn-log-contact" data-id="${contact.id}">Log Call</button>
        </div>
      `;

      if (telHref) {
        item.querySelector('.contact-phone-link').addEventListener('click', (e) => {
          e.preventDefault();
          this.logCallFromContact(contact);
          window.location.href = telHref;
        });
      }

      item.querySelector('.btn-log-contact').addEventListener('click', () => {
        this.logCallFromContact(contact);
      });

      this.contactList.appendChild(item);
    });
  }

  logCallFromContact(contact) {
    Storage.addCall(null, contact);
    this.render();
    this.renderContactPanel(); // refresh today's call counts
  }

  _esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ── Core logging ──────────────────────────────────────────

  logCall() {
    Storage.addCall();
    this.render();
  }

  toggleManualInput(show = null) {
    const isHidden  = this.manualInput.classList.contains('hidden');
    const shouldShow = show !== null ? show : isHidden;
    if (shouldShow) {
      this.manualInput.classList.remove('hidden');
      this.manualTime.value = new Date().toISOString().slice(0, 16);
      this.manualTime.focus();
    } else {
      this.manualInput.classList.add('hidden');
    }
  }

  saveManualCall() {
    const timestamp = this.manualTime.value;
    if (!timestamp) { alert('Please select a time'); return; }
    Storage.addCall(new Date(timestamp).toISOString());
    this.toggleManualInput(false);
    this.render();
  }

  // ── View ──────────────────────────────────────────────────

  setView(view) {
    this.currentView = view;
    [this.viewDayBtn, this.viewWeekBtn, this.viewAllBtn].forEach(b => b.classList.remove('active'));
    if (view === 'day')  this.viewDayBtn.classList.add('active');
    if (view === 'week') this.viewWeekBtn.classList.add('active');
    if (view === 'all')  this.viewAllBtn.classList.add('active');

    const isDay = view === 'day';
    this.dateSelector.style.display      = isDay ? 'inline-block' : 'none';
    this.sheetLabelSection.style.display = isDay ? 'flex' : 'none';

    this.render();
  }

  getFilteredCalls() {
    if (this.currentView === 'day') {
      return Storage.getCallsByDate(this.selectedDate);
    } else if (this.currentView === 'week') {
      const start = new Date(this.selectedDate);
      start.setDate(start.getDate() - start.getDay());
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      return Storage.getCallsByDateRange(start, end);
    }
    return Storage.getCalls() || [];
  }

  // ── Render ────────────────────────────────────────────────

  render() {
    const calls = this.getFilteredCalls();
    const stats = Storage.getSummaryStats(calls);

    this.updateStats(stats);
    this.updateChart(stats.hourly);
    this.updateTable(stats.hourly);
    this.updateCallsList(calls);
    this.updateDateSelector();
    if (this.currentView === 'day') this.loadSheetLabel();
  }

  updateStats(stats) {
    this.totalCallsEl.textContent = stats.total;
    this.peakHourEl.textContent   = stats.peakHour !== null
      ? `${stats.peakHour}:00 (${stats.peak})`
      : '—';
    this.avgPerHourEl.textContent = stats.average;
  }

  updateChart(hourlyData) {
    Charts.initChart(this.hourlyChart, hourlyData);
  }

  updateTable(hourlyData) {
    this.tableBody.innerHTML = '';
    hourlyData.forEach((count, hour) => {
      const row = document.createElement('tr');
      row.innerHTML = `<td>${hour.toString().padStart(2, '0')}:00</td><td>${count}</td>`;
      this.tableBody.appendChild(row);
    });
  }

  updateCallsList(calls) {
    const sorted = [...calls].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    this.callCountEl.textContent = `${sorted.length} call${sorted.length !== 1 ? 's' : ''}`;

    if (sorted.length === 0) {
      this.callsList.innerHTML = '<p class="empty-state">No calls for this period.</p>';
      return;
    }

    this.callsList.innerHTML = '';
    sorted.forEach(call => {
      const date    = new Date(call.timestamp);
      const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
      const dateStr = date.toLocaleDateString('en-US');

      const contactHtml = call.contactName
        ? `<div class="call-contact-info">
             <div class="call-contact-name">${this._esc(call.contactName)}</div>
             ${call.contactCompany ? `<div class="call-contact-company">${this._esc(call.contactCompany)}</div>` : ''}
           </div>`
        : '';

      const item = document.createElement('div');
      item.className = 'call-item';
      item.innerHTML = `
        <div class="call-time">
          <div class="call-time-main">${timeStr}</div>
          <div class="call-time-sub">${dateStr}</div>
          ${contactHtml}
        </div>
        <div class="call-actions">
          <button class="btn-edit"   data-id="${call.id}">Edit</button>
          <button class="btn-delete" data-id="${call.id}">Delete</button>
        </div>
      `;

      item.querySelector('.btn-edit').addEventListener('click',   () => this.editCall(call.id, call.timestamp));
      item.querySelector('.btn-delete').addEventListener('click', () => this.deleteCall(call.id));
      this.callsList.appendChild(item);
    });
  }

  editCall(callId, currentTimestamp) {
    this.modal.show({
      title: 'Edit Call Time',
      message: 'Enter the new date and time for this call:',
      confirmText: 'Update',
      cancelText: 'Cancel',
      showInput: true,
      inputValue: currentTimestamp.slice(0, 16),
      inputPlaceholder: 'YYYY-MM-DDTHH:mm',
      onConfirm: (newTimestamp) => {
        if (!newTimestamp) return;
        try {
          const date = new Date(newTimestamp);
          if (isNaN(date.getTime())) {
            alert('Invalid date/time format. Please use YYYY-MM-DDTHH:mm');
            return;
          }
          Storage.updateCall(callId, date.toISOString());
          this.render();
        } catch (e) {
          alert('Error updating call: ' + e.message);
        }
      }
    });
  }

  deleteCall(callId) {
    this.modal.show({
      title: 'Delete Call',
      message: 'Delete this call? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      onConfirm: () => {
        Storage.deleteCall(callId);
        this.render();
      }
    });
  }

  clearAllData() {
    this.modal.show({
      title: 'Clear All Data',
      message: 'Delete all calls? This cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      onConfirm: () => {
        // Show second confirmation
        this.modal.show({
          title: 'Confirm Deletion',
          message: 'Are you absolutely sure? This will permanently delete all data.',
          confirmText: 'Yes, Delete All',
          cancelText: 'Cancel',
          onConfirm: () => {
            Storage.clear();
            this.loadContacts();
            this.render();
          }
        });
      }
    });
  }

  updateDateSelector() {
    if (this.currentView === 'day') {
      this.dateSelector.value = this.getDateKey();
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new CallTracker());
} else {
  new CallTracker();
}
