/**
 * Settings & Invoice Designer Controller
 * Manages Hotel Profile, Interactive Invoice Template Designer, Billing Config,
 * Room Categories, Audit Trail, and Local SQLite Database Backup & Restore.
 */

const Settings = {
  container: null,
  settingsData: null,
  categoriesData: [],
  activeTab: 'profile', // profile, designer, billing, backup, audit

  init(containerEl) {
    this.container = containerEl;
    this.render();
  },

  async render() {
    try {
      const [setRes, catRes] = await Promise.all([
        API.getSettings(),
        API.getCategories(true)
      ]);
      this.settingsData = setRes.data;
      this.categoriesData = catRes.data;
    } catch (err) {
      console.error('Error fetching settings/categories:', err);
    }

    const tpl = this.settingsData.template_config || {};

    this.container.innerHTML = `
      <div class="section-header">
        <div>
          <h1>Settings & Configuration <span>&bull; Nayak's Sujay</span></h1>
          <p style="color: var(--text-3); font-size: 13px; margin-top: 4px;">Hotel profile, invoice template designer, tax configurations and database management</p>
        </div>
      </div>

      <!-- Settings Sub-Navigation Tabs -->
      <div style="display: flex; gap: 8px; margin-bottom: 24px; border-bottom: 1px solid var(--line); padding-bottom: 12px;">
        <button class="btn btn-secondary ${this.activeTab === 'profile' ? 'btn-tint' : ''}" onclick="Settings.switchTab('profile')">Hotel Profile</button>
        <button class="btn btn-secondary ${this.activeTab === 'designer' ? 'btn-tint' : ''}" onclick="Settings.switchTab('designer')">Invoice Designer & Preview</button>
        <button class="btn btn-secondary ${this.activeTab === 'billing' ? 'btn-tint' : ''}" onclick="Settings.switchTab('billing')">Billing & Room Categories</button>
        <button class="btn btn-secondary ${this.activeTab === 'backup' ? 'btn-tint' : ''}" onclick="Settings.switchTab('backup')">Database Backup & Restore</button>
        <button class="btn btn-secondary ${this.activeTab === 'audit' ? 'btn-tint' : ''}" onclick="Settings.switchTab('audit')">Audit Trail</button>
      </div>

      <div id="settings-tab-content">
        <!-- Tab contents dynamically rendered below -->
      </div>
    `;

    this.renderCurrentTab();
  },

  switchTab(tabName) {
    this.activeTab = tabName;
    this.render();
  },

  renderCurrentTab() {
    const content = document.getElementById('settings-tab-content');
    if (!content) return;

    if (this.activeTab === 'profile') {
      this.renderProfileTab(content);
    } else if (this.activeTab === 'designer') {
      this.renderDesignerTab(content);
    } else if (this.activeTab === 'billing') {
      this.renderBillingTab(content);
    } else if (this.activeTab === 'backup') {
      this.renderBackupTab(content);
    } else if (this.activeTab === 'audit') {
      this.renderAuditTab(content);
    }
  },

  // --- 1. Hotel Profile Tab ---
  renderProfileTab(container) {
    const s = this.settingsData;
    container.innerHTML = `
      <div class="card white" style="max-width: 850px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h3>Hotel Identity & Contact Details</h3>
          <button class="btn btn-primary" id="btn-save-profile">Save Profile Changes</button>
        </div>

        <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px solid var(--line);">
          <img src="/assets/logo.jpg" alt="Hotel Logo" style="height: 72px; width: auto; border-radius: 8px; border: 1px solid var(--line);" />
          <div>
            <span class="label">CURRENT HOTEL LOGO</span>
            <p style="font-size: 12px; color: var(--text-3);">Using official Nayak's Sujay brand logo without distortion</p>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="label">Hotel Name *</label>
            <input type="text" id="prof_name" value="${Utils.escapeHtml(s.hotel_name)}" required />
          </div>
          <div class="form-group">
            <label class="label">Tagline</label>
            <input type="text" id="prof_tagline" value="${Utils.escapeHtml(s.tagline)}" />
          </div>
        </div>

        <div class="form-group">
          <label class="label">Address *</label>
          <input type="text" id="prof_address" value="${Utils.escapeHtml(s.address)}" required />
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="label">Contact Phone(s) *</label>
            <input type="text" id="prof_phone" value="${Utils.escapeHtml(s.phone)}" required />
          </div>
          <div class="form-group">
            <label class="label">Official Email *</label>
            <input type="email" id="prof_email" value="${Utils.escapeHtml(s.email)}" required />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="label">Hotel GSTIN *</label>
            <input type="text" id="prof_gstin" value="${Utils.escapeHtml(s.gstin)}" maxlength="15" style="text-transform: uppercase;" required />
          </div>
          <div class="form-group">
            <label class="label">State & State Code</label>
            <div style="display: flex; gap: 10px;">
              <input type="text" id="prof_state" value="${Utils.escapeHtml(s.state)}" placeholder="State" />
              <input type="text" id="prof_state_code" value="${Utils.escapeHtml(s.state_code)}" placeholder="Code" style="width: 80px;" />
            </div>
          </div>
        </div>

        <h3 style="margin-top: 28px; margin-bottom: 16px; padding-top: 16px; border-top: 1px solid var(--line);">Bank & UPI Settlement Details</h3>
        
        <div class="form-row">
          <div class="form-group">
            <label class="label">Bank Name & Branch</label>
            <input type="text" id="prof_bank" value="${Utils.escapeHtml(s.bank_name)}" />
          </div>
          <div class="form-group">
            <label class="label">Bank Account Number</label>
            <input type="text" id="prof_account" value="${Utils.escapeHtml(s.account_number)}" />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="label">IFSC Code</label>
            <input type="text" id="prof_ifsc" value="${Utils.escapeHtml(s.ifsc_code)}" style="text-transform: uppercase;" />
          </div>
          <div class="form-group">
            <label class="label">UPI ID for Digital Payments</label>
            <input type="text" id="prof_upi" value="${Utils.escapeHtml(s.upi_id)}" placeholder="e.g. hotel@upi" />
          </div>
        </div>
      </div>
    `;

    document.getElementById('btn-save-profile').addEventListener('click', async () => {
      const payload = {
        hotel_name: document.getElementById('prof_name').value.trim(),
        tagline: document.getElementById('prof_tagline').value.trim(),
        address: document.getElementById('prof_address').value.trim(),
        phone: document.getElementById('prof_phone').value.trim(),
        email: document.getElementById('prof_email').value.trim(),
        gstin: document.getElementById('prof_gstin').value.trim(),
        state: document.getElementById('prof_state').value.trim(),
        state_code: document.getElementById('prof_state_code').value.trim(),
        bank_name: document.getElementById('prof_bank').value.trim(),
        account_number: document.getElementById('prof_account').value.trim(),
        ifsc_code: document.getElementById('prof_ifsc').value.trim(),
        upi_id: document.getElementById('prof_upi').value.trim(),
      };

      try {
        const res = await API.updateSettings(payload);
        if (res.success) {
          this.settingsData = res.data;
          App.showToast('Hotel profile saved successfully!', 'success');
        } else {
          App.showToast(res.error || 'Failed to update profile', 'error');
        }
      } catch (e) {
        App.showToast('Error saving profile', 'error');
      }
    });
  },

  // --- 2. Invoice Template Designer Tab ---
  renderDesignerTab(container) {
    const tpl = this.settingsData.template_config || {};

    container.innerHTML = `
      <div style="display: grid; grid-template-columns: 380px 1fr; gap: 24px; align-items: start;">
        <!-- Controls Column -->
        <div class="card white">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <h3>Template Designer</h3>
            <button class="btn btn-primary btn-sm" id="btn-save-designer">Save Template</button>
          </div>

          <p style="font-size: 12px; color: var(--text-3); margin-bottom: 16px;">
            Customise invoice fields, terms, and branding. Changes apply immediately to new bills.
          </p>

          <div class="form-group">
            <span class="label">FIELD VISIBILITY TOGGLES</span>
            <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 8px;">
              <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; cursor: pointer;">
                <input type="checkbox" id="des_show_logo" ${tpl.show_logo !== false ? 'checked' : ''} style="width: 16px; height: 16px; accent-color: var(--accent);" />
                Show Hotel Logo
              </label>
              <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; cursor: pointer;">
                <input type="checkbox" id="des_show_aadhaar" ${tpl.show_aadhaar !== false ? 'checked' : ''} style="width: 16px; height: 16px; accent-color: var(--accent);" />
                Show Customer Aadhaar / ID
              </label>
              <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; cursor: pointer;">
                <input type="checkbox" id="des_show_pan" ${tpl.show_pan !== false ? 'checked' : ''} style="width: 16px; height: 16px; accent-color: var(--accent);" />
                Show Customer PAN Number
              </label>
              <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; cursor: pointer;">
                <input type="checkbox" id="des_show_gstin" ${tpl.show_gstin !== false ? 'checked' : ''} style="width: 16px; height: 16px; accent-color: var(--accent);" />
                Show Customer GSTIN
              </label>
              <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; cursor: pointer;">
                <input type="checkbox" id="des_show_hsn" ${tpl.show_hsn !== false ? 'checked' : ''} style="width: 16px; height: 16px; accent-color: var(--accent);" />
                Show HSN/SAC Column
              </label>
              <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; cursor: pointer;">
                <input type="checkbox" id="des_show_stay_time" ${tpl.show_stay_time !== false ? 'checked' : ''} style="width: 16px; height: 16px; accent-color: var(--accent);" />
                Show Check-In / Check-Out Times
              </label>
              <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; cursor: pointer;">
                <input type="checkbox" id="des_show_bank" ${tpl.show_bank_details !== false ? 'checked' : ''} style="width: 16px; height: 16px; accent-color: var(--accent);" />
                Show Bank & Settlement Details
              </label>
            </div>
          </div>

          <div class="divider"></div>

          <div class="form-group">
            <label class="label">Terms & Conditions</label>
            <textarea id="des_terms" rows="4">${Utils.escapeHtml(tpl.terms || '')}</textarea>
          </div>

          <div class="form-group">
            <label class="label">Signatory Stamp Title</label>
            <input type="text" id="des_signatory" value="${Utils.escapeHtml(tpl.signatory_title || "For NAYAK'S SUJAY\\nAuthorized Signatory")}" />
          </div>

          <div class="form-group">
            <label class="label">Footer Note / Message</label>
            <input type="text" id="des_footer" value="${Utils.escapeHtml(tpl.footer_note || 'Thank you for choosing Nayak\'s Sujay!')}" />
          </div>
        </div>

        <!-- Live Preview Column -->
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <span class="label">INTERACTIVE A4 INVOICE PREVIEW</span>
            <span class="pill pill-sm">REAL-TIME</span>
          </div>

          <div id="designer-live-sheet" class="a4-preview-sheet">
            <!-- Dynamically rendered sample invoice sheet -->
          </div>
        </div>
      </div>
    `;

    const updateLivePreview = () => {
      const showLogo = document.getElementById('des_show_logo').checked;
      const showAadhaar = document.getElementById('des_show_aadhaar').checked;
      const showPan = document.getElementById('des_show_pan').checked;
      const showGstin = document.getElementById('des_show_gstin').checked;
      const showStayTime = document.getElementById('des_show_stay_time').checked;
      const showBank = document.getElementById('des_show_bank').checked;
      const terms = document.getElementById('des_terms').value;
      const signatory = document.getElementById('des_signatory').value;
      const footer = document.getElementById('des_footer').value;

      const s = this.settingsData;

      document.getElementById('designer-live-sheet').innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 16px; border-bottom: 1.5px solid var(--accent);">
          <div style="display: flex; gap: 14px; align-items: center;">
            ${showLogo ? `<img src="/assets/logo.jpg" alt="Logo" style="height: 52px; width: auto; border-radius: 4px;" />` : ''}
            <div>
              <h2 style="color: var(--accent); font-size: 17px; margin: 0;">${Utils.escapeHtml(s.hotel_name)}</h2>
              <p style="font-size: 9px; font-weight: 600; color: var(--text-4); text-transform: uppercase;">${Utils.escapeHtml(s.tagline)}</p>
              <p style="font-size: 10px; color: var(--text-3); margin-top: 2px;">${Utils.escapeHtml(s.address)}</p>
              <p style="font-size: 10px; color: var(--text-3);">Phone: ${Utils.escapeHtml(s.phone)} | Email: ${Utils.escapeHtml(s.email)}</p>
              <p style="font-size: 10px; font-weight: 600;">GSTIN: ${Utils.escapeHtml(s.gstin)} | State: ${Utils.escapeHtml(s.state)} (${s.state_code})</p>
            </div>
          </div>
          <div style="text-align: right;">
            <h1 style="font-size: 18px; margin: 0;">TAX INVOICE</h1>
            <p style="font-size: 11px; font-weight: 600; margin-top: 4px;">Bill #: 001</p>
            <p style="font-size: 11px; color: var(--text-3);">Date: ${Utils.formatDateDisplay(Utils.getTodayDateString())}</p>
            <span class="status-badge status-paid" style="margin-top: 4px;">PAID</span>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 16px 0;">
          <div style="background: var(--card); padding: 12px; border-radius: 8px;">
            <span class="label" style="color: var(--accent);">BILLED TO</span>
            <p style="font-size: 12px; font-weight: 600;">Dr. Rajesh Kamath</p>
            <p style="font-size: 11px; color: var(--text-3);">+91 98451 12233 | Mangalore, Karnataka</p>
            ${showGstin ? `<p style="font-size: 10px; color: var(--text-2);"><strong>GSTIN:</strong> 29ABCDE1234F1Z5</p>` : ''}
            ${showAadhaar ? `<p style="font-size: 10px; color: var(--text-2);"><strong>Aadhaar:</strong> 9876 5432 1098</p>` : ''}
            ${showPan ? `<p style="font-size: 10px; color: var(--text-2);"><strong>PAN:</strong> ABCDE1234F</p>` : ''}
          </div>
          <div style="background: var(--card); padding: 12px; border-radius: 8px;">
            <span class="label" style="color: var(--accent);">STAY DETAILS</span>
            <p style="font-size: 11px;"><strong>Check-In:</strong> ${Utils.formatDateDisplay(Utils.getTodayDateString())} ${showStayTime ? '(12:00 PM)' : ''}</p>
            <p style="font-size: 11px;"><strong>Check-Out:</strong> ${Utils.formatDateDisplay(Utils.getTodayDateString())} ${showStayTime ? '(11:00 AM)' : ''}</p>
            <p style="font-size: 11px;"><strong>Duration:</strong> 1 Night(s)</p>
            <p style="font-size: 10px; color: var(--text-3);">Place of Supply: Karnataka (29)</p>
          </div>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 16px;">
          <thead>
            <tr style="background: var(--accent-tint); border-bottom: 1.5px solid var(--accent);">
              <th style="padding: 6px; text-align: left;">Room Category</th>
              <th style="padding: 6px; text-align: center;">Room</th>
              <th style="padding: 6px; text-align: center;">Qty</th>
              <th style="padding: 6px; text-align: right;">Rate</th>
              <th style="padding: 6px; text-align: right;">CGST (2.5%)</th>
              <th style="padding: 6px; text-align: right;">SGST (2.5%)</th>
              <th style="padding: 6px; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom: 1px solid var(--line);">
              <td style="padding: 8px 6px;"><strong>Deluxe Room with Balcony</strong></td>
              <td style="padding: 8px 6px; text-align: center; background: var(--accent-tint);">204</td>
              <td style="padding: 8px 6px; text-align: center;">1</td>
              <td style="padding: 8px 6px; text-align: right;">₹ 4,500.00</td>
              <td style="padding: 8px 6px; text-align: right;">₹ 112.50</td>
              <td style="padding: 8px 6px; text-align: right;">₹ 112.50</td>
              <td style="padding: 8px 6px; text-align: right; font-weight: 600;">₹ 4,725.00</td>
            </tr>
          </tbody>
        </table>

        <div style="display: grid; grid-template-columns: 1fr 220px; gap: 16px; margin-bottom: 16px;">
          <div style="background: var(--card); padding: 10px; border-radius: 8px; font-size: 10px;">
            <p><strong>Amount in Words:</strong> Indian Rupees Four Thousand Seven Hundred Twenty Five Only</p>
            <p style="margin-top: 4px;"><strong>Payment:</strong> Cash: ₹ 4,725.00 | Balance: ₹ 0.00</p>
            ${showBank ? `<p style="margin-top: 4px; color: var(--text-3);"><strong>Bank:</strong> ${s.bank_name} | A/C: ${s.account_number} | UPI: ${s.upi_id}</p>` : ''}
          </div>
          <div style="font-size: 11px;">
            <div style="display: flex; justify-content: space-between; padding: 3px 0;"><span>Subtotal:</span><span>₹ 4,500.00</span></div>
            <div style="display: flex; justify-content: space-between; padding: 3px 0;"><span>CGST (2.5%):</span><span>₹ 112.50</span></div>
            <div style="display: flex; justify-content: space-between; padding: 3px 0;"><span>SGST (2.5%):</span><span>₹ 112.50</span></div>
            <div style="display: flex; justify-content: space-between; padding: 6px 0; background: var(--accent-tint); font-weight: 700; border-top: 1.5px solid #111; margin-top: 4px;">
              <span>GRAND TOTAL:</span><span style="color: var(--accent);">₹ 4,725.00</span>
            </div>
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: flex-end; padding-top: 12px; border-top: 1px solid var(--line); font-size: 9px; color: var(--text-3);">
          <div style="max-width: 65%;">
            <strong>Terms & Conditions:</strong><br/>
            ${Utils.escapeHtml(terms).replace(/\n/g, '<br/>')}
          </div>
          <div style="border: 1px solid var(--line); padding: 8px 14px; text-align: center; border-radius: 6px; min-width: 140px;">
            <strong>${Utils.escapeHtml(signatory).replace(/\\n/g, '<br/>')}</strong>
          </div>
        </div>

        <p style="text-align: center; font-size: 9px; color: var(--text-4); margin-top: 14px; font-style: italic;">
          ${Utils.escapeHtml(footer)}
        </p>
      `;
    };

    // Attach listeners for live preview updates
    ['des_show_logo', 'des_show_aadhaar', 'des_show_pan', 'des_show_gstin', 'des_show_stay_time', 'des_show_bank'].forEach(id => {
      document.getElementById(id).addEventListener('change', updateLivePreview);
    });
    ['des_terms', 'des_signatory', 'des_footer'].forEach(id => {
      document.getElementById(id).addEventListener('input', updateLivePreview);
    });

    updateLivePreview();

    document.getElementById('btn-save-designer').addEventListener('click', async () => {
      const template_config = {
        show_logo: document.getElementById('des_show_logo').checked,
        show_aadhaar: document.getElementById('des_show_aadhaar').checked,
        show_pan: document.getElementById('des_show_pan').checked,
        show_gstin: document.getElementById('des_show_gstin').checked,
        show_hsn: document.getElementById('des_show_hsn').checked,
        show_stay_time: document.getElementById('des_show_stay_time').checked,
        show_bank_details: document.getElementById('des_show_bank').checked,
        terms: document.getElementById('des_terms').value.trim(),
        signatory_title: document.getElementById('des_signatory').value.trim(),
        footer_note: document.getElementById('des_footer').value.trim()
      };

      try {
        const res = await API.updateSettings({ template_config });
        if (res.success) {
          this.settingsData = res.data;
          App.showToast('Invoice template saved successfully!', 'success');
        } else {
          App.showToast(res.error || 'Failed to save template', 'error');
        }
      } catch (e) {
        App.showToast('Error saving template', 'error');
      }
    });
  },

  // --- 3. Billing & Room Categories Tab ---
  renderBillingTab(container) {
    const s = this.settingsData;

    container.innerHTML = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
        <!-- GST Tax & Bill Sequence Setup -->
        <div class="card white">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <h3>GST Rates & Numbering Sequence</h3>
            <button class="btn btn-primary btn-sm" id="btn-save-billing">Save Billing Config</button>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="label">CGST Rate (%)</label>
              <input type="number" id="bill_cgst" step="0.1" value="${s.cgst_rate}" />
            </div>
            <div class="form-group">
              <label class="label">SGST Rate (%)</label>
              <input type="number" id="bill_sgst" step="0.1" value="${s.sgst_rate}" />
            </div>
            <div class="form-group">
              <label class="label">IGST Rate (%)</label>
              <input type="number" id="bill_igst" step="0.1" value="${s.igst_rate}" />
            </div>
          </div>

          <div class="form-group">
            <label class="label">Default HSN / SAC Code for Accommodation</label>
            <input type="text" id="bill_hsn" value="${Utils.escapeHtml(s.default_hsn)}" />
          </div>

          <div class="divider"></div>

          <h3>Invoice Sequential Numbering</h3>
          <p style="font-size: 12px; color: var(--text-3); margin-top: 4px; margin-bottom: 14px;">
            Standard sequential format generates 001, 002, 003... without duplicates.
          </p>

          <div class="form-row">
            <div class="form-group">
              <label class="label">Invoice Prefix (Optional)</label>
              <input type="text" id="bill_prefix" value="${Utils.escapeHtml(s.invoice_prefix || '')}" placeholder="e.g. INV- or leave empty for 001" />
            </div>
            <div class="form-group">
              <label class="label">Active Financial Year</label>
              <input type="text" id="bill_fy" value="${Utils.escapeHtml(s.active_financial_year)}" placeholder="2026-27" />
            </div>
          </div>

          <div class="form-group">
            <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; cursor: pointer;">
              <input type="checkbox" id="bill_fy_prefix" ${s.fy_prefix_enabled ? 'checked' : ''} style="width: 16px; height: 16px; accent-color: var(--accent);" />
              Include Financial Year in Bill No (e.g. NS/2026-27/001)
            </label>
          </div>
        </div>

        <!-- Room Categories Manager -->
        <div class="card white">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <h3>Room Categories & Pricing</h3>
            <button class="btn btn-secondary btn-sm" id="btn-add-cat-modal">+ Add Category</button>
          </div>

          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Category Name</th>
                  <th style="text-align: right;">Default Rate</th>
                  <th style="text-align: center;">HSN</th>
                  <th style="text-align: right;">Actions</th>
                </tr>
              </thead>
              <tbody id="cats-tbody">
                ${this.categoriesData.map(c => `
                  <tr>
                    <td><strong>${Utils.escapeHtml(c.name)}</strong></td>
                    <td style="text-align: right; font-weight: 600;">₹ ${Number(c.default_rate).toFixed(2)}</td>
                    <td style="text-align: center;">${Utils.escapeHtml(c.default_hsn)}</td>
                    <td style="text-align: right;">
                      <button class="btn btn-secondary btn-sm" onclick="Settings.editCategory(${c.id}, '${Utils.escapeHtml(c.name)}', ${c.default_rate}, '${c.default_hsn}')">Edit</button>
                      <button class="btn btn-danger btn-sm" onclick="Settings.deleteCategory(${c.id})">Delete</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    document.getElementById('btn-save-billing').addEventListener('click', async () => {
      const payload = {
        cgst_rate: parseFloat(document.getElementById('bill_cgst').value) || 2.5,
        sgst_rate: parseFloat(document.getElementById('bill_sgst').value) || 2.5,
        igst_rate: parseFloat(document.getElementById('bill_igst').value) || 5.0,
        default_hsn: document.getElementById('bill_hsn').value.trim(),
        invoice_prefix: document.getElementById('bill_prefix').value.trim(),
        active_financial_year: document.getElementById('bill_fy').value.trim(),
        fy_prefix_enabled: document.getElementById('bill_fy_prefix').checked ? 1 : 0
      };

      try {
        const res = await API.updateSettings(payload);
        if (res.success) {
          this.settingsData = res.data;
          App.showToast('Billing configurations updated successfully!', 'success');
        }
      } catch (e) {
        App.showToast('Error saving billing configuration', 'error');
      }
    });

    document.getElementById('btn-add-cat-modal').addEventListener('click', () => {
      this.promptAddCategory();
    });
  },

  promptAddCategory() {
    const name = prompt('Enter Room Category Name (e.g. Executive Balcony Suite):');
    if (!name || !name.trim()) return;
    const rateStr = prompt('Enter Default Rate per day (₹):', '3000');
    const rate = parseFloat(rateStr) || 2000;
    const hsn = prompt('Enter HSN/SAC Code:', '996311') || '996311';

    API.addCategory({ name: name.trim(), default_rate: rate, default_hsn: hsn.trim() })
      .then(res => {
        if (res.success) {
          App.showToast('Room category added!', 'success');
          this.render();
        } else {
          App.showToast(res.error || 'Failed to add', 'error');
        }
      });
  },

  editCategory(id, currentName, currentRate, currentHsn) {
    const name = prompt('Edit Category Name:', currentName);
    if (!name || !name.trim()) return;
    const rateStr = prompt('Edit Default Rate (₹):', currentRate);
    const rate = parseFloat(rateStr) || currentRate;
    const hsn = prompt('Edit HSN/SAC Code:', currentHsn) || currentHsn;

    API.updateCategory(id, { name: name.trim(), default_rate: rate, default_hsn: hsn.trim() })
      .then(res => {
        if (res.success) {
          App.showToast('Category updated!', 'success');
          this.render();
        } else {
          App.showToast(res.error || 'Failed to update', 'error');
        }
      });
  },

  deleteCategory(id) {
    if (!confirm('Are you sure you want to remove this room category?')) return;
    API.deleteCategory(id).then(res => {
      if (res.success) {
        App.showToast('Category deleted', 'success');
        this.render();
      }
    });
  },

  // --- 4. Database Backup & Restore Tab ---
  renderBackupTab(container) {
    container.innerHTML = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; max-width: 900px;">
        <div class="card white">
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            <h3>Export Database Backup</h3>
          </div>
          <p style="font-size: 13px; color: var(--text-3); margin-bottom: 20px;">
            Download an exact snapshot of your SQLite database file (.db) or portable JSON format.
            No data is stored in the cloud.
          </p>
          <div style="display: flex; flex-direction: column; gap: 10px;">
            <a href="${API.getBackupDownloadUrl()}" class="btn btn-primary" download>
              Download Full SQLite Database (.db)
            </a>
            <a href="${API.getJsonExportUrl()}" class="btn btn-secondary" download>
              Export JSON Records Backup
            </a>
          </div>
        </div>

        <div class="card white">
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
            <h3>Restore Database</h3>
          </div>
          <p style="font-size: 13px; color: var(--text-3); margin-bottom: 20px;">
            Upload a previously backed-up SQLite (.db) file to restore all past invoices and configurations.
          </p>
          <input type="file" id="db-restore-file" accept=".db" style="margin-bottom: 16px; border: 1px dashed var(--line); padding: 12px; border-radius: 8px; width: 100%;" />
          <button class="btn btn-secondary" id="btn-do-restore" style="width: 100%;">
            Restore From File
          </button>
        </div>
      </div>
    `;

    document.getElementById('btn-do-restore').addEventListener('click', async () => {
      const fileInput = document.getElementById('db-restore-file');
      if (!fileInput.files || fileInput.files.length === 0) {
        App.showToast('Please select a .db backup file to restore', 'error');
        return;
      }

      if (!confirm('Warning: Restoring will merge/overwrite current database state with the backup file. Proceed?')) return;

      try {
        const res = await API.restoreDatabase(fileInput.files[0]);
        if (res.success) {
          App.showToast('Database restored successfully!', 'success');
          setTimeout(() => location.reload(), 1000);
        } else {
          App.showToast(res.error || 'Restore failed', 'error');
        }
      } catch (e) {
        App.showToast('Error during database restore', 'error');
      }
    });
  },

  // --- 5. Audit Trail Tab ---
  async renderAuditTab(container) {
    container.innerHTML = `
      <div class="card white">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <div>
            <h3>Audit Trail & Compliance Log</h3>
            <p style="font-size: 12px; color: var(--text-3); margin-top: 2px;">Immutable chronological activity log of all bill creations, edits, prints and cancellations</p>
          </div>
        </div>

        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 160px;">Timestamp</th>
                <th style="width: 130px;">Action</th>
                <th style="width: 100px;">Bill #</th>
                <th>Activity Description</th>
              </tr>
            </thead>
            <tbody id="audit-tbody">
              <tr><td colspan="4" style="text-align: center; color: var(--text-4); padding: 36px;">Loading audit logs...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    try {
      const res = await API.getAuditLogs();
      const tbody = document.getElementById('audit-tbody');
      if (res.success && res.data && res.data.length > 0) {
        tbody.innerHTML = res.data.map(log => `
          <tr>
            <td style="font-size: 12px; color: var(--text-3);">${log.timestamp ? new Date(log.timestamp).toLocaleString('en-IN') : '-'}</td>
            <td><span class="pill pill-sm" style="background: var(--text-2);">${Utils.escapeHtml(log.action)}</span></td>
            <td><strong>${Utils.escapeHtml(log.invoice_number || '-')}</strong></td>
            <td>${Utils.escapeHtml(log.description)}</td>
          </tr>
        `).join('');
      } else {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-4); padding: 36px;">No audit logs yet.</td></tr>`;
      }
    } catch (e) {
      console.error('Audit log fetch error:', e);
    }
  }
};

window.Settings = Settings;
