// Export / import / CSV-parse functionality for call tracker

const Export = {

  // ── Call exports ───────────────────────────────────────────

  exportToCSV(calls = null) {
    const data = calls || Storage.getCalls() || [];
    if (data.length === 0) { alert('No calls to export'); return; }
    const csv = this.generateCSV(data, Storage.getSheetLabels());
    this.downloadFile(csv, `calls_${this.getTimestamp()}.csv`, 'text/csv');
  },

  exportToJSON(calls = null) {
    const data = calls || Storage.getCalls() || [];
    if (data.length === 0) { alert('No calls to export'); return; }
    this.downloadFile(JSON.stringify(data, null, 2), `calls_${this.getTimestamp()}.json`, 'application/json');
  },

  generateCSV(calls, sheetLabels = {}) {
    let csv = 'Date,Time,Hour,Sheet Label,Contact Name,Contact Company,Timestamp\n';
    calls.forEach(call => {
      const date        = new Date(call.timestamp);
      const dateStr     = date.toISOString().split('T')[0];
      const timeStr     = date.toTimeString().split(' ')[0];
      const sheetLabel  = sheetLabels[dateStr] || '';
      const contactName = call.contactName    || '';
      const contactCo   = call.contactCompany || '';
      csv += `"${dateStr}","${timeStr}",${call.hour},"${sheetLabel}","${contactName}","${contactCo}","${call.timestamp}"\n`;
    });
    return csv;
  },

  // ── JSON import ────────────────────────────────────────────

  importFromJSON(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const calls = JSON.parse(e.target.result);
          if (!Array.isArray(calls)) throw new Error('Invalid format: expected an array of calls');
          calls.forEach(call => {
            if (!call.timestamp || typeof call.hour !== 'number') throw new Error('Invalid call format');
          });
          resolve(calls);
        } catch (err) { reject(err); }
      };
      reader.onerror = () => reject(new Error('Error reading file'));
      reader.readAsText(file);
    });
  },

  // ── Contact CSV import ─────────────────────────────────────

  parseContactsCSV(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = (e) => {
        try { resolve(this._parseCSVToContacts(e.target.result)); }
        catch (err) { reject(err); }
      };
      reader.onerror = () => reject(new Error('Error reading file'));
      reader.readAsText(file);
    });
  },

  _parseCSVToContacts(csvText) {
    const lines = csvText.trim().split(/\r?\n/);
    if (lines.length < 2) throw new Error('CSV must have a header row and at least one data row');

    const headers = this._parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());

    const col = {
      phone:     this._findCol(headers, ['phone', 'phone number', 'mobile', 'cell', 'direct', 'direct phone', 'work phone']),
      firstName: this._findCol(headers, ['first name', 'firstname', 'first']),
      lastName:  this._findCol(headers, ['last name', 'lastname', 'last']),
      name:      this._findCol(headers, ['name', 'full name', 'contact name', 'contact']),
      title:     this._findCol(headers, ['title', 'job title', 'position', 'role']),
      company:   this._findCol(headers, ['company', 'organization', 'employer', 'company name', 'account']),
      linkedin:  this._findCol(headers, ['linkedin', 'linkedin url', 'profile url', 'profile', 'linkedin profile'])
    };

    const contacts = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = this._parseCSVLine(line);

      let name = '';
      if (col.name >= 0 && values[col.name]) {
        name = values[col.name];
      } else {
        const first = col.firstName >= 0 ? (values[col.firstName] || '') : '';
        const last  = col.lastName  >= 0 ? (values[col.lastName]  || '') : '';
        name = [first, last].filter(Boolean).join(' ');
      }

      name = name.trim();
      const phone    = col.phone    >= 0 ? (values[col.phone]    || '').trim() : '';
      const jobTitle = col.title    >= 0 ? (values[col.title]    || '').trim() : '';
      const company  = col.company  >= 0 ? (values[col.company]  || '').trim() : '';
      const linkedin = col.linkedin >= 0 ? (values[col.linkedin] || '').trim() : '';

      if (!name && !phone) continue;

      contacts.push({
        id: `contact_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 6)}`,
        name, phone, jobTitle, company, linkedin
      });
    }

    if (contacts.length === 0) throw new Error('No valid contacts found in CSV');
    return contacts;
  },

  _findCol(headers, candidates) {
    for (const c of candidates) {
      const idx = headers.indexOf(c);
      if (idx >= 0) return idx;
    }
    return -1;
  },

  _parseCSVLine(line) {
    const result = [];
    let current  = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else { inQuotes = !inQuotes; }
      } else if (ch === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current);
    return result;
  },

  // ── Helpers ────────────────────────────────────────────────

  downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href     = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  getTimestamp() {
    const now = new Date();
    return now.toISOString().replace(/[:.]/g, '-').split('T')[0] +
           '_' + now.getHours().toString().padStart(2, '0') +
           '-' + now.getMinutes().toString().padStart(2, '0');
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Export;
}
