/**
 * Drawers Controller for Archive & Settings
 */

const Drawers = {
  activeDrawer: null,

  init() {
    // Open buttons in top bar
    document.getElementById('btn-open-archive').addEventListener('click', () => this.open('archive'));
    document.getElementById('btn-open-settings').addEventListener('click', () => this.open('settings'));

    // Close buttons
    document.getElementById('btn-close-archive').addEventListener('click', () => this.close());
    document.getElementById('btn-close-settings').addEventListener('click', () => this.close());
    document.getElementById('side-drawer-overlay').addEventListener('click', () => this.close());

    // Search input debounce in archive
    const searchInp = document.getElementById('archive-search-inp');
    let timer;
    searchInp.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => this.searchInvoices(searchInp.value.trim()), 200);
    });

    // Save settings button
    document.getElementById('btn-save-settings').addEventListener('click', () => this.saveSettings());
  },

  open(drawerName) {
    this.close();
    this.activeDrawer = drawerName;
    document.getElementById('side-drawer-overlay').classList.add('open');
    const drawerEl = document.getElementById(`drawer-${drawerName}`);
    drawerEl.classList.add('open');

    if (drawerName === 'archive') {
      this.loadArchiveTree();
    } else if (drawerName === 'settings') {
      this.populateSettings();
    }
  },

  close() {
    document.getElementById('side-drawer-overlay').classList.remove('open');
    document.querySelectorAll('.side-drawer').forEach(el => el.classList.remove('open'));
    this.activeDrawer = null;
  },

  async loadArchiveTree() {
    const treeContainer = document.getElementById('archive-tree-container');
    treeContainer.innerHTML = '<p style="color:#777; font-size:12px; padding:12px;">Loading folder archives...</p>';

    try {
      const res = await fetch('/api/archive/tree');
      const data = await res.json();
      if (!data.success || !data.data || Object.keys(data.data).length === 0) {
        treeContainer.innerHTML = '<p style="color:#888; font-size:12px; padding:12px;">No bills saved yet.</p>';
        return;
      }
      this.renderTree(data.data, treeContainer);
    } catch (e) {
      console.error('Tree load error:', e);
      treeContainer.innerHTML = '<p style="color:#AA0000; font-size:12px; padding:12px;">Error loading archive.</p>';
    }
  },

  renderTree(tree, container) {
    let html = '';
    const fyKeys = Object.keys(tree);

    fyKeys.forEach(fy => {
      const fyData = tree[fy];
      html += `
        <div style="margin-bottom: 8px;">
          <div class="tree-row" style="background:#F4F5F7;">
            <strong>FY ${Utils.escapeHtml(fy)}</strong>
            <span class="badge">${fyData.total_bills}</span>
          </div>
          <div class="tree-node">
      `;

      const months = fyData.months || {};
      Object.keys(months).forEach(mName => {
        const mData = months[mName];
        html += `
          <div style="margin-top: 4px;">
            <div class="tree-row" style="color:#333;">
              <span>📁 ${Utils.escapeHtml(mName)}</span>
              <span class="badge">${mData.total_bills}</span>
            </div>
            <div class="tree-node">
        `;

        const dates = mData.dates || {};
        Object.keys(dates).forEach(dLabel => {
          const dData = dates[dLabel];
          html += `
            <div style="margin-top: 2px;">
              <div class="tree-row" style="color:#444;" onclick="Drawers.filterByDate('${dData.date}')">
                <span>📅 ${Utils.escapeHtml(dLabel)}</span>
                <span class="badge">${dData.bills.length}</span>
              </div>
              <div class="tree-node">
          `;

          dData.bills.forEach(b => {
            html += `
              <div class="tree-row" style="font-size:12px; color:#111; border-bottom: 1px solid #F0F0F0;" onclick="Drawers.selectBill(${b.id})">
                <span><b>${Utils.escapeHtml(b.invoice_number)}</b> - ${Utils.escapeHtml(b.customer_name)}</span>
                <span style="font-weight:700; color:var(--accent);">₹ ${Utils.formatCurrency(b.grand_total)}</span>
              </div>
            `;
          });

          html += `
              </div>
            </div>
          `;
        });

        html += `
            </div>
          </div>
        `;
      });

      html += `
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  },

  async filterByDate(dateStr) {
    const treeContainer = document.getElementById('archive-tree-container');
    treeContainer.innerHTML = `<p style="color:#777; font-size:12px; padding:12px;">Loading bills for ${dateStr}...</p>`;
    try {
      const res = await fetch(`/api/invoices?date=${dateStr}`);
      const data = await res.json();
      if (data.success) {
        this.renderSearchResults(data.data, treeContainer);
      }
    } catch (e) {
      console.error(e);
    }
  },

  async searchInvoices(q) {
    if (!q) {
      this.loadArchiveTree();
      return;
    }
    const treeContainer = document.getElementById('archive-tree-container');
    treeContainer.innerHTML = '<p style="color:#777; font-size:12px; padding:12px;">Searching...</p>';
    try {
      const res = await fetch(`/api/invoices?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (data.success) {
        this.renderSearchResults(data.data, treeContainer);
      }
    } catch (e) {
      console.error(e);
    }
  },

  renderSearchResults(invoices, container) {
    if (!invoices || invoices.length === 0) {
      container.innerHTML = '<p style="color:#888; font-size:12px; padding:12px;">No matching invoices found.</p>';
      return;
    }

    container.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
        <span style="font-size:12px; color:#666;">Found ${invoices.length} bill(s)</span>
        <button class="btn btn-secondary btn-sm" onclick="Drawers.loadArchiveTree()" style="font-size:11px; padding:2px 6px; height:24px;">Show Folders</button>
      </div>
      <div style="display:flex; flex-direction:column; gap:4px;">
        ${invoices.map(inv => `
          <div class="tree-row" style="background:#FAFAFA; border:1px solid #E5E7EB; padding:8px 10px;" onclick="Drawers.selectBill(${inv.id})">
            <div>
              <div style="font-weight:700; color:#111;">${Utils.escapeHtml(inv.invoice_number)} &bull; ${Utils.escapeHtml(inv.customer_name)}</div>
              <div style="font-size:11px; color:#666;">Date: ${inv.invoice_date}</div>
            </div>
            <div style="text-align:right;">
              <div style="font-weight:700; color:var(--accent);">₹ ${Utils.formatCurrency(inv.grand_total)}</div>
              <span style="font-size:10px; color:#888;">Click to load</span>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  },

  async selectBill(invoiceId) {
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`);
      const data = await res.json();
      if (data.success && data.data) {
        InvoiceEditor.loadInvoiceIntoSheet(data.data);
        this.close();
      }
    } catch (e) {
      console.error(e);
    }
  },

  populateSettings() {
    const s = InvoiceEditor.settings;
    if (!s) return;
    document.getElementById('set-hotel-name').value = s.hotel_name || '';
    document.getElementById('set-address').value = s.address || '';
    document.getElementById('set-gstin').value = s.gstin || '';
    document.getElementById('set-phone').value = s.phone || '';
    document.getElementById('set-email').value = s.email || '';
    document.getElementById('set-website').value = s.website || '';
    document.getElementById('set-cgst-rate').value = s.cgst_rate || 2.5;
    document.getElementById('set-sgst-rate').value = s.sgst_rate || 2.5;
    document.getElementById('set-notes').value = s.notes_default || '';
    document.getElementById('set-presets').value = (s.room_presets || []).join('\n');
  },

  async saveSettings() {
    const presetsRaw = document.getElementById('set-presets').value;
    const presets = presetsRaw.split('\n').map(l => l.trim()).filter(Boolean);

    const payload = {
      hotel_name: document.getElementById('set-hotel-name').value.trim(),
      address: document.getElementById('set-address').value.trim(),
      gstin: document.getElementById('set-gstin').value.trim(),
      phone: document.getElementById('set-phone').value.trim(),
      email: document.getElementById('set-email').value.trim(),
      website: document.getElementById('set-website').value.trim(),
      cgst_rate: parseFloat(document.getElementById('set-cgst-rate').value) || 2.5,
      sgst_rate: parseFloat(document.getElementById('set-sgst-rate').value) || 2.5,
      notes_default: document.getElementById('set-notes').value.trim(),
      room_presets: presets
    };

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        InvoiceEditor.settings = data.data;
        InvoiceEditor.renderHotelHeader();
        InvoiceEditor.populateDatalist();
        InvoiceEditor.recalculate();
        InvoiceEditor.showToast('Settings updated successfully!');
        this.close();
      }
    } catch (e) {
      console.error(e);
      alert('Failed to save settings');
    }
  }
};

window.Drawers = Drawers;

document.addEventListener('DOMContentLoaded', () => {
  Drawers.init();
});
