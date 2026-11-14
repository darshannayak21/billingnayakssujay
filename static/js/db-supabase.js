/**
 * Supabase Cloud PostgreSQL Adapter for Nayak's Sujay
 * Completely replaces SQLite & Python backend with high-capacity cloud database.
 * Project: https://hqknarferevbofipxucu.supabase.co
 */

const SUPABASE_URL = 'https://hqknarferevbofipxucu.supabase.co';
const SUPABASE_KEY = 'sb_publishable_jxaSNbOH4iJoWsBIOj1Cbw_zyhlOqUA';

const AppDB = {
  headers: {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  },

  async query(endpoint, options = {}) {
    const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
    const opts = {
      headers: { ...this.headers, ...(options.headers || {}) },
      method: options.method || 'GET',
      ...options
    };
    const res = await fetch(url, opts);
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Supabase error (${res.status}): ${errText}`);
    }
    if (res.status === 204) return null;
    return await res.json();
  },

  async getSettings() {
    try {
      const data = await this.query('settings?id=eq.1&select=*');
      if (data && data.length > 0) {
        const s = data[0];
        let presets = [];
        if (typeof s.room_presets === 'string') {
          presets = s.room_presets.split('\n').map(p => p.trim()).filter(Boolean);
        } else if (Array.isArray(s.room_presets)) {
          presets = s.room_presets;
        }
        return {
          hotel_name: s.hotel_name || "NAYAK'S SUJAY",
          tagline: s.tagline || 'EXPERIENCE THE DIVINE COMFORT',
          address: s.address || 'Murdeshwar, Karnataka 581350, India',
          phone: s.phone || '9164767677',
          email: s.email || 'nayakssujay.mdr@gmail.com',
          website: s.website || 'www.nayakssujay.com',
          gstin: s.gstin || '29AAXFN9443K1Z6',
          place_of_supply: s.state || 'Karnataka (29)',
          cgst_rate: parseFloat(s.default_cgst_rate) || 2.5,
          sgst_rate: parseFloat(s.default_sgst_rate) || 2.5,
          invoice_prefix: s.bill_prefix || 'INV-',
          room_presets: presets,
          terms_default: s.default_terms || 'Due on Receipt',
          notes_default: s.default_notes || 'Thanks for your business.',
          signatory_title: s.signatory_label || 'Authorized Signature'
        };
      }
    } catch (e) {
      console.warn('Using default fallback settings:', e);
    }
    return {
      hotel_name: "NAYAK'S SUJAY",
      tagline: 'EXPERIENCE THE DIVINE COMFORT',
      address: 'Murdeshwar, Karnataka 581350, India',
      phone: '9164767677',
      email: 'nayakssujay.mdr@gmail.com',
      website: 'www.nayakssujay.com',
      gstin: '29AAXFN9443K1Z6',
      place_of_supply: 'Karnataka (29)',
      cgst_rate: 2.5,
      sgst_rate: 2.5,
      invoice_prefix: 'INV-',
      room_presets: ["A/C DELUXE ROOM", "NON A/C DELUXE ROOM", "EXECUTIVE SUITE", "STANDARD ROOM"],
      terms_default: 'Due on Receipt',
      notes_default: 'Thanks for your business.',
      signatory_title: 'Authorized Signature'
    };
  },

  async updateSettings(settingsData) {
    const payload = {
      hotel_name: settingsData.hotel_name,
      tagline: settingsData.tagline,
      address: settingsData.address,
      phone: settingsData.phone,
      email: settingsData.email,
      website: settingsData.website,
      gstin: settingsData.gstin,
      state: settingsData.place_of_supply,
      default_cgst_rate: settingsData.cgst_rate,
      default_sgst_rate: settingsData.sgst_rate,
      bill_prefix: settingsData.invoice_prefix,
      room_presets: Array.isArray(settingsData.room_presets) ? settingsData.room_presets.join('\n') : settingsData.room_presets,
      default_terms: settingsData.terms_default,
      default_notes: settingsData.notes_default,
      signatory_label: settingsData.signatory_title,
      updated_at: new Date().toISOString()
    };
    await this.query('settings?id=eq.1', {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
    return await this.getSettings();
  },

  async getNextInvoiceNumber() {
    try {
      const data = await this.query('invoices?select=sequence_number&order=sequence_number.desc&limit=1');
      let nextSeq = 1;
      if (data && data.length > 0 && typeof data[0].sequence_number === 'number') {
        nextSeq = data[0].sequence_number + 1;
      }
      const settings = await this.getSettings();
      const prefix = settings.invoice_prefix || 'INV-';
      const padded = String(nextSeq).padStart(3, '0');
      return {
        sequence_number: nextSeq,
        invoice_number: `${prefix}${padded}`
      };
    } catch (e) {
      console.error('Error calculating next invoice number:', e);
      return { sequence_number: 1, invoice_number: 'INV-001' };
    }
  },

  async getRecentInvoices(searchQuery = '') {
    try {
      let endpoint = 'invoices?select=*&order=created_at.desc&limit=50';
      if (searchQuery && searchQuery.trim()) {
        let cleanQ = searchQuery.trim();
        // Normalize / to - for date searching (e.g. 14/11/2026 -> 14-11-2026)
        cleanQ = cleanQ.replace(/\//g, '-');
        const q = encodeURIComponent(`%${cleanQ}%`);
        endpoint = `invoices?select=*&or=(invoice_number.ilike.${q},bill_to_name.ilike.${q},invoice_date.ilike.${q},bill_to_address.ilike.${q},bill_to_gstin.ilike.${q},notes.ilike.${q})&order=created_at.desc&limit=100`;
      }
      const rows = await this.query(endpoint);
      return (rows || []).map(r => ({
        id: r.id,
        invoice_number: r.invoice_number,
        sequence_number: r.sequence_number,
        invoice_date: r.invoice_date,
        customer_name: r.bill_to_name,
        customer_address: r.bill_to_address,
        customer_gstin: r.bill_to_gstin,
        grand_total: parseFloat(r.total_amount) || 0,
        total_cash: parseFloat(r.cash_amount) || 0,
        total_online: parseFloat(r.online_amount) || 0,
        created_at: r.created_at
      }));
    } catch (e) {
      console.error('Error fetching recent invoices:', e);
      return [];
    }
  },

  async getInvoiceById(id) {
    try {
      const invRows = await this.query(`invoices?id=eq.${id}&select=*`);
      if (!invRows || invRows.length === 0) return null;
      const inv = invRows[0];

      const itemsRows = await this.query(`invoice_items?invoice_id=eq.${id}&select=*&order=item_index.asc`);

      return {
        id: inv.id,
        invoice_number: inv.invoice_number,
        sequence_number: inv.sequence_number,
        invoice_date: inv.invoice_date,
        place_of_supply: inv.place_of_supply,
        customer_name: inv.bill_to_name,
        customer_address: inv.bill_to_address,
        customer_gstin: inv.bill_to_gstin,
        subtotal: parseFloat(inv.subtotal) || 0,
        cgst_rate: parseFloat(inv.cgst_rate) || 2.5,
        cgst_amount: parseFloat(inv.cgst_amount) || 0,
        sgst_rate: parseFloat(inv.sgst_rate) || 2.5,
        sgst_amount: parseFloat(inv.sgst_amount) || 0,
        grand_total: parseFloat(inv.total_amount) || 0,
        total_cash: parseFloat(inv.cash_amount) || 0,
        total_online: parseFloat(inv.online_amount) || 0,
        total_in_words: inv.total_in_words,
        notes: inv.notes,
        terms: inv.terms,
        items: (itemsRows || []).map(it => ({
          room: it.room_category,
          checkin: it.check_in_date,
          checkout: it.check_out_date,
          qty: it.quantity,
          cash: parseFloat(it.cash_amount) || 0,
          online: parseFloat(it.online_amount) || 0,
          amount: parseFloat(it.total_amount) || 0
        }))
      };
    } catch (e) {
      console.error('Error fetching invoice by id:', e);
      return null;
    }
  },

  async saveInvoice(payload, existingId = null) {
    // 1. Calculate totals
    let subtotal = 0;
    let totalCash = 0;
    let totalOnline = 0;

    const items = (payload.items || []).map((it, idx) => {
      const cash = parseFloat(it.cash) || 0;
      const online = parseFloat(it.online) || 0;
      const amount = cash + online;
      const qty = parseInt(it.qty, 10) || 1;
      subtotal += amount;
      totalCash += cash;
      totalOnline += online;
      return {
        item_index: idx + 1,
        room_category: it.room || 'A/C DELUXE ROOM',
        check_in_date: it.checkin || '',
        check_out_date: it.checkout || '',
        quantity: qty,
        cash_amount: cash,
        online_amount: online,
        total_amount: amount
      };
    });

    const cgstRate = parseFloat(payload.cgst_rate) || 2.5;
    const sgstRate = parseFloat(payload.sgst_rate) || 2.5;
    const cgstAmount = Math.round(subtotal * (cgstRate / 100) * 100) / 100;
    const sgstAmount = Math.round(subtotal * (sgstRate / 100) * 100) / 100;
    const grandTotal = Math.round((subtotal + cgstAmount + sgstAmount) * 100) / 100;
    const totalInWords = Utils.numberToWords ? Utils.numberToWords(grandTotal) : (Utils.numberToWordsIndian ? Utils.numberToWordsIndian(grandTotal) : '');

    let seq = 1;
    const match = (payload.invoice_number || '').match(/\d+/);
    if (match) {
      seq = parseInt(match[0], 10);
    }

    const invoiceRecord = {
      invoice_number: payload.invoice_number,
      sequence_number: seq,
      invoice_date: payload.invoice_date,
      bill_to_name: payload.customer_name || 'Valued Guest',
      bill_to_address: payload.customer_address || '',
      bill_to_gstin: payload.customer_gstin || '',
      place_of_supply: payload.place_of_supply || 'Karnataka (29)',
      terms: payload.terms || 'Due on Receipt',
      notes: payload.notes || 'Thanks for your business.',
      subtotal: subtotal,
      cgst_rate: cgstRate,
      cgst_amount: cgstAmount,
      sgst_rate: sgstRate,
      sgst_amount: sgstAmount,
      total_amount: grandTotal,
      total_in_words: totalInWords,
      payment_mode: 'Both',
      cash_amount: totalCash,
      online_amount: totalOnline
    };

    let savedInvId = existingId;

    if (existingId) {
      // Update invoice
      await this.query(`invoices?id=eq.${existingId}`, {
        method: 'PATCH',
        body: JSON.stringify(invoiceRecord)
      });
      // Delete old items to reinsert fresh
      await this.query(`invoice_items?invoice_id=eq.${existingId}`, {
        method: 'DELETE'
      });
    } else {
      // Insert new invoice
      const res = await this.query('invoices', {
        method: 'POST',
        body: JSON.stringify(invoiceRecord)
      });
      if (res && res.length > 0) {
        savedInvId = res[0].id;
      }
    }

    // Insert items
    if (savedInvId && items.length > 0) {
      const itemsToInsert = items.map(it => ({
        ...it,
        invoice_id: savedInvId
      }));
      await this.query('invoice_items', {
        method: 'POST',
        body: JSON.stringify(itemsToInsert)
      });
    }

    return await this.getInvoiceById(savedInvId);
  },

  async deleteInvoice(id) {
    await this.query(`invoices?id=eq.${id}`, { method: 'DELETE' });
    return true;
  },

  async clearAllInvoices() {
    await this.query('invoice_items', { method: 'DELETE' });
    await this.query('invoices', { method: 'DELETE' });
    return true;
  },

  async getArchiveTree() {
    try {
      const rows = await this.query('invoices?select=id,invoice_number,sequence_number,invoice_date,bill_to_name,total_amount&order=sequence_number.desc&limit=1000');
      if (!rows) return {};

      const parseDateSafely = (dateStr) => {
        if (!dateStr) return null;
        const s = String(dateStr).trim();
        // Check DD-MM-YYYY
        if (/^\d{2}-\d{2}-\d{4}$/.test(s)) {
          const [d, m, y] = s.split('-').map(Number);
          return new Date(y, m - 1, d);
        }
        // Check YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
          const [y, m, d] = s.split('-').map(Number);
          return new Date(y, m - 1, d);
        }
        const d = new Date(s);
        return isNaN(d.getTime()) ? null : d;
      };

      const getFY = (d) => {
        if (!d) return '2026 (FY 2026-27)';
        const y = d.getFullYear();
        const m = d.getMonth() + 1; // 1-12
        const fyStr = m >= 4 ? `FY ${y}-${String(y + 1).slice(-2)}` : `FY ${y - 1}-${String(y).slice(-2)}`;
        return `${y} (${fyStr})`;
      };

      const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

      const tree = {};

      rows.forEach(r => {
        const dt = parseDateSafely(r.invoice_date);
        const fy = getFY(dt);
        const monthName = dt ? `${monthNames[dt.getMonth()]} ${dt.getFullYear()}` : 'Other';
        const monthKey = dt ? `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}` : '9999-99';
        const dayLabel = dt ? `${String(dt.getDate()).padStart(2, '0')} ${monthNames[dt.getMonth()]} ${dt.getFullYear()}` : (r.invoice_date || 'Unknown');
        const dayKey = dt ? `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}` : '9999-99-99';

        if (!tree[fy]) {
          tree[fy] = { name: fy, total_bills: 0, months: {} };
        }
        tree[fy].total_bills++;

        if (!tree[fy].months[monthName]) {
          tree[fy].months[monthName] = {
            name: monthName,
            month_key: monthKey,
            total_bills: 0,
            dates: {}
          };
        }
        tree[fy].months[monthName].total_bills++;

        if (!tree[fy].months[monthName].dates[dayLabel]) {
          tree[fy].months[monthName].dates[dayLabel] = {
            name: dayLabel,
            day_key: dayKey,
            total_bills: 0,
            bills: []
          };
        }
        tree[fy].months[monthName].dates[dayLabel].total_bills++;
        tree[fy].months[monthName].dates[dayLabel].bills.push({
          id: r.id,
          invoice_number: r.invoice_number,
          sequence_number: r.sequence_number,
          customer_name: r.bill_to_name,
          grand_total: parseFloat(r.total_amount) || 0
        });
      });

      return tree;
    } catch (e) {
      console.error('Error building archive tree from Supabase:', e);
      return {};
    }
  }
};

window.AppDB = AppDB;
