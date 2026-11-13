"""
A4 Vector PDF Invoice Generator for Nayak's Sujay.
Evenly distributed across the A4 page with Nayak's Sujay signature orange (#F26B1D),
warm soft tint (#FFF3EA), larger logo, spacious signature & stamp area,
clean currency formatting (Rs. without missing glyph boxes), terms & conditions,
and elegant Thank You footer.
"""

import io
import os
from typing import Dict, Any
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, HRFlowable
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from PIL import Image as PILImage

# Color Palette matching design requirements and reference images 3 & 4
COLOR_ACCENT = colors.HexColor("#F26B1D")       # Hotel signature orange
COLOR_ACCENT_TINT = colors.HexColor("#FFF3EA")  # Warm soft orange/cream tint
COLOR_ACCENT_LINE = colors.HexColor("#E8D3C2")  # Warm border accent
COLOR_SUB_HDR = colors.HexColor("#FFE8D6")      # Table sub-header tint
TEXT_PRIMARY = colors.HexColor("#111111")
TEXT_MUTED = colors.HexColor("#555555")
LINE_DARK = colors.HexColor("#222222")
LINE_LIGHT = colors.HexColor("#D1D5DB")

def format_to_dmy(val: Any) -> str:
    """Format dates to Day-Month-Year (DD-MM-YYYY)."""
    if not val:
        return ""
    s = str(val).strip()
    if len(s) == 10 and s[4] == '-' and s[7] == '-':
        parts = s.split('-')
        return f"{parts[2]}-{parts[1]}-{parts[0]}"
    return s

def clean_txt(val: Any) -> str:
    """Sanitize strings to avoid unicode glyph errors (e.g. replace ₹ with Rs.)."""
    if val is None:
        return ""
    s = str(val)
    return s.replace("₹", "Rs.").strip()

def generate_invoice_pdf(invoice_data: Dict[str, Any], settings: Dict[str, Any]) -> bytes:
    buffer = io.BytesIO()

    # Generous A4 margins: 12mm left/right, 11mm top/bottom
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=12 * mm,
        rightMargin=12 * mm,
        topMargin=11 * mm,
        bottomMargin=11 * mm
    )

    story = []
    page_width = A4[0] - 24 * mm  # ~527 pt

    # Typography Styles
    style_hotel_name = ParagraphStyle(
        'HotelName',
        fontName='Helvetica-Bold',
        fontSize=16,
        leading=19,
        textColor=COLOR_ACCENT,
        alignment=TA_LEFT
    )

    style_hotel_tagline = ParagraphStyle(
        'HotelTagline',
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=11,
        textColor=TEXT_MUTED,
        alignment=TA_LEFT
    )

    style_hotel_body = ParagraphStyle(
        'HotelBody',
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=TEXT_MUTED,
        alignment=TA_LEFT
    )

    style_tax_inv = ParagraphStyle(
        'TaxInvoiceTitle',
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=26,
        textColor=TEXT_PRIMARY,
        alignment=TA_RIGHT
    )

    style_meta_val = ParagraphStyle(
        'MetaVal',
        fontName='Helvetica',
        fontSize=9,
        leading=14,
        textColor=TEXT_PRIMARY
    )

    style_section_title = ParagraphStyle(
        'SectionTitle',
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        textColor=COLOR_ACCENT
    )

    style_table_th = ParagraphStyle(
        'TableTH',
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=TEXT_PRIMARY,
        alignment=TA_CENTER
    )

    style_table_cell = ParagraphStyle(
        'TableCell',
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=TEXT_PRIMARY
    )

    style_table_cell_center = ParagraphStyle(
        'TableCellCenter',
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=TEXT_PRIMARY,
        alignment=TA_CENTER
    )

    style_table_cell_right = ParagraphStyle(
        'TableCellRight',
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=TEXT_PRIMARY,
        alignment=TA_RIGHT
    )

    style_total_highlight = ParagraphStyle(
        'TotalHighlight',
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=15,
        textColor=COLOR_ACCENT,
        alignment=TA_RIGHT
    )

    style_thank_you = ParagraphStyle(
        'ThankYou',
        fontName='Helvetica-Oblique',
        fontSize=10,
        leading=14,
        textColor=COLOR_ACCENT,
        alignment=TA_CENTER
    )

    # 1. Top Header: Larger Logo + Hotel Info on Left, "TAX INVOICE" on Right
    logo_file = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "assets", "logo.jpg"))
    logo_img = None
    target_w = 60
    target_h = 78  # Prominent, sharp logo
    if os.path.exists(logo_file):
        try:
            with PILImage.open(logo_file) as pimg:
                w, h = pimg.size
                target_w = (w / h) * target_h
                logo_img = Image(logo_file, width=target_w, height=target_h)
        except Exception:
            logo_img = None

    hotel_name = clean_txt(settings.get("hotel_name", "NAYAK'S SUJAY"))
    tagline = clean_txt(settings.get("tagline", "EXPERIENCE THE DIVINE COMFORT"))
    hotel_addr = clean_txt(settings.get("address", "Murdeshwar, Karnataka 581350, India"))
    gstin = clean_txt(settings.get("gstin", "29AAXFN9443K1Z6"))
    phone = clean_txt(settings.get("phone", "9164767677"))
    email = clean_txt(settings.get("email", "nayakssujay.mdr@gmail.com"))
    website = clean_txt(settings.get("website", "www.nayakssujay.com"))

    hotel_text_data = [
        [Paragraph(f"<b>{hotel_name}</b>", style_hotel_name)],
        [Paragraph(f"<b>{tagline.upper()}</b>", style_hotel_tagline)],
        [Paragraph(f"{hotel_addr}", style_hotel_body)],
        [Paragraph(f"<b>GSTIN:</b> {gstin} &nbsp;|&nbsp; <b>Phone:</b> {phone}", style_hotel_body)],
        [Paragraph(f"<b>Email:</b> {email} &nbsp;|&nbsp; <b>Web:</b> {website}", style_hotel_body)],
    ]
    hotel_info_table = Table(hotel_text_data, colWidths=[(page_width * 0.66) - target_w - 12])
    hotel_info_table.setStyle(TableStyle([
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 1),
        ('BOTTOMPADDING', (0,0), (-1,-1), 1),
    ]))

    if logo_img:
        hdr_left = Table([[logo_img, hotel_info_table]], colWidths=[target_w + 12, (page_width * 0.66) - target_w - 12])
        hdr_left.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 4),
            ('TOPPADDING', (0,0), (-1,-1), 0),
            ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ]))
    else:
        hdr_left = hotel_info_table

    hdr_right = Paragraph("<b>TAX<br/>INVOICE</b>", style_tax_inv)

    header_table = Table([[hdr_left, hdr_right]], colWidths=[page_width * 0.68, page_width * 0.32])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 0),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(header_table)

    # Decorative top line in signature orange
    story.append(HRFlowable(width="100%", thickness=1.5, color=COLOR_ACCENT, spaceAfter=2.5*mm, spaceBefore=1*mm))

    # 2. Meta Box & Bill To (Evenly Spaced)
    inv_num = clean_txt(invoice_data.get("invoice_number", "INV-000001"))
    inv_date = format_to_dmy(clean_txt(invoice_data.get("invoice_date", "")))
    place_of_supply = clean_txt(invoice_data.get("place_of_supply") or settings.get("place_of_supply", "Karnataka (29)"))
    terms = clean_txt(settings.get("terms_default", "Due on Receipt"))

    meta_left_html = f"""
    <b>Bill No:</b> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <b>{inv_num}</b><br/>
    <b>Invoice Date:</b> &nbsp;&nbsp; {inv_date}<br/>
    <b>Terms:</b> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {terms}
    """
    meta_right_html = f"""
    <b>Place Of Supply:</b> <b>{place_of_supply}</b>
    """

    meta_table = Table(
        [[Paragraph(meta_left_html, style_meta_val), Paragraph(meta_right_html, style_meta_val)]],
        colWidths=[page_width * 0.55, page_width * 0.45]
    )
    meta_table.setStyle(TableStyle([
        ('BOX', (0,0), (-1,-1), 0.75, LINE_DARK),
        ('INNERGRID', (0,0), (-1,-1), 0.75, LINE_DARK),
        ('TOPPADDING', (0,0), (-1,-1), 7),
        ('BOTTOMPADDING', (0,0), (-1,-1), 7),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(meta_table)

    # Bill To Box with Customer Name, Address, Pincode, GSTIN
    c_name = clean_txt(invoice_data.get("customer_name") or "Valued Guest")
    c_addr = clean_txt(invoice_data.get("customer_address") or "")
    c_pin = clean_txt(invoice_data.get("customer_pincode") or "")
    c_gstin = clean_txt(invoice_data.get("customer_gstin") or "")

    bill_to_html = f"""
    <font color="{COLOR_ACCENT.hexval()}"><b>BILL TO (GUEST DETAILS)</b></font><br/>
    <b>{c_name}</b>
    """
    if c_addr:
        bill_to_html += f"<br/>{c_addr}"
    if c_pin:
        bill_to_html += f" - PIN: {c_pin}"
    if c_gstin:
        bill_to_html += f"<br/><b>GSTIN: {c_gstin}</b>"

    bill_to_table = Table([[Paragraph(bill_to_html, style_table_cell)]], colWidths=[page_width])
    bill_to_table.setStyle(TableStyle([
        ('BOX', (0,0), (-1,-1), 0.75, LINE_DARK),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#FAFAFA")),
    ]))
    story.append(bill_to_table)

    # 3. Excel-Style Table: Sl.No, Description / Room, Check-in, Check-out, Qty, Cash, Online, Total
    # Reduced Cash & Online widths to 52 pt each, giving Total 80 pt so Total & Amount fit on ONE line!
    col_widths = [24, 175, 58, 58, 28, 52, 52, page_width - (24 + 175 + 58 + 58 + 28 + 52 + 52)]

    hdr_row_1 = [
        Paragraph("<b>Sl.No</b>", style_table_th),
        Paragraph("<b>Description / Room</b>", style_table_th),
        Paragraph("<b>Check-in</b>", style_table_th),
        Paragraph("<b>Check-out</b>", style_table_th),
        Paragraph("<b>Qty</b>", style_table_th),
        Paragraph("<b>Room Amount (Rs.)</b>", style_table_th),
        "",
        Paragraph("<b>Total (Rs.)</b>", style_table_th)
    ]
    hdr_row_2 = [
        "", "", "", "", "",
        Paragraph("<b>Cash</b>", style_table_th),
        Paragraph("<b>Online</b>", style_table_th),
        ""
    ]

    table_rows = [hdr_row_1, hdr_row_2]

    items = invoice_data.get("items", [])
    if not items:
        items = [{
            "description": "A/C DELUXE ROOM",
            "checkin": inv_date,
            "checkout": inv_date,
            "qty": 1,
            "cash": invoice_data.get("subtotal", 0.0),
            "online": 0.0,
            "amount": invoice_data.get("subtotal", 0.0)
        }]

    for idx, it in enumerate(items, 1):
        desc = clean_txt(it.get("description", "Room Stay"))
        cin = format_to_dmy(clean_txt(it.get("checkin", "-")))
        cout = format_to_dmy(clean_txt(it.get("checkout", "-")))
        qty = int(it.get("qty", 1))
        cash = float(it.get("cash", 0.0))
        online = float(it.get("online", 0.0))
        amt = float(it.get("amount", (cash + online) * qty))

        table_rows.append([
            Paragraph(str(idx), style_table_cell_center),
            Paragraph(f"<b>{desc}</b>", style_table_cell),
            Paragraph(cin, style_table_cell_center),
            Paragraph(cout, style_table_cell_center),
            Paragraph(str(qty), style_table_cell_center),
            Paragraph(f"{cash:,.2f}", style_table_cell_right),
            Paragraph(f"{online:,.2f}", style_table_cell_right),
            Paragraph(f"{amt:,.2f}", style_table_cell_right)
        ])

    items_table = Table(table_rows, colWidths=col_widths, repeatRows=2)
    items_table.setStyle(TableStyle([
        ('SPAN', (0,0), (0,1)),
        ('SPAN', (1,0), (1,1)),
        ('SPAN', (2,0), (2,1)),
        ('SPAN', (3,0), (3,1)),
        ('SPAN', (4,0), (4,1)),
        ('SPAN', (5,0), (6,0)),  # Room Amount spans Cash & Online
        ('SPAN', (7,0), (7,1)),
        # Fill ENTIRE header block (row 0 and row 1) with warm orange tint - fixes half coverage!
        ('BACKGROUND', (0,0), (-1,1), COLOR_ACCENT_TINT),
        ('BACKGROUND', (5,1), (6,1), COLOR_SUB_HDR),
        ('LINEBELOW', (0,1), (-1,1), 1.5, COLOR_ACCENT),
        ('BOX', (0,0), (-1,-1), 0.75, LINE_DARK),
        ('GRID', (0,0), (-1,-1), 0.5, LINE_LIGHT),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(items_table)

    # 4. Bottom Section: Left (Total in words, Notes) | Right (Sub Total, CGST, SGST, Grand Total, Signature Stamp)
    subtotal = float(invoice_data.get("subtotal", 0.0))
    cgst_rate = float(invoice_data.get("cgst_rate", 2.5))
    cgst_amt = float(invoice_data.get("cgst_amount", 0.0))
    sgst_rate = float(invoice_data.get("sgst_rate", 2.5))
    sgst_amt = float(invoice_data.get("sgst_amount", 0.0))
    grand_total = float(invoice_data.get("grand_total", 0.0))
    in_words = clean_txt(invoice_data.get("total_in_words", ""))
    notes = clean_txt(invoice_data.get("notes") or settings.get("notes_default", "Thanks for your business."))
    signatory = clean_txt(settings.get("signatory_title", "Authorized Signature"))

    tot_cash = float(invoice_data.get("total_cash", 0.0))
    tot_online = float(invoice_data.get("total_online", 0.0))

    # Clean left block with NO Terms & Conditions as requested
    left_html = f"""
    <b>Total In Words:</b><br/>
    <font color="{COLOR_ACCENT.hexval()}"><i>{in_words}</i></font><br/><br/>
    <b>Notes:</b><br/>
    {notes}<br/><br/>
    <font color="#444444" size="8"><b>Payment Summary:</b><br/>
    Cash Collected: Rs. {tot_cash:,.2f} &nbsp;|&nbsp; Online Received: Rs. {tot_online:,.2f}</font>
    """
    left_cell = Paragraph(left_html, style_table_cell)

    right_calc_rows = [
        [Paragraph("Sub Total", style_table_cell), Paragraph(f"Rs. {subtotal:,.2f}", style_table_cell_right)],
        [Paragraph(f"CGST ({cgst_rate}%)", style_table_cell), Paragraph(f"Rs. {cgst_amt:,.2f}", style_table_cell_right)],
        [Paragraph(f"SGST ({sgst_rate}%)", style_table_cell), Paragraph(f"Rs. {sgst_amt:,.2f}", style_table_cell_right)],
        [Paragraph("<b>GRAND TOTAL:</b>", style_section_title), Paragraph(f"<b>Rs. {grand_total:,.2f}</b>", style_total_highlight)],
    ]
    calc_table = Table(right_calc_rows, colWidths=[105, 115])
    calc_table.setStyle(TableStyle([
        ('LINEBELOW', (0,0), (-1,-2), 0.5, LINE_LIGHT),
        ('LINEABOVE', (0,-1), (-1,-1), 1.2, COLOR_ACCENT),
        ('BACKGROUND', (0,-1), (-1,-1), COLOR_ACCENT_TINT),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))

    # SPACIOUS SIGNATURE & STAMP BOX (Height: 120 pt, moved down, NO [STAMP/SEAL AREA] text!)
    # Clean blank space for stamp and seal, with "For NAYAK'S SUJAY" and "Authorized Signatory"
    stamp_box_data = [
        [Paragraph("<b>For NAYAK'S SUJAY</b>", ParagraphStyle('ForHotel', fontName='Helvetica-Bold', fontSize=8, textColor=TEXT_MUTED, alignment=TA_CENTER))],
        [Paragraph("", style_table_cell)],  # Open blank stamp area
        [Paragraph(f"<b>{signatory}</b>", ParagraphStyle('SigTitle', fontName='Helvetica-Bold', fontSize=8.5, alignment=TA_CENTER))]
    ]
    stamp_box = Table(stamp_box_data, colWidths=[220], rowHeights=[18, 77, 25])
    stamp_box.setStyle(TableStyle([
        ('BOX', (0,0), (-1,-1), 0.75, COLOR_ACCENT_LINE),
        ('TOPPADDING', (0,0), (-1,0), 4),
        ('BOTTOMPADDING', (0,2), (-1,2), 5),
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#FCFCFC")),
        ('LINEABOVE', (0,2), (0,2), 0.5, colors.HexColor("#CCCCCC")),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))

    right_stack = [calc_table, Spacer(1, 4 * mm), stamp_box]

    bottom_table = Table([[left_cell, right_stack]], colWidths=[page_width - 230, 230])
    bottom_table.setStyle(TableStyle([
        ('BOX', (0,0), (-1,-1), 0.75, LINE_DARK),
        ('INNERGRID', (0,0), (-1,-1), 0.75, LINE_DARK),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 9),
        ('BOTTOMPADDING', (0,0), (-1,-1), 9),
        ('LEFTPADDING', (0,0), (-1,-1), 9),
        ('RIGHTPADDING', (0,0), (-1,-1), 9),
    ]))
    story.append(bottom_table)

    # 5. Generous spacing before the footer
    story.append(Spacer(1, 8 * mm))

    # PRETTY THANK YOU NOTE in signature logo orange
    thank_you_html = "✦ Thank you for staying with us at Nayak's Sujay. Experience the Divine Comfort! ✦"
    story.append(Paragraph(f"<b>{thank_you_html}</b>", style_thank_you))

    doc.build(story)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
