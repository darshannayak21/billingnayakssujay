/**
 * Dedicated Invoice Archive Controller
 * Implements folder-style hierarchical navigation: Financial Year -> Month -> Date -> Bills
 * Alongside real-time filtering, search, sorting and instant actions.
 */

const Archive = {
  container: null,
  treeData: null,
  currentFilters: {
    q: '',
    fy: '',
    from: '',
    to: '',
    category: '',
    status: '',
    sort: 'sequence_number',
    order: 'ASC'
  },
  selectedNode: null,

  init(containerEl) {
    this.container = containerEl;
    this.renderSkeleton();
    this.loadTreeAndInvoices();
  },

  renderSkeleton() {
    this.container.innerHTML = `
      <div class="section-header">
        <div>
          <h1>Invoice Archive <span>&bull; Bill Records</span></h1>
          <p style="color: var(--text-3); font-size: 13px; margin-top: 4px;">Hierarchical folder navigation by Financial Year, Month & Date with instant search</p>
        </div>
        <div style="display: flex; gap: 10px;">
          <button class="btn btn-primary" onclick="State.setView('create-invoice')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            Create New Invoice
          </button>
        </div>
      </div>

      <div class="archive-layout">
        <!-- Left: Hierarchical Folder Navigation Tree -->
        <div class="folder-tree-card">
          <div class="tree-header">
            <div style="display: flex; align-items: center; gap: 8px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
              <h3 style="font-size: 14px;">Bill Archive Folders</h3>
            </div>
            <button class="btn btn-secondary btn-sm" id="btn-reset-tree" style="padding: 2px 8px; font-size: 11px;">View All</button>
          </div>

          <div id="tree-container" style="display: flex; flex-direction: column; gap: 4px;">
            <p style="color: var(--text-4); font-size: 12px; padding: 12px;">Loading folder tree...</p>
          </div>
        </div>

        <!-- Right: Search Bar, Filters & Invoices List -->
        <div>
          <div class="search-toolbar">
            <div class="search-input-wrapper">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              <input type="text" id="archive-search-input" placeholder="Search Bill #, Guest Name, or Phone..." />
            </div>

            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
              <select id="filter-status" style="width: 140px;">
                <option value="">Status: All</option>
                <option value="Paid">Paid</option>
                <option value="Partially Paid">Partially Paid</option>
                <option value="Unpaid">Unpaid</option>
                <option value="Cancelled">Cancelled</option>
              </select>

              <select id="filter-sort" style="width: 170px;">
                <option value="sequence_number:ASC">Bill Number (Asc)</option>
                <option value="sequence_number:DESC">Bill Number (Desc)</option>
                <option value="invoice_date:DESC">Date (Newest First)</option>
                <option value="invoice_date:ASC">Date (Oldest First)</option>
                <option value="grand_total:DESC">Amount (Highest First)</option>
                <option value="grand_total:ASC">Amount (Lowest First)</option>
              </select>
            </div>
          </div>

          <!-- Active Filter Pill Bar -->
          <div id="active-filter-bar" style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px; min-height: 24px;">
            <span style="font-size: 12px; color: var(--text-3);" id="archive-results-count">Showing all invoices</span>
          </div>

          <!-- Invoices Data Table -->
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width: 80px; text-align: center;">Bill #</th>
                  <th>Date</th>
                  <th>Guest Name</th>
                  <th>Phone</th>
                  <th>Rooms</th>
                  <th style="text-align: right;">Total Amount</th>
                  <th style="text-align: center;">Status</th>
                  <th style="text-align: right; width: 220px;">Actions</th>
                </tr>
              </thead>
              <tbody id="archive-tbody">
                <tr><td colspan="8" style="text-align: center; color: var(--text-4); padding: 36px;">Loading invoices...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
  },

  bindEvents() {
    const searchInput = this.container.querySelector('#archive-search-input');
    const statusSelect = this.container.querySelector('#filter-status');
    const sortSelect = this.container.querySelector('#filter-sort');
    const resetBtn = this.container.querySelector('#btn-reset-tree');

    let debounceTimer;
    searchInput.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        this.currentFilters.q = searchInput.value.trim();
        this.loadInvoices();
      }, 250);
    });

    statusSelect.addEventListener('change', () => {
      this.currentFilters.status = statusSelect.value;
      this.loadInvoices();
    });

    sortSelect.addEventListener('change', () => {
      const [col, dir] = sortSelect.value.split(':');
      this.currentFilters.sort = col;
      this.currentFilters.order = dir;
      this.loadInvoices();
    });

    resetBtn.addEventListener('click', () => {
      this.currentFilters.fy = '';
      this.currentFilters.from = '';
      this.currentFilters.to = '';
      searchInput.value = '';
      this.currentFilters.q = '';
      this.selectedNode = null;
      this.highlightSelectedNode();
      this.loadInvoices();
    });
  },

  searchWithQuery(q) {
    const searchInput = this.container.querySelector('#archive-search-input');
    if (searchInput) {
      searchInput.value = q;
      this.currentFilters.q = q;
      this.loadInvoices();
    }
  },

  async loadTreeAndInvoices() {
    await Promise.all([
      this.loadTree(),
      this.loadInvoices()
    ]);
  },

  async loadTree() {
    try {
      const res = await API.getArchiveTree();
      if (res.success) {
        this.treeData = res.data;
        this.renderTree();
      }
    } catch (e) {
      console.error('Error loading archive tree:', e);
    }
  },

  renderTree() {
    const treeEl = document.getElementById('tree-container');
    if (!this.treeData || Object.keys(this.treeData).length === 0) {
      treeEl.innerHTML = `<p style="color: var(--text-4); font-size: 12px; padding: 10px;">No bill archives yet.</p>`;
      return;
    }

    let html = '';
    const fyKeys = Object.keys(this.treeData);

    fyKeys.forEach(fy => {
      const fyData = this.treeData[fy];
      html += `
        <div class="tree-fy-group" data-fy="${Utils.escapeHtml(fy)}">
          <div class="tree-item tree-fy-node" onclick="Archive.selectFy('${Utils.escapeHtml(fy)}')">
            <span class="tree-item-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
              <strong>FY ${Utils.escapeHtml(fy)}</strong>
            </span>
            <span class="tree-badge">${fyData.total_bills}</span>
          </div>

          <div class="tree-node tree-month-list" style="margin-left: 14px;">
      `;

      const months = fyData.months || {};
      Object.keys(months).forEach(monthName => {
        const monthData = months[monthName];
        html += `
          <div class="tree-month-group" data-month="${Utils.escapeHtml(monthName)}">
            <div class="tree-item tree-month-node" onclick="Archive.toggleMonth(this, '${Utils.escapeHtml(monthName)}')">
              <span class="tree-item-title">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                ${Utils.escapeHtml(monthName)}
              </span>
              <span class="tree-badge">${monthData.total_bills}</span>
            </div>

            <div class="tree-node tree-date-list" style="margin-left: 14px;">
        `;

        const dates = monthData.dates || {};
        Object.keys(dates).forEach(dayLabel => {
          const dayData = dates[dayLabel];
          html += `
            <div class="tree-item tree-date-node" data-date="${dayData.date}" onclick="Archive.selectDate('${dayData.date}', '${Utils.escapeHtml(dayLabel)}')">
              <span class="tree-item-title">
                <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: var(--accent);"></span>
                ${Utils.escapeHtml(dayLabel)}
              </span>
              <span class="tree-badge">${dayData.bills.length}</span>
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

    treeEl.innerHTML = html;
    this.highlightSelectedNode();
  },

  selectFy(fy) {
    this.selectedNode = { type: 'fy', val: fy };
    this.currentFilters.fy = fy;
    this.currentFilters.from = '';
    this.currentFilters.to = '';
    this.highlightSelectedNode();
    this.loadInvoices();
  },

  selectDate(dateStr, label) {
    this.selectedNode = { type: 'date', val: dateStr, label: label };
    this.currentFilters.from = dateStr;
    this.currentFilters.to = dateStr;
    this.highlightSelectedNode();
    this.loadInvoices();
  },

  toggleMonth(el, monthName) {
    const parent = el.closest('.tree-month-group');
    const dateList = parent.querySelector('.tree-date-list');
    if (dateList.style.display === 'none') {
      dateList.style.display = 'block';
    } else {
      dateList.style.display = 'none';
    }
  },

  highlightSelectedNode() {
    document.querySelectorAll('.tree-item').forEach(el => el.classList.remove('active'));
    if (!this.selectedNode) return;

    if (this.selectedNode.type === 'date') {
      const el = document.querySelector(`.tree-date-node[data-date="${this.selectedNode.val}"]`);
      if (el) el.classList.add('active');
    }
  },

  async loadInvoices() {
    const tbody = document.getElementById('archive-tbody');
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-4); padding: 36px;">Loading invoices...</td></tr>`;

    try {
      const res = await API.getInvoices(this.currentFilters);
      if (res.success) {
        this.renderInvoicesTable(res.data);
      }
    } catch (err) {
      console.error('Error querying invoices:', err);
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--danger); padding: 36px;">Error loading invoices</td></tr>`;
    }
  },

  renderInvoicesTable(invoices) {
    const tbody = document.getElementById('archive-tbody');
    const countEl = document.getElementById('archive-results-count');

    countEl.textContent = `Showing ${invoices.length} invoice${invoices.length === 1 ? '' : 's'}${this.selectedNode ? ' for ' + (this.selectedNode.label || this.selectedNode.val) : ''}`;

    if (!invoices || invoices.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-4); padding: 42px;">No matching invoices found in archive.</td></tr>`;
      return;
    }

    tbody.innerHTML = invoices.map(inv => {
      let statusClass = 'status-paid';
      if (inv.status === 'Cancelled') statusClass = 'status-cancelled';
      else if (inv.payment_status === 'Partially Paid') statusClass = 'status-partial';
      else if (inv.payment_status === 'Unpaid') statusClass = 'status-unpaid';

      const rooms = (inv.items || []).map(it => `${it.room_number ? '#' + it.room_number : ''} ${it.room_category}`).join(', ') || 'Room Stay';

      return `
        <tr>
          <td class="cell-room-badge">${Utils.escapeHtml(inv.invoice_number)}</td>
          <td>${Utils.formatDateDisplay(inv.invoice_date)}</td>
          <td>
            <strong>${Utils.escapeHtml(inv.customer_name)}</strong>
            ${inv.customer_gstin ? `<br/><span style="font-size: 10px; color: var(--accent);">GSTIN: ${Utils.escapeHtml(inv.customer_gstin)}</span>` : ''}
          </td>
          <td>${Utils.escapeHtml(inv.customer_phone || '-')}</td>
          <td><span style="font-size: 12px; color: var(--text-3);">${Utils.escapeHtml(rooms)}</span></td>
          <td style="text-align: right; font-weight: 600; color: var(--text);">
            ${Utils.formatCurrency(inv.grand_total)}
            ${inv.balance_due > 0 && inv.status !== 'Cancelled' ? `<br/><span style="font-size: 10px; color: var(--danger);">Bal: ${Utils.formatCurrency(inv.balance_due)}</span>` : ''}
          </td>
          <td style="text-align: center;">
            <span class="status-badge ${statusClass}">${inv.status === 'Cancelled' ? 'CANCELLED' : inv.payment_status.toUpperCase()}</span>
          </td>
          <td style="text-align: right;">
            <div style="display: inline-flex; gap: 4px;">
              <button class="btn btn-secondary btn-sm" onclick="App.openInvoiceModal(${inv.id})" title="View and Print">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                View
              </button>
              <a href="/api/invoices/${inv.id}/pdf" class="btn btn-tint btn-sm" download title="Download A4 PDF">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                PDF
              </a>
              ${inv.status !== 'Cancelled' ? `
                <button class="btn btn-secondary btn-sm" onclick="App.editInvoice(${inv.id})" title="Edit / Amend Bill">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                  Edit
                </button>
                <button class="btn btn-danger btn-sm" onclick="App.promptCancelInvoice(${inv.id}, '${inv.invoice_number}')" title="Cancel Bill">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              ` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }
};

window.Archive = Archive;
