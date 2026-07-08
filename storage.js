// localStorage persistence layer for call tracker

const CALLS_KEY        = 'callTracker:calls';
const PREFS_KEY        = 'callTracker:preferences';
const SHEET_LABELS_KEY = 'callTracker:sheetLabels';
const CONTACTS_KEY     = 'callTracker:contacts';

const Storage = {
  init() {
    if (!this.getCalls()) this.setCalls([]);
    if (!this.getPreferences()) {
      this.setPreferences({ darkMode: false, timeFormat: '24h' });
    }
  },

  // ── Calls ──────────────────────────────────────────────────

  getCalls() {
    try {
      const data = localStorage.getItem(CALLS_KEY);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('Error reading calls:', e);
      return null;
    }
  },

  setCalls(calls) {
    try {
      localStorage.setItem(CALLS_KEY, JSON.stringify(calls));
      return true;
    } catch (e) {
      console.error('Error saving calls:', e);
      if (e.name === 'QuotaExceededError') {
        alert('Storage quota exceeded. Please export and clear old calls.');
      }
      return false;
    }
  },

  addCall(timestamp = null, contact = null) {
    const calls = this.getCalls() || [];
    const ts    = timestamp || new Date().toISOString();
    const hour  = new Date(ts).getHours();

    const call = {
      id: `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: ts,
      hour
    };

    if (contact) {
      call.contactId      = contact.id;
      call.contactName    = contact.name;
      call.contactCompany = contact.company;
    }

    calls.push(call);
    this.setCalls(calls);
    return call;
  },

  deleteCall(callId) {
    const calls    = this.getCalls() || [];
    const filtered = calls.filter(c => c.id !== callId);
    this.setCalls(filtered);
    return filtered;
  },

  updateCall(callId, timestamp) {
    const calls = this.getCalls() || [];
    const call  = calls.find(c => c.id === callId);
    if (call) {
      call.timestamp = timestamp;
      call.hour      = new Date(timestamp).getHours();
      this.setCalls(calls);
    }
    return call;
  },

  getCallsByDate(date) {
    const calls      = this.getCalls() || [];
    const targetDate = new Date(date).toDateString();
    return calls.filter(c => new Date(c.timestamp).toDateString() === targetDate);
  },

  getCallsByDateRange(startDate, endDate) {
    const calls = this.getCalls() || [];
    const start = new Date(startDate).getTime();
    const end   = new Date(endDate).getTime();
    return calls.filter(c => {
      const t = new Date(c.timestamp).getTime();
      return t >= start && t <= end;
    });
  },

  getCallsPerHour(calls) {
    const hourly = Array(24).fill(0);
    (calls || []).forEach(c => { hourly[c.hour]++; });
    return hourly;
  },

  getSummaryStats(calls) {
    const callsToUse = calls || this.getCalls() || [];
    const hourly     = this.getCallsPerHour(callsToUse);
    const total      = callsToUse.length;
    const peak       = Math.max(...hourly);
    const peakHour   = hourly.indexOf(peak);
    const average    = total > 0 ? (total / 24).toFixed(2) : 0;
    return { total, peak, peakHour: peak > 0 ? peakHour : null, average, hourly };
  },

  // ── Preferences ────────────────────────────────────────────

  getPreferences() {
    try {
      const data = localStorage.getItem(PREFS_KEY);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('Error reading preferences:', e);
      return null;
    }
  },

  setPreferences(prefs) {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
      return true;
    } catch (e) {
      console.error('Error saving preferences:', e);
      return false;
    }
  },

  // ── Sheet Labels ───────────────────────────────────────────

  getSheetLabels() {
    try {
      const data = localStorage.getItem(SHEET_LABELS_KEY);
      return data ? JSON.parse(data) : {};
    } catch (e) {
      console.error('Error reading sheet labels:', e);
      return {};
    }
  },

  getSheetLabel(dateStr) {
    return this.getSheetLabels()[dateStr] || '';
  },

  setSheetLabel(dateStr, label) {
    try {
      const labels = this.getSheetLabels();
      if (label) {
        labels[dateStr] = label;
      } else {
        delete labels[dateStr];
      }
      localStorage.setItem(SHEET_LABELS_KEY, JSON.stringify(labels));
      return true;
    } catch (e) {
      console.error('Error saving sheet label:', e);
      return false;
    }
  },

  // ── Contacts ───────────────────────────────────────────────

  getContacts() {
    try {
      const data = localStorage.getItem(CONTACTS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Error reading contacts:', e);
      return [];
    }
  },

  setContacts(contacts) {
    try {
      localStorage.setItem(CONTACTS_KEY, JSON.stringify(contacts));
      return true;
    } catch (e) {
      console.error('Error saving contacts:', e);
      return false;
    }
  },

  clearContacts() {
    try {
      localStorage.removeItem(CONTACTS_KEY);
      return true;
    } catch (e) {
      console.error('Error clearing contacts:', e);
      return false;
    }
  },

  // ── Nuclear clear ──────────────────────────────────────────

  clear() {
    try {
      localStorage.removeItem(CALLS_KEY);
      localStorage.removeItem(PREFS_KEY);
      localStorage.removeItem(SHEET_LABELS_KEY);
      localStorage.removeItem(CONTACTS_KEY);
      return true;
    } catch (e) {
      console.error('Error clearing storage:', e);
      return false;
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Storage;
}
