/**
 * Dashboard View Controller
 * Clean, minimalistic, Apple-like interface following design.md
 */

const Dashboard = {
  container: null,

  init(containerEl) {
    this.container = containerEl;
    this.renderSkeleton();
    this.loadData();
  },

  renderSkeleton() {
    this.container.innerHTML = `
      <div class="section-header">
        <div>
          <h1>Dashboard <span>&bull; Nayak's Sujay</span></h1>
          <p style="color: var(--text-3); font-size: 13px; margin-top: 4px;">Real-time billing overview, cash registers & recent check-out invoices</p>
        </div>
        <div style="display: flex; gap: 10px;">
          <button class="btn btn-primary" id="btn-quick-create">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            Create New Invoice
          </button>
        </div>
      </div>

      <!-- Hero Stats Grid (Following design.md: row of cards, last one solid accent) -->
      <div class="stats-grid">
        <div class="card white">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
            <span class="label">Total Invoices</span>
            <span class="pill pill-sm">LIFETIME</span>
          </div>
          <div class="hero-number" id="dash-total-invoices">-</div>
          <p style="color: var(--text-4); font-size: 11px; margin-top: 6px;">Total GST bills issued</p>
        </div>

        <div class="card white">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
            <span class="label">Total Revenue</span>
            <span class="pill pill-sm">BILLED</span>
          </div>
          <div class="hero-number" id="dash-total-revenue">-</div>
          <p style="color: var(--text-4); font-size: 11px; margin-top: 6px;">Excluding cancelled bills</p>
        </div>

        <div class="card white">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
            <span class="label">Cash Collected</span>
            <span class="pill pill-sm" style="background: var(--text-2);">CASH DESK</span>
          </div>
          <div class="hero-number" id="dash-cash-collected">-</div>
          <p style="color: var(--text-4); font-size: 11px; margin-top: 6px;">Front-desk cash receipts</p>
        </div>

        <!-- Last card in solid orange with white text (design.md rule) -->
        <div class="card accent">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
            <span class="label" style="color: rgba(255,255,255,0.85) !important;">Online Collected</span>
            <span class="pill pill-sm">DIGITAL</span>
          </div>
          <div class="hero-number" id="dash-online-collected">-</div>
          <p style="color: rgba(255,255,255,0.85); font-size: 11px; margin-top: 6px;">UPI / QR / NetBanking / Cards</p>
        </div>
      </div>

      <!-- Quick Search Bar -->
      <div class="search-toolbar">
        <div class="search-input-wrapper">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input type="text" id="dash-search-input" placeholder="Search by Bill Number (e.g. 001), Guest Name, or Phone..." />
        </div>
        <button class="btn btn-secondary" id="dash-search-btn">Search Archive</button>
      </div>

      <!-- Recent Invoices Table -->
      <div class="section-header" style="margin-top: 32px; margin-bottom: 16px;">
        <h3>Recent Invoices</h3>
        <button class="btn btn-secondary btn-sm" id="btn-view-all-archive">View All In Archive &rarr;</button>
      </div>

      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 80px; text-align: center;">Bill #</th>
              <th>Date</th>
              <th>Guest Name</th>
              <th>Contact</th>
              <th>Rooms Billed</th>
              <th style="text-align: right;">Grand Total</th>
              <th style="text-align: center;">Payment Status</th>
              <th style="text-align: right;">Actions</th>
            </tr>
          </thead>
          <tbody id="dash-recent-tbody">
            <tr><td colspan="8" style="text-align: center; color: var(--text-4); padding: 32px;">Loading recent invoices...</td></tr>
          </tbody>
        </table>
      </div>
    `;

    // Event listeners
    this.container.querySelector('#btn-quick-create').addEventListener('click', () => {
      State.setView('create-invoice');
    });

    this.container.querySelector('#btn-view-all-archive').addEventListener('click', () => {
      State.setView('archive');
    });

    const searchInput = this.container.querySelector('#dash-search-input');
    const searchBtn = this.container.querySelector('#dash-search-btn');

    const triggerSearch = () => {
      const q = searchInput.value.trim();
      State.setView('archive');
      setTimeout(() => {
        if (window.Archive) {
          window.Archive.searchWithQuery(q);
        }
      }, 50);
    };

    searchBtn.addEventListener('click', triggerSearch);
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') triggerSearch();
    });
  },

  async loadData() {
    try {
      const res = await API.getStats();
      if (res.success && res.data) {
        this.renderStats(res.data);
      }
    } catch (err) {
      console.error('Error loading dashboard stats:', err);
    }
  },

  renderStats(stats) {
    document.getElementById('dash-total-invoices').textContent = stats.total_invoices || '0';
    document.getElementById('dash-total-revenue').textContent = Utils.formatCurrency(stats.total_revenue);
    document.getElementById('dash-cash-collected').textContent = Utils.formatCurrency(stats.cash_collected);
    document.getElementById('dash-online-collected').textContent = Utils.formatCurrency(stats.online_collected);

    const tbody = document.getElementById('dash-recent-tbody');
    if (!stats.recent_invoices || stats.recent_invoices.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-4); padding: 36px;">No invoices created yet. Click "Create New Invoice" to generate the first bill.</td></tr>`;
      return;
    }

    tbody.innerHTML = stats.recent_invoices.map(inv => {
      let statusClass = 'status-paid';
      if (inv.status === 'Cancelled') statusClass = 'status-cancelled';
      else if (inv.payment_status === 'Partially Paid') statusClass = 'status-partial';
      else if (inv.payment_status === 'Unpaid') statusClass = 'status-unpaid';

      const rooms = (inv.items || []).map(it => `${it.room_number ? '#' + it.room_number : ''} ${it.room_category}`).join(', ') || 'Room Stay';

      return `
        <tr>
          <td class="cell-room-badge">${Utils.escapeHtml(inv.invoice_number)}</td>
          <td>${Utils.formatDateDisplay(inv.invoice_date)}</td>
          <td><strong>${Utils.escapeHtml(inv.customer_name)}</strong></td>
          <td>${Utils.escapeHtml(inv.customer_phone || '-')}</td>
          <td><span style="font-size: 12px; color: var(--text-3);">${Utils.escapeHtml(rooms)}</span></td>
          <td style="text-align: right; font-weight: 600; color: var(--text);">${Utils.formatCurrency(inv.grand_total)}</td>
          <td style="text-align: center;">
            <span class="status-badge ${statusClass}">${inv.status === 'Cancelled' ? 'CANCELLED' : inv.payment_status.toUpperCase()}</span>
          </td>
          <td style="text-align: right;">
            <div style="display: inline-flex; gap: 6px;">
              <button class="btn btn-secondary btn-sm" onclick="App.openInvoiceModal(${inv.id})">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                View / Print
              </button>
              <a href="/api/invoices/${inv.id}/pdf" class="btn btn-tint btn-sm" download title="Download dynamic PDF">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                PDF
              </a>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }
};

window.Dashboard = Dashboard;
