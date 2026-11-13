# Nayak's Sujay - Minimal Fast GST Billing Workspace

A minimalist, high-speed GST billing application built specifically for **Nayak's Sujay** (*"Experience the Divine Comfort"*). Designed for front-desk receptionists who need to issue thousands of bills rapidly with zero friction.

---

## What Makes This Fast & Simple

1. **The Invoice IS the Workspace (No Separate Forms)**
   - No Google Forms, no multi-step wizards, no switching between input screens and preview modals.
   - The central screen is the actual live A4 invoice receipt itself.
   - What you see on screen is exactly what gets printed.

2. **Direct Inline Editing**
   - Click customer name, type right away.
   - Click dates, pick dates right away.
   - Click room amount, type the rate right away.

3. **Excel-Style Room / Item Table**
   - Clean, fixed spreadsheet table:
     | # | Description / Room | Check-in | Check-out | Room Amount (₹) |
   - Type or select from instant room presets (`A/C DELUXE ROOM`, `NON A/C DELUXE ROOM`, `DOUBLE BEDROOM`, `FOUR BEDROOM`, `SUITE ROOM`).
   - Add extra rooms instantly with the subtle `+ Add Room / Item` button underneath or by pressing `Enter`/`Tab` in the last amount cell.
   - Instant delete row button on hover.

4. **Zero Payment Collection Clutter**
   - Strictly a **bill generation tool**.
   - No payment method dropdowns, no cash/online splits, no UPI references, no paid/unpaid statuses, no balance due calculations.
   - Just enter room charges and issue the bill.

5. **Instant Automatic GST Calculations**
   - Default: CGST 2.5% + SGST 2.5% (5% combined), customizable in Settings.
   - Automatically recalculates Subtotal, CGST, SGST, Grand Total, and Indian Currency Words in real time as amounts are typed.

6. **Instant Print & Dynamic PDF**
   - **Print Invoice (`Ctrl + P`):** Clean A4 print styling via browser native print.
   - **Download PDF:** Dynamically generates a vector A4 PDF using ReportLab with exact logo and branding matching your official invoice format.

7. **Sequential Invoice Numbers & Archive**
   - Automatically incrementing numbers: `INV-000001`, `INV-000002`...
   - Slide-out **Archive Drawer** organized by Year &rarr; Month &rarr; Day &rarr; Bills with instant search.
   - Slide-out **Settings Drawer** to adjust business details, GST rates, and room presets.

---

## Keyboard Shortcuts
- `Ctrl + N`: New Bill (clears for next customer with incremented invoice number)
- `Ctrl + S`: Save Bill to local SQLite database
- `Ctrl + P`: Print Bill immediately
- `Enter` / `Tab` on last amount cell: Automatically inserts another room row

---

## Running the Application
```powershell
cd d:\nayakgstapp
python run.py
```
Open **[http://127.0.0.1:5000/](http://127.0.0.1:5000/)** in your browser.
