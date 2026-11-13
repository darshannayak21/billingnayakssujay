/**
 * Fast Indian Currency & Number-to-Words Formatter
 */

const Utils = {
  formatCurrency(num) {
    if (num === null || num === undefined || isNaN(num)) return '0.00';
    const val = Number(num);
    const parts = Math.abs(val).toFixed(2).split('.');
    let intPart = parts[0];
    const decPart = parts[1];

    let lastThree = intPart.substring(intPart.length - 3);
    const otherNumbers = intPart.substring(0, intPart.length - 3);
    if (otherNumbers !== '') {
      lastThree = ',' + lastThree;
    }
    const formattedInt = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;
    return `${val < 0 ? '-' : ''}${formattedInt}.${decPart}`;
  },

  numberToWords(amount) {
    const num = Math.round(Number(amount) * 100) / 100;
    if (isNaN(num) || num === 0) return 'Zero Rupees Only';

    const isNeg = num < 0;
    const absNum = Math.abs(num);
    const rupees = Math.floor(absNum);
    const paise = Math.round((absNum - rupees) * 100);

    const units = [
      '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
      'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
      'Seventeen', 'Eighteen', 'Nineteen'
    ];
    const tens = [
      '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
    ];

    function twoDigits(n) {
      if (n === 0) return '';
      if (n < 20) return units[n];
      const rem = n % 10;
      return tens[Math.floor(n / 10)] + (rem > 0 ? '-' + units[rem] : '');
    }

    function belowThousand(n) {
      let res = '';
      const h = Math.floor(n / 100);
      const rem = n % 100;
      if (h > 0) {
        res += units[h] + ' Hundred';
        if (rem > 0) res += ' ' + twoDigits(rem);
      } else {
        res += twoDigits(rem);
      }
      return res;
    }

    function convertRupees(n) {
      if (n === 0) return 'Zero';
      const crore = Math.floor(n / 10000000);
      let rem = n % 10000000;
      const lakh = Math.floor(rem / 100000);
      rem = rem % 100000;
      const thousand = Math.floor(rem / 1000);
      rem = rem % 1000;

      const parts = [];
      if (crore > 0) parts.push(twoDigits(crore) + ' Crore');
      if (lakh > 0) parts.push(twoDigits(lakh) + ' Lakh');
      if (thousand > 0) parts.push(twoDigits(thousand) + ' Thousand');
      if (rem > 0) parts.push(belowThousand(rem));

      return parts.join(' ').trim();
    }

    let result = (isNeg ? 'Minus ' : '') + 'Indian Rupee ' + convertRupees(rupees);
    if (paise > 0) {
      result += ' and ' + twoDigits(paise) + ' Paise';
    }
    result += ' Only';

    return result;
  },

  getTodayISO() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  },

  getTodayDMY() {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const y = d.getFullYear();
    return `${day}-${m}-${y}`;
  },

  isoToDMY(iso) {
    if (!iso) return '';
    const s = String(iso).trim();
    if (s.length === 10 && s[4] === '-' && s[7] === '-') {
      const parts = s.split('-');
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return s;
  },

  dmyToISO(dmy) {
    if (!dmy) return '';
    const s = String(dmy).trim();
    if (s.length === 10 && s[2] === '-' && s[5] === '-') {
      const parts = s.split('-');
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return s;
  },

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
};

window.Utils = Utils;
