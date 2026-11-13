/**
 * Invoice Creation & Edit Controller
 * Fast, intuitive, receptionist-friendly with full validation and auto-GST calculations.
 */

const InvoiceForm = {
  container: null,
  isEditing: false,
  editingInvoiceId: null,
  items: [],
  categories: [],
  settings: null,

  init(containerEl) {
    this.container = containerEl;
  },

  async render(invoiceToEdit = null) {
    this.isEditing = !!invoiceToEdit;
    this.editingInvoiceId = invoiceToEdit ? invoiceToEdit.id : null;

    // Load fresh settings and categories
    try {
      const [setRes, catRes] = await Promise.all([
        API.getSettings(),
        API.getCategories()
      ]);
      this.settings = setRes.data;
      this.categories = catRes.data;
    } catch (e) {
      console.error('Error fetching settings/categories:', e);
    }

    const todayStr = Utils.getTodayDateString();
    let nextNum = '001';

    if (!this.isEditing) {
      try {
        const numRes = await API.getNextInvoiceNumber();
        if (numRes.success) nextNum = numRes.invoice_number;
      } catch (err) {
        console.error('Error getting next number:', err);
      }
    } else {
      nextNum = invoiceToEdit.invoice_number;
    }

    // Default dates
    const checkOut = invoiceToEdit ? invoiceToEdit.checkout_date : todayStr;
    const checkIn = invoiceToEdit ? invoiceToEdit.checkin_date : todayStr;
    const invDate = invoiceToEdit ? invoiceToEdit.invoice_date : checkOut;
    const nights = invoiceToEdit ? invoiceToEdit.number_of_nights : 1;

    this.container.innerHTML = `
      <div class="section-header">
        <div>
          <h1>${this.isEditing ? 'Edit Invoice' : 'Create New Invoice'} <span>&bull; Bill #${nextNum}</span></h1>
          <p style="color: var(--text-3); font-size: 13px; margin-top: 4px;">Enter guest details, room stays and payment breakdown</p>
        </div>
        <div style="display: flex; gap: 10px;">
          <button class="btn btn-secondary" id="btn-cancel-form">Cancel</button>
          <button class="btn btn-primary" id="btn-save-invoice">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
            ${this.isEditing ? 'Save & Update Bill' : 'Issue & Generate Bill'}
          </button>
        </div>
      </div>

      <!-- Hotel Banner Card (Configured from Settings) -->
      <div class="card white" style="margin-bottom: 24px; padding: 18px 24px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px;">
        <div style="display: flex; align-items: center; gap: 16px;">
          <img src="/assets/logo.jpg" alt="Hotel Logo" style="height: 52px; width: auto; border-radius: 6px;" />
          <div>
            <h3 style="color: var(--accent); font-size: 17px; margin-bottom: 2px;">${Utils.escapeHtml(this.settings.hotel_name)}</h3>
            <p style="font-size: 11px; color: var(--text-4); font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em;">${Utils.escapeHtml(this.settings.tagline)}</p>
            <p style="font-size: 12px; color: var(--text-3); margin-top: 2px;">${Utils.escapeHtml(this.settings.address)}</p>
          </div>
        </div>
        <div style="text-align: right;">
          <div class="pill">GSTIN: ${Utils.escapeHtml(this.settings.gstin)}</div>
          <p style="font-size: 11px; color: var(--text-3); margin-top: 5px;">Phone: ${Utils.escapeHtml(this.settings.phone)}</p>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px;">
        <!-- Guest Details Card -->
        <div class="card white">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <h3>Guest Information</h3>
            <span class="label" style="margin: 0;">CUSTOMER PROFILE</span>
          </div>

          <div class="form-group">
            <label class="label">Guest Full Name *</label>
            <input type="text" id="cust_name" placeholder="e.g. Dr. Rajesh Kamath" value="${invoiceToEdit ? Utils.escapeHtml(invoiceToEdit.customer_name) : ''}" required />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="label">Phone Number *</label>
              <input type="tel" id="cust_phone" placeholder="10-digit mobile" maxlength="15" value="${invoiceToEdit ? Utils.escapeHtml(invoiceToEdit.customer_phone || '') : ''}" />
            </div>
            <div class="form-group">
              <label class="label">Email Address</label>
              <input type="email" id="cust_email" placeholder="guest@example.com" value="${invoiceToEdit ? Utils.escapeHtml(invoiceToEdit.customer_email || '') : ''}" />
            </div>
          </div>

          <div class="form-group">
            <label class="label">Customer Address / City</label>
            <input type="text" id="cust_address" placeholder="City, State" value="${invoiceToEdit ? Utils.escapeHtml(invoiceToEdit.customer_address || '') : ''}" />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="label">Customer GSTIN (B2B)</label>
              <input type="text" id="cust_gstin" placeholder="15-character GSTIN" maxlength="15" style="text-transform: uppercase;" value="${invoiceToEdit ? Utils.escapeHtml(invoiceToEdit.customer_gstin || '') : ''}" />
            </div>
            <div class="form-group">
              <label class="label">Aadhaar / ID Number</label>
              <input type="text" id="cust_aadhaar" placeholder="12-digit Aadhaar / ID" value="${invoiceToEdit ? Utils.escapeHtml(invoiceToEdit.customer_aadhaar || '') : ''}" />
            </div>
            <div class="form-group">
              <label class="label">PAN Number</label>
              <input type="text" id="cust_pan" placeholder="10-digit PAN" maxlength="10" style="text-transform: uppercase;" value="${invoiceToEdit ? Utils.escapeHtml(invoiceToEdit.customer_pan || '') : ''}" />
            </div>
          </div>
        </div>

        <!-- Stay Details Card -->
        <div class="card white">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <h3>Stay & Reservation Details</h3>
            <span class="label" style="margin: 0;">CHECK-IN / OUT</span>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="label">Check-In Date *</label>
              <input type="date" id="stay_checkin_date" value="${checkIn}" required />
            </div>
            <div class="form-group">
              <label class="label">Check-In Time</label>
              <input type="text" id="stay_checkin_time" value="${invoiceToEdit ? Utils.escapeHtml(invoiceToEdit.checkin_time) : '12:00 PM'}" />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="label">Check-Out Date *</label>
              <input type="date" id="stay_checkout_date" value="${checkOut}" required />
            </div>
            <div class="form-group">
              <label class="label">Check-Out Time</label>
              <input type="text" id="stay_checkout_time" value="${invoiceToEdit ? Utils.escapeHtml(invoiceToEdit.checkout_time) : '11:00 AM'}" />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="label">Number of Nights</label>
              <input type="number" id="stay_nights" min="1" value="${nights}" />
            </div>
            <div class="form-group">
              <label class="label">Invoice Date (Auto-syncs with Check-Out)</label>
              <input type="date" id="stay_invoice_date" value="${invDate}" />
            </div>
          </div>

          <div class="form-group" style="margin-top: 10px;">
            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; font-weight: 500;">
              <input type="checkbox" id="is_interstate" ${invoiceToEdit && invoiceToEdit.is_interstate ? 'checked' : ''} style="width: 16px; height: 16px; accent-color: var(--accent);" />
              Inter-State Guest (Apply IGST 5% instead of CGST 2.5% + SGST 2.5%)
            </label>
          </div>
        </div>
      </div>

      <!-- Multiple Rooms & Billing Items Table -->
      <div class="card white" style="margin-bottom: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <div>
            <h3>Room Allocations & Billing Items</h3>
            <p style="color: var(--text-3); font-size: 12px; margin-top: 2px;">Add multiple rooms and custom items dynamically to this bill</p>
          </div>
          <button type="button" class="btn btn-secondary btn-sm" id="btn-add-room-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            + Add Another Room
          </button>
        </div>

        <div class="table-container" style="border: 1px solid var(--line);">
          <table class="data-table" id="items-table">
            <thead>
              <tr>
                <th style="width: 250px;">Room Category</th>
                <th style="width: 110px;">Room No</th>
                <th style="width: 100px;">HSN/SAC</th>
                <th style="width: 80px; text-align: center;">Nights</th>
                <th style="width: 70px; text-align: center;">Qty</th>
                <th style="width: 130px; text-align: right;">Rate / Day (₹)</th>
                <th style="width: 140px; text-align: right;">Taxable Amount (₹)</th>
                <th style="width: 60px; text-align: center;">Action</th>
              </tr>
            </thead>
            <tbody id="items-tbody">
              <!-- Rendered dynamically -->
            </tbody>
          </table>
        </div>
      </div>

      <!-- Live Calculation & Payment Breakdown Grid -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px;">
        <!-- Payment Details Card -->
        <div class="card white">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <h3>Payment Collection</h3>
            <span id="live-payment-status" class="status-badge status-paid">PAID</span>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="label">Cash Payment (₹)</label>
              <input type="number" id="pay_cash" min="0" step="0.01" value="${invoiceToEdit ? invoiceToEdit.cash_amount : 0}" />
            </div>
            <div class="form-group">
              <label class="label">Online Payment (₹)</label>
              <input type="number" id="pay_online" min="0" step="0.01" value="${invoiceToEdit ? invoiceToEdit.online_amount : 0}" />
            </div>
          </div>

          <div class="form-group">
            <label class="label">Online Transaction / UPI Reference ID</label>
            <input type="text" id="pay_online_ref" placeholder="UPI Ref / Card Approval Code / GPay Ref" value="${invoiceToEdit ? Utils.escapeHtml(invoiceToEdit.online_ref || '') : ''}" />
          </div>

          <div style="display: flex; gap: 8px; margin-bottom: 18px;">
            <button type="button" class="btn btn-secondary btn-sm" id="btn-quick-full-cash">Full Cash</button>
            <button type="button" class="btn btn-secondary btn-sm" id="btn-quick-full-online">Full Online</button>
            <button type="button" class="btn btn-secondary btn-sm" id="btn-quick-split">Split 50/50</button>
            <button type="button" class="btn btn-secondary btn-sm" id="btn-quick-clear-pay">Clear</button>
          </div>

          <div style="background: var(--card); border-radius: 10px; padding: 14px; font-size: 13px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
              <span style="color: var(--text-3);">Total Amount Received:</span>
              <strong id="live-total-received">₹ 0.00</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: var(--text-3);">Remaining Balance Due:</span>
              <strong id="live-balance-due" style="color: var(--danger);">₹ 0.00</strong>
            </div>
          </div>

          <div class="form-group" style="margin-top: 16px;">
            <label class="label">Notes / Reception Remarks</label>
            <textarea id="inv_notes" placeholder="Optional notes (e.g. extra bed provided, early check-in granted)">${invoiceToEdit ? Utils.escapeHtml(invoiceToEdit.notes || '') : ''}</textarea>
          </div>
        </div>

        <!-- Grand Total & GST Automation Card -->
        <div class="card white" style="display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
              <h3>GST Calculation Summary</h3>
              <span class="pill pill-sm">5% GST AUTO</span>
            </div>

            <div style="font-size: 13px;">
              <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--line);">
                <span style="color: var(--text-3);">Subtotal (Taxable Value):</span>
                <strong id="calc-subtotal">₹ 0.00</strong>
              </div>

              <div id="cgst-row" style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--line);">
                <span style="color: var(--text-3);">CGST (<span id="cgst-rate-label">${this.settings.cgst_rate}</span>%):</span>
                <span id="calc-cgst">₹ 0.00</span>
              </div>

              <div id="sgst-row" style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--line);">
                <span style="color: var(--text-3);">SGST (<span id="sgst-rate-label">${this.settings.sgst_rate}</span>%):</span>
                <span id="calc-sgst">₹ 0.00</span>
              </div>

              <div id="igst-row" style="display: none; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--line);">
                <span style="color: var(--text-3);">IGST (<span id="igst-rate-label">${this.settings.igst_rate}</span>%):</span>
                <span id="calc-igst">₹ 0.00</span>
              </div>

              <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--line);">
                <span style="color: var(--text-3);">Round Off Adjustment:</span>
                <span id="calc-roundoff">₹ 0.00</span>
              </div>
            </div>
          </div>

          <div>
            <div style="background: var(--accent-tint); border: 1.5px solid var(--accent); border-radius: 12px; padding: 18px 20px; margin-top: 16px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 14px; font-weight: 700; color: var(--text); text-transform: uppercase; letter-spacing: 0.05em;">GRAND TOTAL</span>
                <span id="calc-grandtotal" style="font-size: 26px; font-weight: 700; color: var(--accent);">₹ 0.00</span>
              </div>
              <div style="margin-top: 8px; font-size: 12px; color: var(--text-2); font-style: italic;" id="calc-inwords">
                Indian Rupees Zero Only
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Populate Items
    if (invoiceToEdit && invoiceToEdit.items && invoiceToEdit.items.length > 0) {
      this.items = invoiceToEdit.items.map(it => ({
        room_category: it.room_category,
        room_number: it.room_number,
        quantity: it.quantity,
        nights: it.nights,
        price_per_day: it.price_per_day,
        hsn_sac: it.hsn_sac || this.settings.default_hsn
      }));
    } else {
      // Default to 1 item
      const defaultCat = this.categories[0] || { name: 'Double Bedroom', default_rate: 2200 };
      this.items = [{
        room_category: defaultCat.name,
        room_number: '101',
        quantity: 1,
        nights: nights,
        price_per_day: defaultCat.default_rate,
        hsn_sac: defaultCat.default_hsn || this.settings.default_hsn || '996311'
      }];
    }

    this.renderItemsTable();
    this.bindEvents();
    this.recalculateAll();

    // Default payment to Grand Total if new bill
    if (!this.isEditing) {
      setTimeout(() => {
        this.setFullCash();
      }, 50);
    }
  },

  renderItemsTable() {
    const tbody = document.getElementById('items-tbody');
    tbody.innerHTML = this.items.map((it, idx) => {
      const taxable = (it.quantity * it.nights * it.price_per_day).toFixed(2);
      
      const categoryOptions = this.categories.map(c => `
        <option value="${Utils.escapeHtml(c.name)}" ${c.name === it.room_category ? 'selected' : ''}>
          ${Utils.escapeHtml(c.name)} (₹${c.default_rate})
        </option>
      `).join('');

      return `
        <tr data-index="${idx}">
          <td>
            <select class="item-cat-select" data-index="${idx}">
              ${categoryOptions}
            </select>
          </td>
          <td>
            <input type="text" class="item-room-input" data-index="${idx}" value="${Utils.escapeHtml(it.room_number)}" placeholder="Room #" />
          </td>
          <td>
            <input type="text" class="item-hsn-input" data-index="${idx}" value="${Utils.escapeHtml(it.hsn_sac)}" />
          </td>
          <td>
            <input type="number" class="item-nights-input" data-index="${idx}" min="1" value="${it.nights}" style="text-align: center;" />
          </td>
          <td>
            <input type="number" class="item-qty-input" data-index="${idx}" min="1" value="${it.quantity}" style="text-align: center;" />
          </td>
          <td>
            <input type="number" class="item-rate-input" data-index="${idx}" min="0" step="50" value="${it.price_per_day}" style="text-align: right;" />
          </td>
          <td style="text-align: right; font-weight: 600;">
            ₹ ${taxable}
          </td>
          <td style="text-align: center;">
            <button type="button" class="btn btn-secondary btn-icon item-remove-btn" data-index="${idx}" title="Remove item" ${this.items.length === 1 ? 'disabled style="opacity: 0.3;"' : ''}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  },

  bindEvents() {
    // Check-in and Check-out Date change -> auto recalculate nights & invoice date
    const cinInput = document.getElementById('stay_checkin_date');
    const coutInput = document.getElementById('stay_checkout_date');
    const nightsInput = document.getElementById('stay_nights');
    const invDateInput = document.getElementById('stay_invoice_date');

    const updateNights = () => {
      const calculatedNights = Utils.calculateNights(cinInput.value, coutInput.value);
      nightsInput.value = calculatedNights;
      invDateInput.value = coutInput.value; // invoice date auto-syncs to checkout
      
      // Update all items nights
      this.items.forEach(it => it.nights = calculatedNights);
      this.renderItemsTable();
      this.recalculateAll();
    };

    cinInput.addEventListener('change', updateNights);
    coutInput.addEventListener('change', updateNights);
    nightsInput.addEventListener('input', () => {
      const val = parseInt(nightsInput.value) || 1;
      this.items.forEach(it => it.nights = val);
      this.renderItemsTable();
      this.recalculateAll();
    });

    document.getElementById('is_interstate').addEventListener('change', () => {
      this.recalculateAll();
    });

    // Add item button
    document.getElementById('btn-add-room-item').addEventListener('click', () => {
      const currentNights = parseInt(nightsInput.value) || 1;
      const defaultCat = this.categories[0] || { name: 'Double Bedroom', default_rate: 2200 };
      this.items.push({
        room_category: defaultCat.name,
        room_number: '',
        quantity: 1,
        nights: currentNights,
        price_per_day: defaultCat.default_rate,
        hsn_sac: defaultCat.default_hsn || this.settings.default_hsn || '996311'
      });
      this.renderItemsTable();
      this.recalculateAll();
    });

    // Table delegated events
    const tbody = document.getElementById('items-tbody');
    tbody.addEventListener('change', (e) => {
      const idx = e.target.dataset.index;
      if (idx === undefined) return;
      const item = this.items[idx];

      if (e.target.classList.contains('item-cat-select')) {
        item.room_category = e.target.value;
        const matched = this.categories.find(c => c.name === item.room_category);
        if (matched) {
          item.price_per_day = matched.default_rate;
          item.hsn_sac = matched.default_hsn || this.settings.default_hsn || '996311';
        }
        this.renderItemsTable();
        this.recalculateAll();
      }
    });

    tbody.addEventListener('input', (e) => {
      const idx = e.target.dataset.index;
      if (idx === undefined) return;
      const item = this.items[idx];

      if (e.target.classList.contains('item-room-input')) {
        item.room_number = e.target.value;
      } else if (e.target.classList.contains('item-hsn-input')) {
        item.hsn_sac = e.target.value;
      } else if (e.target.classList.contains('item-nights-input')) {
        item.nights = parseInt(e.target.value) || 1;
        this.recalculateAll();
      } else if (e.target.classList.contains('item-qty-input')) {
        item.quantity = parseInt(e.target.value) || 1;
        this.recalculateAll();
      } else if (e.target.classList.contains('item-rate-input')) {
        item.price_per_day = parseFloat(e.target.value) || 0;
        this.recalculateAll();
      }
    });

    tbody.addEventListener('click', (e) => {
      const removeBtn = e.target.closest('.item-remove-btn');
      if (removeBtn && this.items.length > 1) {
        const idx = parseInt(removeBtn.dataset.index);
        this.items.splice(idx, 1);
        this.renderItemsTable();
        this.recalculateAll();
      }
    });

    // Payment inputs & Quick buttons
    const payCash = document.getElementById('pay_cash');
    const payOnline = document.getElementById('pay_online');

    payCash.addEventListener('input', () => this.updatePaymentTotals());
    payOnline.addEventListener('input', () => this.updatePaymentTotals());

    document.getElementById('btn-quick-full-cash').addEventListener('click', () => this.setFullCash());
    document.getElementById('btn-quick-full-online').addEventListener('click', () => this.setFullOnline());
    document.getElementById('btn-quick-split').addEventListener('click', () => this.setSplitPayment());
    document.getElementById('btn-quick-clear-pay').addEventListener('click', () => {
      payCash.value = 0;
      payOnline.value = 0;
      this.updatePaymentTotals();
    });

    // Save and Cancel buttons
    document.getElementById('btn-cancel-form').addEventListener('click', () => {
      State.setView('dashboard');
    });

    document.getElementById('btn-save-invoice').addEventListener('click', () => {
      this.submitInvoice();
    });
  },

  recalculateAll() {
    let subtotal = 0;
    this.items.forEach(it => {
      const itemTaxable = (it.quantity * it.nights * it.price_per_day);
      subtotal += itemTaxable;
    });

    const isInterstate = document.getElementById('is_interstate').checked;
    const cgstRate = isInterstate ? 0 : parseFloat(this.settings.cgst_rate || 2.5);
    const sgstRate = isInterstate ? 0 : parseFloat(this.settings.sgst_rate || 2.5);
    const igstRate = isInterstate ? parseFloat(this.settings.igst_rate || 5.0) : 0;

    const cgstAmt = Math.round(subtotal * (cgstRate / 100) * 100) / 100;
    const sgstAmt = Math.round(subtotal * (sgstRate / 100) * 100) / 100;
    const igstAmt = isInterstate ? Math.round(subtotal * (igstRate / 100) * 100) / 100 : 0;

    const exactTotal = subtotal + cgstAmt + sgstAmt + igstAmt;
    const grandTotal = Math.round(exactTotal);
    const roundOff = Math.round((grandTotal - exactTotal) * 100) / 100;

    // Update UI
    document.getElementById('calc-subtotal').textContent = Utils.formatCurrency(subtotal);

    const cgstRow = document.getElementById('cgst-row');
    const sgstRow = document.getElementById('sgst-row');
    const igstRow = document.getElementById('igst-row');

    if (isInterstate) {
      cgstRow.style.display = 'none';
      sgstRow.style.display = 'none';
      igstRow.style.display = 'flex';
      document.getElementById('calc-igst').textContent = Utils.formatCurrency(igstAmt);
    } else {
      cgstRow.style.display = 'flex';
      sgstRow.style.display = 'flex';
      igstRow.style.display = 'none';
      document.getElementById('calc-cgst').textContent = Utils.formatCurrency(cgstAmt);
      document.getElementById('calc-sgst').textContent = Utils.formatCurrency(sgstAmt);
    }

    document.getElementById('calc-roundoff').textContent = `${roundOff >= 0 ? '+' : ''}${Utils.formatCurrency(roundOff)}`;
    document.getElementById('calc-grandtotal').textContent = Utils.formatCurrency(grandTotal);
    document.getElementById('calc-inwords').textContent = Utils.numberToWords(grandTotal);

    this.currentGrandTotal = grandTotal;
    this.updatePaymentTotals();
  },

  updatePaymentTotals() {
    const cash = parseFloat(document.getElementById('pay_cash').value) || 0;
    const online = parseFloat(document.getElementById('pay_online').value) || 0;
    const totalReceived = cash + online;
    const balanceDue = Math.max(0, (this.currentGrandTotal || 0) - totalReceived);

    document.getElementById('live-total-received').textContent = Utils.formatCurrency(totalReceived);
    document.getElementById('live-balance-due').textContent = Utils.formatCurrency(balanceDue);

    const statusBadge = document.getElementById('live-payment-status');
    if (totalReceived >= (this.currentGrandTotal || 0)) {
      statusBadge.className = 'status-badge status-paid';
      statusBadge.textContent = 'PAID';
    } else if (totalReceived > 0) {
      statusBadge.className = 'status-badge status-partial';
      statusBadge.textContent = 'PARTIALLY PAID';
    } else {
      statusBadge.className = 'status-badge status-unpaid';
      statusBadge.textContent = 'UNPAID';
    }
  },

  setFullCash() {
    document.getElementById('pay_cash').value = this.currentGrandTotal || 0;
    document.getElementById('pay_online').value = 0;
    this.updatePaymentTotals();
  },

  setFullOnline() {
    document.getElementById('pay_online').value = this.currentGrandTotal || 0;
    document.getElementById('pay_cash').value = 0;
    this.updatePaymentTotals();
  },

  setSplitPayment() {
    const half = Math.round(((this.currentGrandTotal || 0) / 2) * 100) / 100;
    const otherHalf = (this.currentGrandTotal || 0) - half;
    document.getElementById('pay_cash').value = half;
    document.getElementById('pay_online').value = otherHalf;
    this.updatePaymentTotals();
  },

  async submitInvoice() {
    const custName = document.getElementById('cust_name').value.trim();
    if (!custName) {
      App.showToast('Please enter guest full name', 'error');
      document.getElementById('cust_name').focus();
      return;
    }

    const payload = {
      customer_name: custName,
      customer_phone: document.getElementById('cust_phone').value.trim(),
      customer_email: document.getElementById('cust_email').value.trim(),
      customer_address: document.getElementById('cust_address').value.trim(),
      customer_gstin: document.getElementById('cust_gstin').value.trim(),
      customer_aadhaar: document.getElementById('cust_aadhaar').value.trim(),
      customer_pan: document.getElementById('cust_pan').value.trim(),
      checkin_date: document.getElementById('stay_checkin_date').value,
      checkin_time: document.getElementById('stay_checkin_time').value.trim(),
      checkout_date: document.getElementById('stay_checkout_date').value,
      checkout_time: document.getElementById('stay_checkout_time').value.trim(),
      number_of_nights: parseInt(document.getElementById('stay_nights').value) || 1,
      invoice_date: document.getElementById('stay_invoice_date').value,
      is_interstate: document.getElementById('is_interstate').checked ? 1 : 0,
      cash_amount: parseFloat(document.getElementById('pay_cash').value) || 0,
      online_amount: parseFloat(document.getElementById('pay_online').value) || 0,
      online_ref: document.getElementById('pay_online_ref').value.trim(),
      notes: document.getElementById('inv_notes').value.trim(),
      items: this.items
    };

    try {
      let res;
      if (this.isEditing) {
        res = await API.updateInvoice(this.editingInvoiceId, payload);
      } else {
        res = await API.createInvoice(payload);
      }

      if (res.success && res.data) {
        App.showToast(`Bill #${res.data.invoice_number} saved successfully!`, 'success');
        // Open the preview modal immediately for printing or PDF download
        App.openInvoiceModal(res.data.id);
        State.setView('dashboard');
      } else {
        App.showToast(res.error || 'Failed to save invoice', 'error');
      }
    } catch (err) {
      console.error('Invoice submit error:', err);
      App.showToast('Server error while saving invoice', 'error');
    }
  }
};

window.InvoiceForm = InvoiceForm;
