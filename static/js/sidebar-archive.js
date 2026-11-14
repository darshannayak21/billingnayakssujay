/**
 * Left Sidebar Archive & Recent Receipts Controller
 * Dropdown hierarchy: Year -> Month -> Date -> Receipts (NO EMOJIS)
 * Instant search and 1-click bill loading.
 */

const SidebarArchive = {
  currentTab: 'recent', // 'recent' or 'tree'
  recentReceipts: [],

  init() {
    this.bindEvents();
    this.loadRecentReceipts();
    this.loadArchiveTree();
  },

  bindEvents() {
    // Tabs in sidebar
    const tabRecent = document.getElementById('tab-recent-receipts');
    const tabTree = document.getElementById('tab-archive-tree');
    const panelRecent = document.getElementById('panel-recent-receipts');
    const panelTree = document.getElementById('panel-archive-tree');

    tabRecent.addEventListener('click', () => {
      this.currentTab = 'recent';
      tabRecent.classList.add('active');
      tabTree.classList.remove('active');
      panelRecent.style.display = 'block';
      panelTree.style.display = 'none';
      this.loadRecentReceipts();
    });

    tabTree.addEventListener('click', () => {
      this.currentTab = 'tree';
      tabTree.classList.add('active');
      tabRecent.classList.remove('active');
      panelTree.style.display = 'block';
      panelRecent.style.display = 'none';
      this.loadArchiveTree();
    });

    // Search bar
    const searchInp = document.getElementById('sidebar-search-inp');
    const searchBtn = document.getElementById('btn-sidebar-search');

    const doSearch = () => {
      const q = searchInp.value.trim();
      this.searchReceipts(q);
    };

    searchBtn.addEventListener('click', doSearch);
    searchInp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') doSearch();
    });
  },

  async loadRecentReceipts() {
    const container = document.getElementById('panel-recent-receipts');
    try {
      if (window.AppDB) {
        this.recentReceipts = await window.AppDB.getRecentInvoices();
        this.renderRecentReceipts(this.recentReceipts, container);
      } else {
        const res = await fetch('/api/invoices');
        const data = await res.json();
        if (data.success) {
          this.recentReceipts = data.data || [];
          this.renderRecentReceipts(this.recentReceipts, container);
        }
      }
    } catch (e) {
      console.error('Error fetching recent receipts:', e);
      container.innerHTML = '<p style="color:#AA0000; font-size:11px; padding:12px; text-align:center;">Failed to load receipts.</p>';
    }
  },

  renderRecentReceipts(invoices, container) {
    if (!invoices || invoices.length === 0) {
      container.innerHTML = '<p style="color:#888; font-size:12px; padding:16px; text-align:center;">No bills generated yet.</p>';
      return;
    }

    container.innerHTML = invoices.map(inv => `
      <div class="receipt-card" data-id="${inv.id}" onclick="SidebarArchive.selectBill(${inv.id})">
        <div class="receipt-card-header">
          <span>${Utils.escapeHtml(inv.invoice_number)}</span>
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="color: var(--accent);">₹ ${Utils.formatCurrency(inv.grand_total)}</span>
            <button type="button" class="btn-card-del" onclick="event.stopPropagation(); SidebarArchive.deleteBill(${inv.id}, '${Utils.escapeHtml(inv.invoice_number)}')" title="Delete Bill">&times;</button>
          </div>
        </div>
        <div class="receipt-card-sub">
          <span><b>${Utils.escapeHtml(inv.customer_name)}</b></span>
          <span>${Utils.isoToDMY(inv.invoice_date)}</span>
        </div>
      </div>
    `).join('');
  },

  async loadArchiveTree() {
    const container = document.getElementById('panel-archive-tree');
    try {
      let treeData = null;
      if (window.AppDB) {
        treeData = await window.AppDB.getArchiveTree();
      } else {
        const res = await fetch('/api/archive/tree');
        const data = await res.json();
        if (data.success) treeData = data.data;
      }
      if (treeData && Object.keys(treeData).length > 0) {
        this.renderDropdownTree(treeData, container);
      } else {
        container.innerHTML = '<p style="color:#888; font-size:12px; padding:16px; text-align:center;">No archive folders found.</p>';
      }
    } catch (e) {
      console.error('Tree load error:', e);
      container.innerHTML = '<p style="color:#AA0000; font-size:11px; padding:12px; text-align:center;">Failed to load tree.</p>';
    }
  },

  renderDropdownTree(tree, container) {
    let html = '';
    const fyKeys = Object.keys(tree).sort();

    fyKeys.forEach(fy => {
      const fyData = tree[fy];
      html += `
        <div class="archive-dropdown">
          <div class="dropdown-header open" onclick="SidebarArchive.toggleDropdown(this)">
            <span>${Utils.escapeHtml(fy)} <span class="badge" style="margin-left:4px;">${fyData.total_bills}</span></span>
            <span class="dropdown-chevron">▼</span>
          </div>
          <div class="dropdown-content open">
      `;

      const months = fyData.months || {};
      // Sort months chronologically by calendar order (Jan -> Dec)
      const monthEntries = Object.entries(months).sort((a, b) => {
        const kA = a[1].month_key || a[0];
        const kB = b[1].month_key || b[0];
        return kA.localeCompare(kB);
      });

      monthEntries.forEach(([mName, mData]) => {
        html += `
          <div class="archive-dropdown" style="margin-bottom: 4px; border-color: #EEE;">
            <div class="dropdown-header open" onclick="SidebarArchive.toggleDropdown(this)">
              <span>${Utils.escapeHtml(mName)} <span class="badge" style="margin-left:4px;">${mData.total_bills}</span></span>
              <span class="dropdown-chevron">▼</span>
            </div>
            <div class="dropdown-content open" style="padding: 2px 4px;">
        `;

        const dates = mData.dates || {};
        // Sort days chronologically (01 -> 31)
        const dateEntries = Object.entries(dates).sort((a, b) => {
          const kA = a[1].day_key || a[0];
          const kB = b[1].day_key || b[0];
          return kA.localeCompare(kB);
        });

        dateEntries.forEach(([dLabel, dData]) => {
          html += `
            <div class="archive-dropdown" style="margin-bottom: 3px; border: none; background: #FAFAFA;">
              <div class="dropdown-header open" style="padding: 4px 6px; font-size: 11px;" onclick="SidebarArchive.toggleDropdown(this)">
                <span>${Utils.escapeHtml(dLabel)} (${dData.bills.length})</span>
                <span class="dropdown-chevron">▼</span>
              </div>
              <div class="dropdown-content open" style="padding: 2px 4px;">
          `;

          // Sort bills inside that day in ascending order of invoice/sequence number (001, 002, 003...)
          const sortedBills = [...dData.bills].sort((a, b) => {
            const seqA = a.sequence_number !== undefined ? a.sequence_number : parseInt(a.invoice_number.replace(/\D/g, '') || 0);
            const seqB = b.sequence_number !== undefined ? b.sequence_number : parseInt(b.invoice_number.replace(/\D/g, '') || 0);
            return seqA - seqB;
          });

          sortedBills.forEach(b => {
            html += `
              <div class="receipt-card" style="padding: 5px 8px; margin-bottom: 3px;" onclick="SidebarArchive.selectBill(${b.id})">
                <div class="receipt-card-header" style="font-size: 11px;">
                  <span>${Utils.escapeHtml(b.invoice_number)}</span>
                  <div style="display: flex; align-items: center; gap: 5px;">
                    <span style="color: var(--accent);">₹ ${Utils.formatCurrency(b.grand_total)}</span>
                    <button type="button" class="btn-card-del" onclick="event.stopPropagation(); SidebarArchive.deleteBill(${b.id}, '${Utils.escapeHtml(b.invoice_number)}')" title="Delete Bill">&times;</button>
                  </div>
                </div>
                <div class="receipt-card-sub" style="font-size: 10px;">
                  <span>${Utils.escapeHtml(b.customer_name)}</span>
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

      html += `
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  },

  async deleteBill(invoiceId, invoiceNumber) {
    if (!confirm(`Are you sure you want to delete Bill #${invoiceNumber}?`)) {
      return;
    }

    try {
      if (window.AppDB) {
        await window.AppDB.deleteInvoice(invoiceId);
        if (window.InvoiceEditor) {
          InvoiceEditor.showToast(`Bill #${invoiceNumber} deleted.`);
          if (InvoiceEditor.currentInvoiceId === invoiceId) {
            InvoiceEditor.resetToNewInvoice();
          }
        }
        this.loadRecentReceipts();
        this.loadArchiveTree();
      } else {
        const res = await fetch(`/api/invoices/${invoiceId}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
          if (window.InvoiceEditor) {
            InvoiceEditor.showToast(`Bill #${invoiceNumber} deleted.`);
            if (InvoiceEditor.currentInvoiceId === invoiceId) {
              InvoiceEditor.resetToNewInvoice();
            }
          }
          this.loadRecentReceipts();
          this.loadArchiveTree();
        } else {
          alert(data.error || 'Failed to delete bill');
        }
      }
    } catch (e) {
      console.error('Delete error:', e);
      alert('Error deleting bill: ' + e.message);
    }
  },

  toggleDropdown(headerEl) {
    const content = headerEl.nextElementSibling;
    const chevron = headerEl.querySelector('.dropdown-chevron');
    if (!content) return;

    if (content.classList.contains('open')) {
      content.classList.remove('open');
      headerEl.classList.remove('open');
      if (chevron) chevron.textContent = '▶';
    } else {
      content.classList.add('open');
      headerEl.classList.add('open');
      if (chevron) chevron.textContent = '▼';
    }
  },

  clearSearch() {
    const searchInp = document.getElementById('sidebar-search-inp');
    if (searchInp) searchInp.value = '';
    this.loadRecentReceipts();
  },

  async searchReceipts(q) {
    const container = document.getElementById('panel-recent-receipts');
    // Switch to recent tab to show search results
    document.getElementById('tab-recent-receipts').click();

    if (!q || !q.trim()) {
      this.loadRecentReceipts();
      return;
    }

    const cleanQ = q.trim();
    container.innerHTML = '<p style="color:#888; font-size:12px; padding:12px; text-align:center;">Searching bills...</p>';
    try {
      let results = [];
      if (window.AppDB) {
        results = await window.AppDB.getRecentInvoices(cleanQ);
      } else {
        const res = await fetch(`/api/invoices?q=${encodeURIComponent(cleanQ)}`);
        const data = await res.json();
        if (data.success) results = data.data || [];
      }

      const headerHtml = `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; font-size: 11px; background: #FFF3EA; border-bottom: 1px solid #FFE0CA; color: #D4540C; margin-bottom: 6px; border-radius: 4px;">
          <span>Found <b>${results.length}</b> bill(s) for "<b>${Utils.escapeHtml(cleanQ)}</b>"</span>
          <button type="button" onclick="SidebarArchive.clearSearch()" style="background: transparent; border: none; color: #D4540C; font-weight: 700; cursor: pointer; font-size: 11px;">✕ Clear</button>
        </div>
      `;

      if (!results || results.length === 0) {
        container.innerHTML = headerHtml + `
          <div style="padding: 16px 12px; text-align: center; color: #777; font-size: 12px;">
            <p style="margin-bottom: 6px; font-weight: 600;">No matching bills found.</p>
            <p style="font-size: 11px; color: #999;">Search by bill number (INV-001 or 001), guest name, date (14-11-2026), or notes.</p>
          </div>
        `;
      } else {
        container.innerHTML = headerHtml;
        const listDiv = document.createElement('div');
        this.renderRecentReceipts(results, listDiv);
        container.appendChild(listDiv);
      }
    } catch (e) {
      console.error(e);
      container.innerHTML = '<p style="color:#AA0000; font-size:11px; padding:12px; text-align:center;">Search error. Check network connection.</p>';
    }
  },

  async selectBill(invoiceId) {
    try {
      let billData = null;
      if (window.AppDB) {
        billData = await window.AppDB.getInvoiceById(invoiceId);
      } else {
        const res = await fetch(`/api/invoices/${invoiceId}`);
        const data = await res.json();
        if (data.success) billData = data.data;
      }
      if (billData) {
        InvoiceEditor.loadInvoiceIntoSheet(billData);

        // Highlight selected receipt card
        document.querySelectorAll('.receipt-card').forEach(c => c.classList.remove('active'));
        const activeCard = document.querySelector(`.receipt-card[data-id="${invoiceId}"]`);
        if (activeCard) activeCard.classList.add('active');
      }
    } catch (e) {
      console.error('Error loading bill:', e);
    }
  }
};

window.SidebarArchive = SidebarArchive;

document.addEventListener('DOMContentLoaded', () => {
  SidebarArchive.init();
});
