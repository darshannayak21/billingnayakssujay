/**
 * Main Application Controller for Nayak's Sujay Hotel Billing & GST System
 */

const App = {
  currentModalInvoiceId: null,

  async init() {
    console.log("Initializing Nayak's Sujay Billing System...");

    // Setup Navigation Tabs
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', () => {
        const targetView = item.dataset.view;
        State.setView(targetView);
      });
    });

    // Listen to State view changes
    State.on('view:change', (viewName) => {
      this.switchView(viewName);
    });

    // Initialize Dashboard
    Dashboard.init(document.getElementById('view-dashboard'));
    InvoiceForm.init(document.getElementById('view-create-invoice'));
    Archive.init(document.getElementById('view-archive'));
    Settings.init(document.getElementById('view-settings'));

    // Modal Close
    document.getElementById('btn-close-modal').addEventListener('click', () => this.closeInvoiceModal());
    document.getElementById('invoice-modal-overlay').addEventListener('click', (e) => {
      if (e.target.id === 'invoice-modal-overlay') this.closeInvoiceModal();
    });

    // Modal Actions: Print, Download PDF
    document.getElementById('btn-modal-print').addEventListener('click', () => {
      window.print();
    });

    document.getElementById('btn-modal-download-pdf').addEventListener('click', () => {
      if (this.currentModalInvoiceId) {
        window.location.href = `/api/invoices/${this.currentModalInvoiceId}/pdf`;
      }
    });

    // Global Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        State.setView('create-invoice');
      } else if (e.key === 'Escape') {
        this.closeInvoiceModal();
      }
    });
  },

  switchView(viewName) {
    // Update nav items
    document.querySelectorAll('.nav-item').forEach(item => {
      if (item.dataset.view === viewName) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Hide all view panels
    document.querySelectorAll('.page-view').forEach(panel => {
      panel.classList.remove('active');
    });

    // Show target view panel
    const targetPanel = document.getElementById(`view-${viewName}`);
    if (targetPanel) {
      targetPanel.classList.add('active');
    }

    // Trigger tab-specific refresh
    if (viewName === 'dashboard') {
      Dashboard.loadData();
    } else if (viewName === 'create-invoice') {
      InvoiceForm.render();
    } else if (viewName === 'archive') {
      Archive.loadTreeAndInvoices();
    } else if (viewName === 'settings') {
      Settings.render();
    }
  },

  async openInvoiceModal(invoiceId) {
    this.currentModalInvoiceId = invoiceId;
    const modalOverlay = document.getElementById('invoice-modal-overlay');
    const container = document.getElementById('modal-invoice-preview-container');

    container.innerHTML = `<p style="text-align: center; color: var(--text-4); padding: 48px;">Generating bill preview...</p>`;
    modalOverlay.classList.add('open');

    try {
      const [invRes, setRes] = await Promise.all([
        API.getInvoice(invoiceId),
        API.getSettings()
      ]);

      if (invRes.success && invRes.data) {
        this.renderInvoiceSheet(container, invRes.data, setRes.data);
      } else {
        container.innerHTML = `<p style="text-align: center; color: var(--danger); padding: 48px;">Failed to load invoice</p>`;
      }
    } catch (e) {
      console.error('Error opening invoice modal:', e);
      container.innerHTML = `<p style="text-align: center; color: var(--danger); padding: 48px;">Error generating preview</p>`;
    }
  },

  closeInvoiceModal() {
    const modalOverlay = document.getElementById('invoice-modal-overlay');
    modalOverlay.classList.remove('open');
    this.currentModalInvoiceId = null;
  },

  renderInvoiceSheet(container, inv, settings) {
    const snap = inv.snapshot || {};
    const hotel = snap.hotel || {
      name: settings.hotel_name,
      tagline: settings.tagline,
      address: settings.address,
      phone: settings.phone,
      email: settings.email,
      gstin: settings.gstin,
      state: settings.state,
      state_code: settings.state_code,
      bank_name: settings.bank_name,
      account_number: settings.account_number,
      ifsc_code: settings.ifsc_code,
      upi_id: settings.upi_id
    };

    const tpl = snap.template || settings.template_config || {};
    const items = inv.items || [];
    const isInterstate = !!inv.is_interstate;

    let statusClass = 'status-paid';
    if (inv.status === 'Cancelled') statusClass = 'status-cancelled';
    else if (inv.payment_status === 'Partially Paid') statusClass = 'status-partial';
    else if (inv.payment_status === 'Unpaid') statusClass = 'status-unpaid';

    container.innerHTML = `
      <div class="a4-preview-sheet" id="printable-a4-sheet">
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 16px; border-bottom: 2px solid var(--accent);">
          <div style="display: flex; gap: 16px; align-items: center;">
            ${tpl.show_logo !== false ? `<img src="/assets/logo.jpg" alt="Logo" style="height: 64px; width: auto; border-radius: 6px;" />` : ''}
            <div>
              <h1 style="color: var(--accent); font-size: 20px; margin: 0; line-height: 1.1;">${Utils.escapeHtml(hotel.name)}</h1>
              <p style="font-size: 10px; font-weight: 700; color: var(--text-4); text-transform: uppercase; letter-spacing: 0.1em; margin-top: 2px;">${Utils.escapeHtml(hotel.tagline)}</p>
              <p style="font-size: 11px; color: var(--text-3); margin-top: 3px;">${Utils.escapeHtml(hotel.address)}</p>
              <p style="font-size: 11px; color: var(--text-3);">Phone: ${Utils.escapeHtml(hotel.phone)} | Email: ${Utils.escapeHtml(hotel.email)}</p>
              <p style="font-size: 11px; font-weight: 600; color: var(--text);">GSTIN: ${Utils.escapeHtml(hotel.gstin)} | State: ${Utils.escapeHtml(hotel.state)} (Code: ${hotel.state_code})</p>
            </div>
          </div>
          <div style="text-align: right;">
            <div class="pill" style="margin-bottom: 6px;">TAX INVOICE</div>
            <p style="font-size: 13px; font-weight: 700; color: var(--text);">Invoice No: #${Utils.escapeHtml(inv.invoice_number)}</p>
            <p style="font-size: 11px; color: var(--text-3); margin-top: 2px;">Invoice Date: ${Utils.formatDateDisplay(inv.invoice_date)}</p>
            <p style="font-size: 11px; color: var(--text-4);">FY: ${Utils.escapeHtml(inv.fy)}</p>
            <span class="status-badge ${statusClass}" style="margin-top: 6px;">${inv.status === 'Cancelled' ? 'CANCELLED' : inv.payment_status.toUpperCase()}</span>
          </div>
        </div>

        ${inv.status === 'Cancelled' ? `
          <div style="background: var(--danger-tint); border: 1px solid var(--danger); border-radius: 8px; padding: 10px 14px; margin-top: 14px; font-size: 12px; color: var(--danger);">
            <strong>Bill Cancelled:</strong> ${Utils.escapeHtml(inv.cancellation_reason || 'Cancelled by management')}
          </div>
        ` : ''}

        <!-- Guest & Stay Details Grid -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin: 18px 0;">
          <div style="background: var(--card); border-radius: 10px; padding: 14px;">
            <span class="label" style="color: var(--accent); margin-bottom: 6px;">BILLED TO (GUEST DETAILS)</span>
            <p style="font-size: 13px; font-weight: 700; color: var(--text);">${Utils.escapeHtml(inv.customer_name)}</p>
            <p style="font-size: 11px; color: var(--text-3); margin-top: 2px;">Contact: ${Utils.escapeHtml(inv.customer_phone || '-')} | ${Utils.escapeHtml(inv.customer_email || '-')}</p>
            <p style="font-size: 11px; color: var(--text-3);">Address: ${Utils.escapeHtml(inv.customer_address || '-')}</p>
            ${tpl.show_gstin !== false && inv.customer_gstin ? `<p style="font-size: 11px; color: var(--accent); font-weight: 600; margin-top: 4px;">GSTIN: ${Utils.escapeHtml(inv.customer_gstin)}</p>` : ''}
            ${tpl.show_aadhaar !== false && inv.customer_aadhaar ? `<p style="font-size: 11px; color: var(--text-2);">Aadhaar: ${Utils.escapeHtml(inv.customer_aadhaar)}</p>` : ''}
            ${tpl.show_pan !== false && inv.customer_pan ? `<p style="font-size: 11px; color: var(--text-2);">PAN: ${Utils.escapeHtml(inv.customer_pan)}</p>` : ''}
          </div>

          <div style="background: var(--card); border-radius: 10px; padding: 14px;">
            <span class="label" style="color: var(--accent); margin-bottom: 6px;">STAY & RESERVATION DETAILS</span>
            <p style="font-size: 12px;"><strong>Check-In:</strong> ${Utils.formatDateDisplay(inv.checkin_date)} ${tpl.show_stay_time !== false ? '(' + Utils.escapeHtml(inv.checkin_time) + ')' : ''}</p>
            <p style="font-size: 12px; margin-top: 2px;"><strong>Check-Out:</strong> ${Utils.formatDateDisplay(inv.checkout_date)} ${tpl.show_stay_time !== false ? '(' + Utils.escapeHtml(inv.checkout_time) + ')' : ''}</p>
            <p style="font-size: 12px; margin-top: 2px;"><strong>Duration:</strong> ${inv.number_of_nights} Night(s)</p>
            <p style="font-size: 11px; color: var(--text-3); margin-top: 4px;">Place of Supply: ${Utils.escapeHtml(hotel.state)} (${hotel.state_code})</p>
            <p style="font-size: 11px; color: var(--text-3);">Tax Regimen: ${isInterstate ? 'Inter-State (IGST 5%)' : 'Intra-State (CGST 2.5% + SGST 2.5%)'}</p>
          </div>
        </div>

        <!-- Room Items Table -->
        <table class="data-table" style="margin-bottom: 18px; border: 1px solid var(--line); border-radius: 8px;">
          <thead>
            <tr style="background: var(--accent-tint);">
              <th style="width: 30px; text-align: center;">#</th>
              <th>Room Category</th>
              <th style="width: 70px; text-align: center;">Room</th>
              ${tpl.show_hsn !== false ? '<th style="width: 70px; text-align: center;">HSN/SAC</th>' : ''}
              <th style="width: 60px; text-align: center;">Nights</th>
              <th style="width: 50px; text-align: center;">Qty</th>
              <th style="width: 90px; text-align: right;">Rate (₹)</th>
              <th style="width: 100px; text-align: right;">Taxable (₹)</th>
              ${isInterstate ? `
                <th style="width: 80px; text-align: right;">IGST (5%)</th>
              ` : `
                <th style="width: 80px; text-align: right;">CGST (2.5%)</th>
                <th style="width: 80px; text-align: right;">SGST (2.5%)</th>
              `}
              <th style="width: 100px; text-align: right;">Total (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((it, idx) => `
              <tr>
                <td style="text-align: center; color: var(--text-4);">${idx + 1}</td>
                <td><strong>${Utils.escapeHtml(it.room_category)}</strong></td>
                <td class="cell-room-badge">${Utils.escapeHtml(it.room_number || '-')}</td>
                ${tpl.show_hsn !== false ? `<td style="text-align: center;">${Utils.escapeHtml(it.hsn_sac || '996311')}</td>` : ''}
                <td style="text-align: center;">${it.nights}</td>
                <td style="text-align: center;">${it.quantity}</td>
                <td style="text-align: right;">${Number(it.price_per_day).toFixed(2)}</td>
                <td style="text-align: right;">${Number(it.amount).toFixed(2)}</td>
                ${isInterstate ? `
                  <td style="text-align: right;">${(Number(it.amount) * 0.05).toFixed(2)}</td>
                ` : `
                  <td style="text-align: right;">${Number(it.cgst_amount || 0).toFixed(2)}</td>
                  <td style="text-align: right;">${Number(it.sgst_amount || 0).toFixed(2)}</td>
                `}
                <td style="text-align: right; font-weight: 600;">${Number(it.total_item_amount).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <!-- Summary & Totals Grid -->
        <div style="display: grid; grid-template-columns: 1fr 280px; gap: 20px; margin-bottom: 20px;">
          <div style="background: var(--card); border-radius: 10px; padding: 14px;">
            <p style="font-size: 11px; color: var(--text-3); text-transform: uppercase; font-weight: 600; letter-spacing: 0.06em;">AMOUNT IN WORDS</p>
            <p style="font-size: 13px; font-weight: 600; color: var(--accent); margin-top: 3px; font-style: italic;">
              ${Utils.escapeHtml(inv.total_in_words)}
            </p>

            <div class="divider" style="margin: 10px 0;"></div>

            <p style="font-size: 11px; color: var(--text-3); text-transform: uppercase; font-weight: 600; letter-spacing: 0.06em;">PAYMENT SETTLEMENT</p>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 6px; font-size: 12px;">
              <div>Cash Paid: <strong>${Utils.formatCurrency(inv.cash_amount)}</strong></div>
              <div>Online Paid: <strong>${Utils.formatCurrency(inv.online_amount)}</strong></div>
              <div>Total Received: <strong>${Utils.formatCurrency(inv.total_received)}</strong></div>
              <div>Balance Due: <strong style="color: ${inv.balance_due > 0 ? 'var(--danger)' : 'var(--success)'};">${Utils.formatCurrency(inv.balance_due)}</strong></div>
            </div>

            ${tpl.show_bank_details !== false && hotel.bank_name ? `
              <div style="margin-top: 10px; font-size: 11px; color: var(--text-3); background: #FFFFFF; border: 1px solid var(--line); border-radius: 6px; padding: 8px 10px;">
                <strong>Bank:</strong> ${Utils.escapeHtml(hotel.bank_name)} | <strong>A/C:</strong> ${Utils.escapeHtml(hotel.account_number)}<br/>
                <strong>IFSC:</strong> ${Utils.escapeHtml(hotel.ifsc_code)} | <strong>UPI ID:</strong> <strong>${Utils.escapeHtml(hotel.upi_id)}</strong>
              </div>
            ` : ''}
          </div>

          <!-- Tax Calculations Column -->
          <div style="display: flex; flex-direction: column; justify-content: space-between;">
            <div style="font-size: 12px;">
              <div style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid var(--line);">
                <span style="color: var(--text-3);">Subtotal:</span>
                <strong>${Utils.formatCurrency(inv.subtotal)}</strong>
              </div>

              ${isInterstate ? `
                <div style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid var(--line);">
                  <span style="color: var(--text-3);">IGST (${inv.igst_rate}%):</span>
                  <span>${Utils.formatCurrency(inv.igst_amount)}</span>
                </div>
              ` : `
                <div style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid var(--line);">
                  <span style="color: var(--text-3);">CGST (${inv.cgst_rate}%):</span>
                  <span>${Utils.formatCurrency(inv.cgst_amount)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid var(--line);">
                  <span style="color: var(--text-3);">SGST (${inv.sgst_rate}%):</span>
                  <span>${Utils.formatCurrency(inv.sgst_amount)}</span>
                </div>
              `}

              ${inv.round_off ? `
                <div style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid var(--line);">
                  <span style="color: var(--text-3);">Round Off:</span>
                  <span>${inv.round_off >= 0 ? '+' : ''}${Utils.formatCurrency(inv.round_off)}</span>
                </div>
              ` : ''}
            </div>

            <div style="background: var(--accent-tint); border: 1.5px solid var(--accent); border-radius: 10px; padding: 12px 14px; margin-top: 10px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 12px; font-weight: 700; color: var(--text);">GRAND TOTAL</span>
                <span style="font-size: 20px; font-weight: 700; color: var(--accent);">${Utils.formatCurrency(inv.grand_total)}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer Terms & Signatory Section -->
        <div style="display: flex; justify-content: space-between; align-items: flex-end; padding-top: 14px; border-top: 1px solid var(--line); font-size: 10px; color: var(--text-3);">
          <div style="max-width: 60%;">
            <strong>Terms & Conditions:</strong><br/>
            ${Utils.escapeHtml(tpl.terms || '').replace(/\n/g, '<br/>')}
          </div>

          <div style="border: 1px solid var(--line); padding: 10px 16px; border-radius: 6px; text-align: center; min-width: 160px; background: #FAFAFA;">
            <p style="font-size: 11px; font-weight: 600; color: var(--text);">${Utils.escapeHtml(tpl.signatory_title || "For NAYAK'S SUJAY\\nAuthorized Signatory").replace(/\\n/g, '<br/>')}</p>
          </div>
        </div>

        <p style="text-align: center; font-size: 10px; color: var(--text-4); margin-top: 16px; font-style: italic;">
          ${Utils.escapeHtml(tpl.footer_note || 'Thank you for choosing Nayak\'s Sujay. Experience the Divine Comfort!')}
        </p>
      </div>
    `;
  },

  async editInvoice(invoiceId) {
    try {
      const res = await API.getInvoice(invoiceId);
      if (res.success && res.data) {
        State.setView('create-invoice');
        setTimeout(() => {
          InvoiceForm.render(res.data);
        }, 50);
      }
    } catch (e) {
      console.error('Error fetching invoice for edit:', e);
    }
  },

  async promptCancelInvoice(invoiceId, invoiceNumber) {
    const reason = prompt(`Are you sure you want to cancel Bill #${invoiceNumber}? Please enter cancellation reason:`, 'Guest cancellation before occupancy');
    if (reason === null) return; // User pressed Cancel in prompt

    try {
      const res = await API.cancelInvoice(invoiceId, reason.trim() || 'Cancelled by receptionist');
      if (res.success) {
        this.showToast(`Bill #${invoiceNumber} has been marked as Cancelled`, 'success');
        Archive.loadInvoices();
        Dashboard.loadData();
      } else {
        this.showToast(res.error || 'Failed to cancel bill', 'error');
      }
    } catch (e) {
      this.showToast('Server error while cancelling bill', 'error');
    }
  },

  showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span>${Utils.escapeHtml(message)}</span>
    `;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(12px)';
      toast.style.transition = 'all 0.2s ease';
      setTimeout(() => toast.remove(), 250);
    }, 3500);
  }
};

window.App = App;

// Bootstrap on DOM load
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
