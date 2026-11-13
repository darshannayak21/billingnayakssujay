/**
 * Nayak's Sujay API Client
 * Lightweight, robust REST client with error trapping.
 */

const API = {
  async getStats() {
    const res = await fetch('/api/stats');
    return res.json();
  },

  async getSettings() {
    const res = await fetch('/api/settings');
    return res.json();
  },

  async updateSettings(data) {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async getCategories(includeAll = false) {
    const res = await fetch(`/api/categories?all=${includeAll}`);
    return res.json();
  },

  async addCategory(data) {
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async updateCategory(id, data) {
    const res = await fetch(`/api/categories/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async deleteCategory(id) {
    const res = await fetch(`/api/categories/${id}`, {
      method: 'DELETE'
    });
    return res.json();
  },

  async getNextInvoiceNumber(fy = '') {
    const res = await fetch(`/api/invoices/next-number?fy=${encodeURIComponent(fy)}`);
    return res.json();
  },

  async getInvoices(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`/api/invoices?${query}`);
    return res.json();
  },

  async getInvoice(id) {
    const res = await fetch(`/api/invoices/${id}`);
    return res.json();
  },

  async createInvoice(data) {
    const res = await fetch('/api/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async updateInvoice(id, data) {
    const res = await fetch(`/api/invoices/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async cancelInvoice(id, reason) {
    const res = await fetch(`/api/invoices/${id}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason })
    });
    return res.json();
  },

  async getArchiveTree() {
    const res = await fetch('/api/archive/tree');
    return res.json();
  },

  async getAuditLogs() {
    const res = await fetch('/api/audit-logs');
    return res.json();
  },

  getDownloadPdfUrl(id) {
    return `/api/invoices/${id}/pdf`;
  },

  getBackupDownloadUrl() {
    return '/api/backup/download';
  },

  getJsonExportUrl() {
    return '/api/backup/export-json';
  },

  async restoreDatabase(file) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/backup/restore', {
      method: 'POST',
      body: formData
    });
    return res.json();
  }
};

window.API = API;
