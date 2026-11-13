"""
Database manager for Nayak's Sujay Minimal Fast GST Billing Platform.
Includes customer pincode, Qty, Cash & Online breakdown columns,
ascending invoice numbers, and hierarchical archive search without emojis.
"""

import sqlite3
import json
import os
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple

DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "nayak_billing.db"))

def get_current_fy(dt: Optional[datetime] = None) -> str:
    if dt is None:
        dt = datetime.now()
    year = dt.year
    if dt.month >= 4:
        return f"{year}-{str(year + 1)[-2:]}"
    else:
        return f"{year - 1}-{str(year)[-2:]}"

def get_db_connection() -> sqlite3.Connection:
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH, timeout=20.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    with get_db_connection() as conn:
        cursor = conn.cursor()

        # Settings Table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS settings (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            hotel_name TEXT NOT NULL,
            tagline TEXT NOT NULL,
            address TEXT NOT NULL,
            phone TEXT NOT NULL,
            email TEXT NOT NULL,
            website TEXT NOT NULL,
            gstin TEXT NOT NULL,
            place_of_supply TEXT NOT NULL,
            logo_path TEXT NOT NULL,
            cgst_rate REAL NOT NULL DEFAULT 2.5,
            sgst_rate REAL NOT NULL DEFAULT 2.5,
            invoice_prefix TEXT NOT NULL DEFAULT 'INV-',
            numbering_padding INTEGER NOT NULL DEFAULT 6,
            notes_default TEXT NOT NULL DEFAULT 'Thanks for your business.',
            terms_default TEXT NOT NULL DEFAULT 'Due on Receipt',
            signatory_title TEXT NOT NULL DEFAULT 'Authorized Signature',
            room_presets TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        """)

        # Invoices Table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS invoices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            invoice_number TEXT NOT NULL UNIQUE,
            sequence_number INTEGER NOT NULL,
            fy TEXT NOT NULL,
            invoice_date TEXT NOT NULL,
            place_of_supply TEXT NOT NULL DEFAULT 'Karnataka (29)',
            customer_name TEXT NOT NULL,
            customer_address TEXT DEFAULT '',
            customer_pincode TEXT DEFAULT '',
            customer_gstin TEXT NOT NULL DEFAULT '',
            items_json TEXT NOT NULL,
            total_cash REAL NOT NULL DEFAULT 0.0,
            total_online REAL NOT NULL DEFAULT 0.0,
            subtotal REAL NOT NULL DEFAULT 0.0,
            cgst_rate REAL NOT NULL DEFAULT 2.5,
            cgst_amount REAL NOT NULL DEFAULT 0.0,
            sgst_rate REAL NOT NULL DEFAULT 2.5,
            sgst_amount REAL NOT NULL DEFAULT 0.0,
            grand_total REAL NOT NULL DEFAULT 0.0,
            total_in_words TEXT NOT NULL DEFAULT '',
            notes TEXT DEFAULT 'Thanks for your business.',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        """)

        # Migrate columns if existing table doesn't have them
        cursor.execute("PRAGMA table_info(invoices);")
        columns = [r[1] for r in cursor.fetchall()]
        if "customer_pincode" not in columns:
            cursor.execute("ALTER TABLE invoices ADD COLUMN customer_pincode TEXT DEFAULT '';")
        if "total_cash" not in columns:
            cursor.execute("ALTER TABLE invoices ADD COLUMN total_cash REAL DEFAULT 0.0;")
        if "total_online" not in columns:
            cursor.execute("ALTER TABLE invoices ADD COLUMN total_online REAL DEFAULT 0.0;")

        # Check if settings exist, seed with exact Nayak's Sujay details
        cursor.execute("SELECT COUNT(*) FROM settings WHERE id = 1;")
        if cursor.fetchone()[0] == 0:
            default_presets = [
                "A/C DELUXE ROOM",
                "NON A/C DELUXE ROOM",
                "DOUBLE BEDROOM",
                "FOUR BEDROOM",
                "SUITE ROOM"
            ]
            now_str = datetime.now().isoformat()
            cursor.execute("""
            INSERT INTO settings (
                id, hotel_name, tagline, address, phone, email, website,
                gstin, place_of_supply, logo_path, cgst_rate, sgst_rate,
                invoice_prefix, numbering_padding, notes_default, terms_default,
                signatory_title, room_presets, updated_at
            ) VALUES (
                1, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?,
                ?, ?, ?, ?,
                ?, ?, ?
            );
            """, (
                "Nayaks Sujay - Experience the Divine Comfort",
                "Experience the Divine Comfort",
                "Murdeshwar, Karnataka 581350, India",
                "9164767677",
                "nayakssujay.mdr@gmail.com",
                "www.nayakssujay.com",
                "29AAXFN9443K1Z6",
                "Karnataka (29)",
                "/assets/logo.jpg",
                2.5, 2.5,
                "INV-", 6,
                "Thanks for your business.",
                "Due on Receipt",
                "Authorized Signature",
                json.dumps(default_presets),
                now_str
            ))

        conn.commit()

def get_settings() -> Dict[str, Any]:
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM settings WHERE id = 1;")
        row = cursor.fetchone()
        if not row:
            init_db()
            cursor.execute("SELECT * FROM settings WHERE id = 1;")
            row = cursor.fetchone()
        data = dict(row)
        try:
            data["room_presets"] = json.loads(data["room_presets"])
        except Exception:
            data["room_presets"] = ["A/C DELUXE ROOM", "SUITE ROOM"]
        return data

def update_settings(updates: Dict[str, Any]) -> Dict[str, Any]:
    with get_db_connection() as conn:
        cursor = conn.cursor()
        current = get_settings()

        presets = updates.get("room_presets", current["room_presets"])
        if isinstance(presets, list):
            presets_json = json.dumps(presets)
        else:
            presets_json = json.dumps(current["room_presets"])

        fields = [
            "hotel_name", "tagline", "address", "phone", "email", "website",
            "gstin", "place_of_supply", "cgst_rate", "sgst_rate",
            "invoice_prefix", "numbering_padding", "notes_default",
            "terms_default", "signatory_title"
        ]

        set_clause = []
        values = []
        for field in fields:
            if field in updates:
                set_clause.append(f"{field} = ?")
                values.append(updates[field])

        set_clause.append("room_presets = ?")
        values.append(presets_json)
        set_clause.append("updated_at = ?")
        values.append(datetime.now().isoformat())

        query = f"UPDATE settings SET {', '.join(set_clause)} WHERE id = 1;"
        cursor.execute(query, values)
        conn.commit()

    return get_settings()

def get_next_invoice_number() -> Tuple[int, str]:
    settings = get_settings()
    prefix = settings.get("invoice_prefix", "INV-")
    padding = int(settings.get("numbering_padding", 3))

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COALESCE(MAX(sequence_number), 0) FROM invoices;")
        last_seq = cursor.fetchone()[0]
        next_seq = last_seq + 1

        inv_num = f"{prefix}{str(next_seq).zfill(padding)}"
        while True:
            cursor.execute("SELECT id FROM invoices WHERE invoice_number = ?;", (inv_num,))
            if not cursor.fetchone():
                break
            next_seq += 1
            inv_num = f"{prefix}{str(next_seq).zfill(padding)}"

        return next_seq, inv_num

def create_invoice(data: Dict[str, Any]) -> Dict[str, Any]:
    import re
    from num2words import number_to_words_indian

    settings = get_settings()
    next_seq, auto_inv_num = get_next_invoice_number()

    invoice_number = (data.get("invoice_number") or "").strip()
    if not invoice_number:
        invoice_number = auto_inv_num

    match = re.search(r'\d+', invoice_number)
    seq_num = int(match.group()) if match else next_seq

    fy = get_current_fy()
    invoice_date = data.get("invoice_date") or datetime.now().strftime("%Y-%m-%d")
    place_of_supply = data.get("place_of_supply") or settings.get("place_of_supply", "Karnataka (29)")

    items = data.get("items", [])
    if not items:
        items = [{
            "description": "A/C DELUXE ROOM",
            "checkin": invoice_date,
            "checkout": invoice_date,
            "qty": 1,
            "cash": 2350.0,
            "online": 0.0,
            "amount": 2350.0
        }]

    subtotal = 0.0
    total_cash = 0.0
    total_online = 0.0
    cleaned_items = []

    for it in items:
        qty = int(it.get("qty", 1))
        cash = float(it.get("cash", 0.0))
        online = float(it.get("online", 0.0))
        amt = float(it.get("amount", (cash + online) * qty))
        if amt == 0 and (cash > 0 or online > 0):
            amt = (cash + online) * qty

        total_cash += (cash * qty)
        total_online += (online * qty)
        subtotal += amt

        cleaned_items.append({
            "description": it.get("description", "A/C DELUXE ROOM").strip(),
            "checkin": it.get("checkin", invoice_date),
            "checkout": it.get("checkout", invoice_date),
            "qty": qty,
            "cash": cash,
            "online": online,
            "amount": amt
        })

    subtotal = round(subtotal, 2)
    total_cash = round(total_cash, 2)
    total_online = round(total_online, 2)

    cgst_rate = float(data.get("cgst_rate", settings.get("cgst_rate", 2.5)))
    sgst_rate = float(data.get("sgst_rate", settings.get("sgst_rate", 2.5)))

    cgst_amount = round(subtotal * (cgst_rate / 100.0), 2)
    sgst_amount = round(subtotal * (sgst_rate / 100.0), 2)
    grand_total = round(subtotal + cgst_amount + sgst_amount, 2)

    total_in_words = number_to_words_indian(grand_total)
    now_str = datetime.now().isoformat()

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        INSERT INTO invoices (
            invoice_number, sequence_number, fy, invoice_date, place_of_supply,
            customer_name, customer_address, customer_pincode, customer_gstin, items_json,
            total_cash, total_online, subtotal, cgst_rate, cgst_amount, sgst_rate, sgst_amount,
            grand_total, total_in_words, notes, created_at, updated_at
        ) VALUES (
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?
        );
        """, (
            invoice_number, seq_num, fy, invoice_date, place_of_supply,
            data.get("customer_name", "").strip() or "Valued Guest",
            data.get("customer_address", "").strip(),
            data.get("customer_pincode", "").strip(),
            data.get("customer_gstin", "").strip().upper(),
            json.dumps(cleaned_items),
            total_cash, total_online, subtotal, cgst_rate, cgst_amount, sgst_rate, sgst_amount,
            grand_total, total_in_words,
            data.get("notes") or settings.get("notes_default", "Thanks for your business."),
            now_str, now_str
        ))
        inv_id = cursor.lastrowid
        conn.commit()

    return get_invoice_by_id(inv_id)

def get_invoice_by_id(invoice_id: int) -> Optional[Dict[str, Any]]:
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM invoices WHERE id = ?;", (invoice_id,))
        row = cursor.fetchone()
        if not row:
            return None
        inv = dict(row)
        try:
            inv["items"] = json.loads(inv["items_json"])
        except Exception:
            inv["items"] = []
        return inv

def update_invoice(invoice_id: int, data: Dict[str, Any]) -> Dict[str, Any]:
    from num2words import number_to_words_indian

    existing = get_invoice_by_id(invoice_id)
    if not existing:
        raise ValueError(f"Invoice #{invoice_id} not found.")

    settings = get_settings()
    invoice_date = data.get("invoice_date", existing["invoice_date"])
    place_of_supply = data.get("place_of_supply", existing["place_of_supply"])

    items = data.get("items", existing.get("items", []))
    subtotal = 0.0
    total_cash = 0.0
    total_online = 0.0
    cleaned_items = []

    for it in items:
        qty = int(it.get("qty", 1))
        cash = float(it.get("cash", 0.0))
        online = float(it.get("online", 0.0))
        amt = float(it.get("amount", (cash + online) * qty))
        if amt == 0 and (cash > 0 or online > 0):
            amt = (cash + online) * qty

        total_cash += (cash * qty)
        total_online += (online * qty)
        subtotal += amt

        cleaned_items.append({
            "description": it.get("description", "A/C DELUXE ROOM").strip(),
            "checkin": it.get("checkin", invoice_date),
            "checkout": it.get("checkout", invoice_date),
            "qty": qty,
            "cash": cash,
            "online": online,
            "amount": amt
        })

    subtotal = round(subtotal, 2)
    total_cash = round(total_cash, 2)
    total_online = round(total_online, 2)

    cgst_rate = float(data.get("cgst_rate", existing["cgst_rate"]))
    sgst_rate = float(data.get("sgst_rate", existing["sgst_rate"]))
    cgst_amount = round(subtotal * (cgst_rate / 100.0), 2)
    sgst_amount = round(subtotal * (sgst_rate / 100.0), 2)
    grand_total = round(subtotal + cgst_amount + sgst_amount, 2)
    total_in_words = number_to_words_indian(grand_total)
    now_str = datetime.now().isoformat()

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        UPDATE invoices SET
            invoice_date = ?, place_of_supply = ?, customer_name = ?,
            customer_address = ?, customer_pincode = ?, customer_gstin = ?, items_json = ?,
            total_cash = ?, total_online = ?, subtotal = ?, cgst_rate = ?, cgst_amount = ?,
            sgst_rate = ?, sgst_amount = ?, grand_total = ?, total_in_words = ?, notes = ?,
            updated_at = ?
        WHERE id = ?;
        """, (
            invoice_date, place_of_supply,
            data.get("customer_name", existing["customer_name"]).strip(),
            data.get("customer_address", existing["customer_address"]).strip(),
            data.get("customer_pincode", existing.get("customer_pincode", "")).strip(),
            data.get("customer_gstin", existing["customer_gstin"]).strip().upper(),
            json.dumps(cleaned_items),
            total_cash, total_online, subtotal, cgst_rate, cgst_amount, sgst_rate, sgst_amount,
            grand_total, total_in_words,
            data.get("notes", existing["notes"]).strip(),
            now_str, invoice_id
        ))
        conn.commit()

    return get_invoice_by_id(invoice_id)

def delete_invoice(invoice_id: int) -> bool:
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM invoices WHERE id = ?;", (invoice_id,))
        conn.commit()
        return cursor.rowcount > 0

def clear_all_invoices() -> bool:
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM invoices;")
        cursor.execute("DELETE FROM sqlite_sequence WHERE name = 'invoices';")
        conn.commit()
        return True

def parse_date_safely(date_str: str) -> Optional[datetime]:
    if not date_str:
        return None
    date_str = str(date_str).strip()
    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y"):
        try:
            return datetime.strptime(date_str, fmt)
        except ValueError:
            pass
    return None

def get_archive_tree() -> Dict[str, Any]:
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        SELECT id, invoice_number, sequence_number, fy, invoice_date,
               customer_name, grand_total
        FROM invoices
        ORDER BY invoice_date ASC, sequence_number ASC;
        """)
        rows = [dict(r) for r in cursor.fetchall()]

    # Sort rows by parsed date ASC, then sequence_number ASC
    def sort_key(r):
        dt = parse_date_safely(r.get("invoice_date", "")) or datetime(1970, 1, 1)
        return (dt, int(r.get("sequence_number") or 0))

    rows.sort(key=sort_key)

    tree = {}
    for r in rows:
        fy = r["fy"]
        date_str = r["invoice_date"]
        dt = parse_date_safely(date_str)
        if dt:
            month_key = dt.strftime("%Y-%m")
            month_name = dt.strftime("%B %Y")
            day_key = dt.strftime("%Y-%m-%d")
            day_label = dt.strftime("%d %B %Y")
        else:
            month_key = "9999-99"
            month_name = "Other"
            day_key = "9999-99-99"
            day_label = date_str

        if fy not in tree:
            tree[fy] = {"name": fy, "total_bills": 0, "months": {}}
        tree[fy]["total_bills"] += 1

        if month_name not in tree[fy]["months"]:
            tree[fy]["months"][month_name] = {
                "name": month_name,
                "month_key": month_key,
                "total_bills": 0,
                "dates": {}
            }
        tree[fy]["months"][month_name]["total_bills"] += 1

        if day_label not in tree[fy]["months"][month_name]["dates"]:
            tree[fy]["months"][month_name]["dates"][day_label] = {
                "date": date_str,
                "day_key": day_key,
                "label": day_label,
                "bills": []
            }

        tree[fy]["months"][month_name]["dates"][day_label]["bills"].append({
            "id": r["id"],
            "invoice_number": r["invoice_number"],
            "sequence_number": r.get("sequence_number") or 0,
            "customer_name": r["customer_name"],
            "grand_total": r["grand_total"],
            "invoice_date": date_str
        })

    return tree

def search_invoices(query: Optional[str] = None, date_str: Optional[str] = None) -> List[Dict[str, Any]]:
    conditions = []
    params = []

    if query and query.strip():
        q = f"%{query.strip()}%"
        conditions.append("(invoice_number LIKE ? OR customer_name LIKE ? OR customer_address LIKE ? OR customer_gstin LIKE ?)")
        params.extend([q, q, q, q])

    if date_str and date_str.strip():
        conditions.append("invoice_date = ?")
        params.append(date_str.strip())

    where_sql = ("WHERE " + " AND ".join(conditions)) if conditions else ""

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(f"SELECT * FROM invoices {where_sql} ORDER BY sequence_number DESC;", params)
        rows = [dict(r) for r in cursor.fetchall()]

    for r in rows:
        try:
            r["items"] = json.loads(r["items_json"])
        except Exception:
            r["items"] = []
    return rows
