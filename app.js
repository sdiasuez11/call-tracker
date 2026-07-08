// Main application logic for call tracker

class CallTracker {
  constructor() {
    this.currentView   = 'day';
    this.selectedDate  = new Date();
    this.editingCallId = null;
    this.contactFilter = '';
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
      if (e.key === 'Enter' && !this.editingCallId && !isTyping) {
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
      if (confirm('Clear the contact sheet? Logged calls will not be affected.')) {
        Storage.clearContacts();
        this.contactFilter = '';
        this.loadContacts();
      }
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
          ${telHref ? `<a href="${telHref}" class="contact-phone-link">${this._esc(contact.phone)}</a>` : ''}
          <button class="btn-log-contact" data-id="${contact.id}">Log Call</button>
        </div>
      `;

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
    const newTimestamp = prompt('Enter new time:', currentTimestamp.slice(0, 16));
    if (newTimestamp) {
      try {
        const date = new Date(newTimestamp);
        if (isNaN(date.getTime())) { alert('Invalid date/time format'); return; }
        Storage.updateCall(callId, date.toISOString());
        this.render();
      } catch (e) {
        alert('Error updating call: ' + e.message);
      }
    }
  }

  deleteCall(callId) {
    if (confirm('Delete this call?')) {
      Storage.deleteCall(callId);
      this.render();
    }
  }

  clearAllData() {
    if (confirm('Delete all calls? This cannot be undone.')) {
      if (confirm('Are you absolutely sure? This will permanently delete all data.')) {
        Storage.clear();
        this.loadContacts();
        this.render();
      }
    }
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
