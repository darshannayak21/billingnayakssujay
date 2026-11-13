/**
 * Live Editable A4 Invoice Sheet Controller
 * Supports 2-click date range calendar, room options dropdown,
 * Qty, Cash & Online subcolumns, real-time GST calculations,
 * and automatic checkout -> invoice date synchronization.
 */

const InvoiceEditor = {
  settings: null,
  currentInvoiceId: null,
  items: [],

  // 2-Click Date Range Calendar Controller
  datePicker: {
    activeRowIndex: null,
    step: 1, // 1 = selecting checkin, 2 = selecting checkout
    tempCheckin: null,
    viewYear: 2026,
    viewMonth: 10, // 0-based: 10 = Nov

    open(rowIndex, triggerEl) {
      this.activeRowIndex = rowIndex;
      this.step = 1;
      const it = InvoiceEditor.items[rowIndex];
      const rawIn = (it && it.checkin) ? it.checkin : Utils.getTodayDMY();
      this.tempCheckin = Utils.dmyToISO(rawIn);

      if (this.tempCheckin) {
        const parts = this.tempCheckin.split('-');
        if (parts.length === 3) {
          this.viewYear = parseInt(parts[0], 10);
          this.viewMonth = parseInt(parts[1], 10) - 1;
        }
      }

      this.render();

      const pop = document.getElementById('date-range-popover');
      const rect = triggerEl.getBoundingClientRect();
      const popLeft = Math.max(10, Math.min(window.innerWidth - 270, rect.left + window.scrollX - 40));
      const popTop = rect.bottom + window.scrollY + 6;

      pop.style.left = `${popLeft}px`;
      pop.style.top = `${popTop}px`;
      pop.style.display = 'block';
    },

    close() {
      const pop = document.getElementById('date-range-popover');
      if (pop) pop.style.display = 'none';
      this.activeRowIndex = null;
      this.step = 1;
    },

    prevMonth() {
      this.viewMonth--;
      if (this.viewMonth < 0) {
        this.viewMonth = 11;
        this.viewYear--;
      }
      this.render();
    },

    nextMonth() {
      this.viewMonth++;
      if (this.viewMonth > 11) {
        this.viewMonth = 0;
        this.viewYear++;
      }
      this.render();
    },

    render() {
      const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];
      document.getElementById('cal-month-year').textContent = `${monthNames[this.viewMonth]} ${this.viewYear}`;

      const statusEl = document.getElementById('cal-status');
      if (this.step === 1) {
        statusEl.textContent = "Click 1: Select Check-in Date";
      } else {
        const dmyIn = Utils.isoToDMY(this.tempCheckin);
        statusEl.textContent = `Check-in: ${dmyIn} • Click 2: Select Check-out Date`;
      }

      const grid = document.getElementById('cal-days-grid');
      const dayHeaders = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
        .map(d => `<div class="popover-day-name">${d}</div>`).join('');

      const firstDay = new Date(this.viewYear, this.viewMonth, 1).getDay();
      const daysInMonth = new Date(this.viewYear, this.viewMonth + 1, 0).getDate();

      let daysHtml = dayHeaders;

      // Empty lead cells
      for (let i = 0; i < firstDay; i++) {
        daysHtml += '<div class="popover-day-cell empty"></div>';
      }

      const activeItem = InvoiceEditor.items[this.activeRowIndex];
      const curCheckinISO = (this.step === 2) ? this.tempCheckin : (activeItem ? Utils.dmyToISO(activeItem.checkin) : null);
      const curCheckoutISO = activeItem ? Utils.dmyToISO(activeItem.checkout) : null;

      for (let day = 1; day <= daysInMonth; day++) {
        const mStr = String(this.viewMonth + 1).padStart(2, '0');
        const dStr = String(day).padStart(2, '0');
        const iso = `${this.viewYear}-${mStr}-${dStr}`;

        let cls = 'popover-day-cell';
        if (iso === curCheckinISO) {
          cls += ' selected-in';
        } else if (this.step === 1 && iso === curCheckoutISO) {
          cls += ' selected-out';
        } else if (this.step === 1 && curCheckinISO && curCheckoutISO && iso > curCheckinISO && iso < curCheckoutISO) {
          cls += ' in-range';
        }

        daysHtml += `<div class="${cls}" data-date="${iso}">${day}</div>`;
      }

      grid.innerHTML = daysHtml;
    },

    onDateClick(dateStr) {
      if (this.activeRowIndex === null || !InvoiceEditor.items[this.activeRowIndex]) return;

      if (this.step === 1) {
        // First click: sets Check-in
        this.tempCheckin = dateStr;
        this.step = 2;
        this.render();
      } else {
        // Second click: sets Check-out
        let checkinISO = this.tempCheckin;
        let checkoutISO = dateStr;

        if (checkoutISO < checkinISO) {
          // If clicked before checkin, make this the new checkin
          this.tempCheckin = checkoutISO;
          this.render();
          return;
        }

        const checkinDMY = Utils.isoToDMY(checkinISO);
        const checkoutDMY = Utils.isoToDMY(checkoutISO);

        const it = InvoiceEditor.items[this.activeRowIndex];
        it.checkin = checkinDMY;
        it.checkout = checkoutDMY;

        // AUTOMATIC REQUIREMENT: Checkout date logic reflects the invoice date always automatically
        document.getElementById('inp-invoice-date').value = checkoutDMY;

        // Update table cells in DOM
        const rowEl = document.querySelector(`tr.data-row[data-index="${this.activeRowIndex}"]`);
        if (rowEl) {
          const inInp = rowEl.querySelector('.cell-checkin');
          const outInp = rowEl.querySelector('.cell-checkout');
          if (inInp) inInp.value = checkinDMY;
          if (outInp) outInp.value = checkoutDMY;
        }

        this.close();
        InvoiceEditor.showToast(`Dates: ${checkinDMY} to ${checkoutDMY} (Invoice Date updated)`);
      }
    }
  },

  async init() {
    await this.loadSettings();
    await this.resetToNewInvoice();
    this.bindEvents();
    this.bindEditFormatModal();
    this.bindDatePickerEvents();
  },

  async loadSettings() {
    try {
      if (window.AppDB) {
        this.settings = await window.AppDB.getSettings();
      } else {
        const res = await fetch('/api/settings');
        const data = await res.json();
        if (data.success) this.settings = data.data;
      }
      this.renderHotelHeader();
    } catch (e) {
      console.error('Error loading settings:', e);
    }
  },

  renderHotelHeader() {
    if (!this.settings) return;
    document.getElementById('hdr-hotel-name').textContent = this.settings.hotel_name || "NAYAK'S SUJAY";
    document.getElementById('hdr-tagline').textContent = (this.settings.tagline || "EXPERIENCE THE DIVINE COMFORT").toUpperCase();
    document.getElementById('hdr-address').textContent = this.settings.address;
    document.getElementById('hdr-gstin').textContent = `GSTIN ${this.settings.gstin}`;
    document.getElementById('hdr-phone').textContent = this.settings.phone;
    document.getElementById('hdr-email').textContent = this.settings.email;
    document.getElementById('hdr-website').textContent = this.settings.website;
    document.getElementById('inp-place-of-supply').value = this.settings.place_of_supply || 'Karnataka (29)';
    document.getElementById('lbl-cgst-rate').textContent = this.settings.cgst_rate || '2.5';
    document.getElementById('lbl-sgst-rate').textContent = this.settings.sgst_rate || '2.5';
    document.getElementById('inp-notes').value = this.settings.notes_default || 'Thanks for your business.';
    document.getElementById('lbl-signatory-title').textContent = this.settings.signatory_title || 'Authorized Signatory';
  },

  getRoomPresets() {
    if (this.settings && Array.isArray(this.settings.room_presets) && this.settings.room_presets.length > 0) {
      return this.settings.room_presets;
    }
    return [
      'A/C DELUXE ROOM',
      'NON A/C DELUXE ROOM',
      'DOUBLE BEDROOM',
      'FOUR BEDROOM',
      'SUITE ROOM'
    ];
  },

  async resetToNewInvoice() {
    this.currentInvoiceId = null;
    const deleteBtn = document.getElementById('btn-delete-bill');
    if (deleteBtn) deleteBtn.style.display = 'none';

    const today = Utils.getTodayDMY();

    try {
      if (window.AppDB) {
        const nextInfo = await window.AppDB.getNextInvoiceNumber();
        if (nextInfo && nextInfo.invoice_number) {
          document.getElementById('inp-invoice-number').value = nextInfo.invoice_number;
        }
      } else {
        const res = await fetch('/api/invoices/next-number');
        const data = await res.json();
        if (data.success) {
          document.getElementById('inp-invoice-number').value = data.invoice_number;
        }
      }
    } catch (e) {
      console.error('Error getting next invoice number:', e);
    }

    // Invoice Date matches Checkout Date in DD-MM-YYYY
    document.getElementById('inp-invoice-date').value = today;
    document.getElementById('inp-terms').value = (this.settings && this.settings.terms_default) || 'Due on Receipt';
    document.getElementById('inp-customer-name').value = '';
    document.getElementById('inp-customer-address').value = '';
    document.getElementById('inp-customer-pincode').value = '';
    document.getElementById('inp-customer-gstin').value = '';

    const presets = this.getRoomPresets();

    // Default 1st row with Cash 2350, Online 0, Qty 1
    this.items = [{
      description: presets[0] || 'A/C DELUXE ROOM',
      checkin: today,
      checkout: today,
      qty: 1,
      cash: 2350.00,
      online: 0.00,
      amount: 2350.00
    }];

    this.renderTableRows();
    this.recalculate();
    document.getElementById('inp-customer-name').focus();
  },

  renderTableRows() {
    const tbody = document.getElementById('excel-table-body');
    const presets = this.getRoomPresets();

    tbody.innerHTML = this.items.map((it, idx) => {
      const rowTotal = ((parseFloat(it.cash) || 0) + (parseFloat(it.online) || 0)) * (parseInt(it.qty) || 1);
      return `
        <tr class="data-row" data-index="${idx}">
          <td style="text-align: center; color: #555; width: 28px; padding: 4px 2px;">${idx + 1}</td>
          
          <!-- Room Description Combobox with quick dropdown showing all presets -->
          <td style="width: 195px; padding: 4px;">
            <div class="room-desc-wrapper">
              <input type="text" class="inline-input cell-desc bold" data-index="${idx}" value="${Utils.escapeHtml(it.description)}" placeholder="Select or enter room..." autocomplete="off" />
              <button type="button" class="btn-room-dropdown" data-index="${idx}" title="Click to view all room presets">▼</button>
              <div class="room-options-menu" id="room-menu-${idx}">
                ${presets.map(p => `
                  <div class="room-option-item" data-index="${idx}" data-val="${Utils.escapeHtml(p)}">${Utils.escapeHtml(p)}</div>
                `).join('')}
              </div>
            </div>
          </td>

          <!-- Check-in (95px, zero clipping) -->
          <td style="width: 95px; padding: 4px 2px;">
            <input type="text" class="inline-input cell-checkin" data-index="${idx}" value="${it.checkin}" style="text-align: center; cursor: pointer; font-size: 11px; padding: 2px 0; width: 100%; letter-spacing: -0.2px;" title="Click to select Check-in & Check-out dates on calendar" readonly />
          </td>

          <!-- Check-out (95px, zero clipping, auto-updates invoice date) -->
          <td style="width: 95px; padding: 4px 2px;">
            <input type="text" class="inline-input cell-checkout" data-index="${idx}" value="${it.checkout}" style="text-align: center; cursor: pointer; font-size: 11px; padding: 2px 0; width: 100%; letter-spacing: -0.2px;" title="Click to select Check-in & Check-out dates on calendar" readonly />
          </td>

          <!-- Qty (36px) -->
          <td style="width: 36px; text-align: center; padding: 4px 1px;">
            <input type="number" min="1" class="inline-input cell-qty" data-index="${idx}" value="${it.qty || 1}" style="text-align: center; padding: 2px 0; width: 100%;" />
          </td>

          <!-- Cash (65px, reduced width, right-aligned, spinners removed) -->
          <td style="width: 65px; text-align: right; padding: 4px 2px;">
            <input type="number" step="0.01" min="0" class="inline-input cell-cash bold" data-index="${idx}" value="${it.cash !== undefined ? it.cash : 0}" style="text-align: right; font-size: 11.5px; padding: 2px 2px; width: 100%;" placeholder="0" />
          </td>

          <!-- Online (65px, reduced width, right-aligned, spinners removed) -->
          <td style="width: 65px; text-align: right; padding: 4px 2px;">
            <input type="number" step="0.01" min="0" class="inline-input cell-online bold" data-index="${idx}" value="${it.online !== undefined ? it.online : 0}" style="text-align: right; font-size: 11.5px; padding: 2px 2px; width: 100%;" placeholder="0" />
          </td>

          <!-- Row Total (105px, fits on ONE line) -->
          <td class="cell-row-total" style="width: 105px; text-align: right; font-weight: 700; color: #111; padding: 4px 4px; white-space: nowrap; font-size: 11.5px;">
            ₹ ${Utils.formatCurrency(rowTotal)}
          </td>

          <!-- Delete Row Button -->
          <td style="width: 26px; text-align: center; padding: 2px;">
            <button type="button" class="row-delete-btn" data-index="${idx}" title="Delete row" ${this.items.length === 1 ? 'style="display:none;"' : ''}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  },

  updateRowTotalCell(idx) {
    const it = this.items[idx];
    if (!it) return;
    const rowTotal = ((parseFloat(it.cash) || 0) + (parseFloat(it.online) || 0)) * (parseInt(it.qty) || 1);
    const rowEl = document.querySelector(`tr.data-row[data-index="${idx}"]`);
    if (rowEl) {
      const totalTd = rowEl.querySelector('.cell-row-total');
      if (totalTd) {
        totalTd.textContent = `₹ ${Utils.formatCurrency(rowTotal)}`;
      }
    }
  },

  addRow() {
    const lastRow = this.items[this.items.length - 1];
    const checkin = lastRow ? lastRow.checkin : Utils.getTodayDMY();
    const checkout = lastRow ? lastRow.checkout : Utils.getTodayDMY();
    const presets = this.getRoomPresets();
    const defaultDesc = presets[0] || 'A/C DELUXE ROOM';

    // Checkout date always reflects invoice date
    document.getElementById('inp-invoice-date').value = checkout;

    this.items.push({
      description: defaultDesc,
      checkin: checkin,
      checkout: checkout,
      qty: 1,
      cash: 2350.00,
      online: 0.00,
      amount: 2350.00
    });

    this.renderTableRows();
    this.recalculate();

    const inputs = document.querySelectorAll('.cell-desc');
    if (inputs.length > 0) {
      inputs[inputs.length - 1].focus();
      inputs[inputs.length - 1].select();
    }
  },

  deleteRow(index) {
    if (this.items.length <= 1) return;
    this.items.splice(index, 1);
    this.renderTableRows();
    this.recalculate();
  },

  recalculate() {
    let subtotal = 0;
    let totalCash = 0;
    let totalOnline = 0;

    this.items.forEach(it => {
      const q = parseInt(it.qty, 10) || 1;
      const c = parseFloat(it.cash) || 0;
      const o = parseFloat(it.online) || 0;
      const rowAmt = (c + o) * q;
      it.amount = rowAmt;

      totalCash += (c * q);
      totalOnline += (o * q);
      subtotal += rowAmt;
    });

    subtotal = Math.round(subtotal * 100) / 100;
    totalCash = Math.round(totalCash * 100) / 100;
    totalOnline = Math.round(totalOnline * 100) / 100;

    const cgstRate = parseFloat(this.settings ? this.settings.cgst_rate : 2.5) || 2.5;
    const sgstRate = parseFloat(this.settings ? this.settings.sgst_rate : 2.5) || 2.5;

    const cgstAmt = Math.round(subtotal * (cgstRate / 100.0) * 100) / 100;
    const sgstAmt = Math.round(subtotal * (sgstRate / 100.0) * 100) / 100;
    const grandTotal = Math.round((subtotal + cgstAmt + sgstAmt) * 100) / 100;

    document.getElementById('val-subtotal').textContent = Utils.formatCurrency(subtotal);
    document.getElementById('val-cgst').textContent = Utils.formatCurrency(cgstAmt);
    document.getElementById('val-sgst').textContent = Utils.formatCurrency(sgstAmt);
    document.getElementById('val-grand-total').textContent = `₹ ${Utils.formatCurrency(grandTotal)}`;
    document.getElementById('val-words').textContent = Utils.numberToWords(grandTotal);
    document.getElementById('val-cash-online-summary').textContent = `Cash Total: ₹ ${Utils.formatCurrency(totalCash)}  |  Online Total: ₹ ${Utils.formatCurrency(totalOnline)}`;

    this.currentTotals = { subtotal, totalCash, totalOnline, cgstRate, cgstAmt, sgstRate, sgstAmt, grandTotal };
  },

  bindEvents() {
    // Action bar buttons
    document.getElementById('btn-new-bill').addEventListener('click', () => {
      this.resetToNewInvoice();
      this.showToast('New bill created');
    });

    document.getElementById('btn-save-bill').addEventListener('click', () => {
      this.saveInvoice();
    });

    document.getElementById('btn-download-pdf').addEventListener('click', () => {
      this.downloadPdf();
    });

    document.getElementById('btn-print').addEventListener('click', () => {
      this.printInvoice();
    });

    // Delete current bill button
    document.getElementById('btn-delete-bill').addEventListener('click', () => {
      if (this.currentInvoiceId && window.SidebarArchive) {
        window.SidebarArchive.deleteBill(
          this.currentInvoiceId,
          document.getElementById('inp-invoice-number').value
        );
      }
    });

    // Add row button
    document.getElementById('btn-add-row').addEventListener('click', () => {
      this.addRow();
    });

    // Table delegated input events
    const tbody = document.getElementById('excel-table-body');

    tbody.addEventListener('input', (e) => {
      const idx = parseInt(e.target.dataset.index, 10);
      if (isNaN(idx) || !this.items[idx]) return;

      if (e.target.classList.contains('cell-desc')) {
        this.items[idx].description = e.target.value;
      } else if (e.target.classList.contains('cell-checkin')) {
        this.items[idx].checkin = e.target.value;
      } else if (e.target.classList.contains('cell-checkout')) {
        this.items[idx].checkout = e.target.value;
        // Automatic reflection: Checkout date updates invoice date
        document.getElementById('inp-invoice-date').value = e.target.value;
      } else if (e.target.classList.contains('cell-qty')) {
        this.items[idx].qty = parseInt(e.target.value, 10) || 1;
        this.updateRowTotalCell(idx);
        this.recalculate();
      } else if (e.target.classList.contains('cell-cash')) {
        this.items[idx].cash = parseFloat(e.target.value) || 0;
        this.updateRowTotalCell(idx);
        this.recalculate();
      } else if (e.target.classList.contains('cell-online')) {
        this.items[idx].online = parseFloat(e.target.value) || 0;
        this.updateRowTotalCell(idx);
        this.recalculate();
      }
    });

    // Table delegated click events (Dropdown menu, Calendar opener, Delete button)
    tbody.addEventListener('click', (e) => {
      // 1. Room Preset dropdown button
      const dropBtn = e.target.closest('.btn-room-dropdown');
      if (dropBtn) {
        const idx = parseInt(dropBtn.dataset.index, 10);
        const menu = document.getElementById(`room-menu-${idx}`);
        // Close other menus first
        document.querySelectorAll('.room-options-menu').forEach(m => {
          if (m !== menu) m.classList.remove('open');
        });
        if (menu) menu.classList.toggle('open');
        e.stopPropagation();
        return;
      }

      // 2. Room Preset item selection
      const itemEl = e.target.closest('.room-option-item');
      if (itemEl) {
        const idx = parseInt(itemEl.dataset.index, 10);
        const val = itemEl.dataset.val;
        if (this.items[idx]) {
          this.items[idx].description = val;
          const rowEl = document.querySelector(`tr.data-row[data-index="${idx}"]`);
          if (rowEl) {
            const descInp = rowEl.querySelector('.cell-desc');
            if (descInp) descInp.value = val;
          }
        }
        itemEl.closest('.room-options-menu').classList.remove('open');
        e.stopPropagation();
        return;
      }

      // 3. Date picker trigger on Check-in or Check-out cells
      if (e.target.classList.contains('cell-checkin') || e.target.classList.contains('cell-checkout')) {
        const idx = parseInt(e.target.dataset.index, 10);
        this.datePicker.open(idx, e.target);
        e.stopPropagation();
        return;
      }

      // 4. Delete row button
      const delBtn = e.target.closest('.row-delete-btn');
      if (delBtn) {
        const idx = parseInt(delBtn.dataset.index, 10);
        this.deleteRow(idx);
        e.stopPropagation();
        return;
      }
    });

    // Keydown navigation: Auto add row on Enter / Tab in last online cell
    tbody.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === 'Tab') && !e.shiftKey) {
        if (e.target.classList.contains('cell-online')) {
          const idx = parseInt(e.target.dataset.index, 10);
          if (idx === this.items.length - 1) {
            e.preventDefault();
            this.addRow();
          }
        }
      }
    });

    // Global click listener to close popovers and dropdowns
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.room-desc-wrapper')) {
        document.querySelectorAll('.room-options-menu').forEach(m => m.classList.remove('open'));
      }
      if (!e.target.closest('#date-range-popover') && !e.target.classList.contains('cell-checkin') && !e.target.classList.contains('cell-checkout')) {
        this.datePicker.close();
      }
    });

    // Hotkeys: Ctrl+S (Save), Ctrl+P (Print), Ctrl+N (New)
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        this.saveInvoice();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        this.printInvoice();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        this.resetToNewInvoice();
      }
    });
  },

  bindDatePickerEvents() {
    document.getElementById('cal-prev-month').addEventListener('click', (e) => {
      e.stopPropagation();
      this.datePicker.prevMonth();
    });

    document.getElementById('cal-next-month').addEventListener('click', (e) => {
      e.stopPropagation();
      this.datePicker.nextMonth();
    });

    document.getElementById('cal-cancel-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      this.datePicker.close();
    });

    document.getElementById('cal-days-grid').addEventListener('click', (e) => {
      const cell = e.target.closest('.popover-day-cell');
      if (cell && cell.dataset.date) {
        e.stopPropagation();
        this.datePicker.onDateClick(cell.dataset.date);
      }
    });
  },

  bindEditFormatModal() {
    const modal = document.getElementById('modal-edit-format');
    document.getElementById('btn-open-edit-format').addEventListener('click', () => {
      const s = this.settings || {};
      document.getElementById('fmt-hotel-name').value = s.hotel_name || '';
      document.getElementById('fmt-address').value = s.address || '';
      document.getElementById('fmt-gstin').value = s.gstin || '';
      document.getElementById('fmt-phone').value = s.phone || '';
      document.getElementById('fmt-email').value = s.email || '';
      document.getElementById('fmt-website').value = s.website || '';
      document.getElementById('fmt-cgst-rate').value = s.cgst_rate || 2.5;
      document.getElementById('fmt-sgst-rate').value = s.sgst_rate || 2.5;
      document.getElementById('fmt-prefix').value = s.invoice_prefix || 'INV-';
      document.getElementById('fmt-presets').value = (s.room_presets || []).join('\n');
      document.getElementById('fmt-terms').value = s.terms_default || 'Due on Receipt';
      document.getElementById('fmt-signatory').value = s.signatory_title || 'Authorized Signatory';
      document.getElementById('fmt-notes').value = s.notes_default || 'Thanks for your business.';

      modal.classList.add('open');
    });

    const closeModal = () => modal.classList.remove('open');
    document.getElementById('btn-close-edit-format').addEventListener('click', closeModal);
    document.getElementById('btn-cancel-edit-format').addEventListener('click', closeModal);

    document.getElementById('btn-save-edit-format').addEventListener('click', async () => {
      const presets = document.getElementById('fmt-presets').value
        .split('\n')
        .map(l => l.trim())
        .filter(Boolean);

      const payload = {
        hotel_name: document.getElementById('fmt-hotel-name').value.trim(),
        address: document.getElementById('fmt-address').value.trim(),
        gstin: document.getElementById('fmt-gstin').value.trim(),
        phone: document.getElementById('fmt-phone').value.trim(),
        email: document.getElementById('fmt-email').value.trim(),
        website: document.getElementById('fmt-website').value.trim(),
        cgst_rate: parseFloat(document.getElementById('fmt-cgst-rate').value) || 2.5,
        sgst_rate: parseFloat(document.getElementById('fmt-sgst-rate').value) || 2.5,
        invoice_prefix: document.getElementById('fmt-prefix').value.trim(),
        room_presets: presets,
        terms_default: document.getElementById('fmt-terms').value.trim(),
        signatory_title: document.getElementById('fmt-signatory').value.trim(),
        notes_default: document.getElementById('fmt-notes').value.trim()
      };

      try {
        if (window.AppDB) {
          this.settings = await window.AppDB.updateSettings(payload);
        } else {
          const res = await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          const data = await res.json();
          if (data.success) this.settings = data.data;
        }
        this.renderHotelHeader();
        this.renderTableRows();
        this.recalculate();
        closeModal();
        this.showToast('Format & section settings updated!');
      } catch (e) {
        console.error(e);
        alert('Failed to save format settings');
      }
    });
  },

  async getPayload() {
    return {
      invoice_number: document.getElementById('inp-invoice-number').value.trim(),
      invoice_date: document.getElementById('inp-invoice-date').value,
      place_of_supply: document.getElementById('inp-place-of-supply').value.trim(),
      customer_name: document.getElementById('inp-customer-name').value.trim() || 'Valued Guest',
      customer_address: document.getElementById('inp-customer-address').value.trim(),
      customer_pincode: document.getElementById('inp-customer-pincode').value.trim(),
      customer_gstin: document.getElementById('inp-customer-gstin').value.trim(),
      cgst_rate: this.settings ? this.settings.cgst_rate : 2.5,
      sgst_rate: this.settings ? this.settings.sgst_rate : 2.5,
      notes: document.getElementById('inp-notes').value.trim(),
      items: this.items
    };
  },

  async saveInvoice() {
    const payload = await this.getPayload();
    try {
      if (window.AppDB) {
        const saved = await window.AppDB.saveInvoice(payload, this.currentInvoiceId);
        if (saved) {
          this.currentInvoiceId = saved.id;
          const deleteBtn = document.getElementById('btn-delete-bill');
          if (deleteBtn) deleteBtn.style.display = 'inline-flex';
          document.getElementById('inp-invoice-number').value = saved.invoice_number;
          this.showToast(`Bill #${saved.invoice_number} saved to Supabase!`);
          if (window.SidebarArchive) {
            window.SidebarArchive.loadRecentReceipts();
            window.SidebarArchive.loadArchiveTree();
          }
          return saved;
        }
      } else {
        let res;
        if (this.currentInvoiceId) {
          res = await fetch(`/api/invoices/${this.currentInvoiceId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
        } else {
          res = await fetch('/api/invoices', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
        }
        const data = await res.json();
        if (data.success && data.data) {
          this.currentInvoiceId = data.data.id;
          const deleteBtn = document.getElementById('btn-delete-bill');
          if (deleteBtn) deleteBtn.style.display = 'inline-flex';
          document.getElementById('inp-invoice-number').value = data.data.invoice_number;
          this.showToast(`Bill #${data.data.invoice_number} saved!`);
          if (window.SidebarArchive) {
            window.SidebarArchive.loadRecentReceipts();
          }
          return data.data;
        }
      }
      this.showToast('Failed to save invoice', 'error');
      return null;
    } catch (e) {
      console.error('Save error:', e);
      this.showToast('Error saving: ' + e.message, 'error');
      return null;
    }
  },

  async downloadPdf() {
    let inv = await this.saveInvoice();
    const invNum = document.getElementById('inp-invoice-number').value.trim() || 'INV';
    const sheet = document.getElementById('invoice-sheet');
    this.showToast('Preparing clean A4 PDF...');

    if (window.html2pdf) {
      const opt = {
        margin: [4, 4, 4, 4],
        filename: `Nayak_Sujay_${invNum}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      try {
        await html2pdf().set(opt).from(sheet).save();
        this.showToast(`Downloaded Nayak_Sujay_${invNum}.pdf`);
      } catch (err) {
        console.error('html2pdf error:', err);
        window.print();
      }
    } else {
      window.print();
    }
  },

  async printInvoice() {
    await this.saveInvoice();
    window.print();
  },

  loadInvoiceIntoSheet(inv) {
    this.currentInvoiceId = inv.id;
    const deleteBtn = document.getElementById('btn-delete-bill');
    if (deleteBtn) deleteBtn.style.display = 'inline-flex';

    const invDateDMY = Utils.isoToDMY(inv.invoice_date);

    document.getElementById('inp-invoice-number').value = inv.invoice_number;
    document.getElementById('inp-invoice-date').value = invDateDMY;
    document.getElementById('inp-place-of-supply').value = inv.place_of_supply || 'Karnataka (29)';
    document.getElementById('inp-customer-name').value = inv.customer_name || '';
    document.getElementById('inp-customer-address').value = inv.customer_address || '';
    document.getElementById('inp-customer-pincode').value = inv.customer_pincode || '';
    document.getElementById('inp-customer-gstin').value = inv.customer_gstin || '';
    document.getElementById('inp-notes').value = inv.notes || 'Thanks for your business.';

    this.items = (inv.items && inv.items.length > 0) ? inv.items.map(it => {
      const cin = Utils.isoToDMY(it.checkin || inv.invoice_date);
      const cout = Utils.isoToDMY(it.checkout || inv.invoice_date);
      return {
        description: it.description || 'A/C DELUXE ROOM',
        checkin: cin,
        checkout: cout,
        qty: it.qty || 1,
        cash: it.cash !== undefined ? it.cash : (it.amount || 0),
        online: it.online !== undefined ? it.online : 0,
        amount: it.amount || 0
      };
    }) : [{
      description: 'A/C DELUXE ROOM',
      checkin: invDateDMY,
      checkout: invDateDMY,
      qty: 1,
      cash: inv.subtotal,
      online: 0,
      amount: inv.subtotal
    }];

    // Last row's checkout reflects invoice date
    if (this.items.length > 0) {
      document.getElementById('inp-invoice-date').value = this.items[this.items.length - 1].checkout;
    }

    this.renderTableRows();
    this.recalculate();
    this.showToast(`Loaded Bill ${inv.invoice_number}`);
  },

  showToast(msg) {
    const toast = document.getElementById('toast-msg');
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 2500);
  }
};

window.InvoiceEditor = InvoiceEditor;

document.addEventListener('DOMContentLoaded', () => {
  InvoiceEditor.init();
});
