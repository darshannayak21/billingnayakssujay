"""
Flask Web Application Server for Nayak's Sujay Minimal Fast Billing System.
"""

import os
import sys
import json
from flask import Flask, request, jsonify, send_from_directory, Response
from flask_cors import CORS

sys.path.insert(0, os.path.dirname(__file__))

import db
import pdf_generator

app = Flask(
    __name__,
    static_folder=os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "static")),
    static_url_path="/static"
)
CORS(app)

ASSETS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "assets"))

# Initialize Database
db.init_db()

@app.route("/")
def index():
    return send_from_directory(app.static_folder, "index.html")

@app.route("/assets/<path:filename>")
def serve_assets(filename):
    return send_from_directory(ASSETS_DIR, filename)

@app.route("/api/settings", methods=["GET"])
def get_settings():
    try:
        s = db.get_settings()
        return jsonify({"success": True, "data": s})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/settings", methods=["POST"])
def update_settings():
    try:
        data = request.json or {}
        s = db.update_settings(data)
        return jsonify({"success": True, "data": s})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/invoices/next-number", methods=["GET"])
def get_next_number():
    try:
        seq, num = db.get_next_invoice_number()
        return jsonify({"success": True, "sequence_number": seq, "invoice_number": num})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/invoices", methods=["GET"])
def list_invoices():
    try:
        q = request.args.get("q")
        date_str = request.args.get("date")
        invoices = db.search_invoices(query=q, date_str=date_str)
        return jsonify({"success": True, "data": invoices})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/invoices", methods=["POST"])
def create_invoice():
    try:
        data = request.json or {}
        inv = db.create_invoice(data)
        return jsonify({"success": True, "data": inv}), 201
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/invoices/<int:inv_id>", methods=["GET"])
def get_invoice(inv_id):
    try:
        inv = db.get_invoice_by_id(inv_id)
        if not inv:
            return jsonify({"success": False, "error": "Invoice not found"}), 404
        return jsonify({"success": True, "data": inv})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/invoices/<int:inv_id>", methods=["PUT"])
def update_invoice(inv_id):
    try:
        data = request.json or {}
        inv = db.update_invoice(inv_id, data)
        return jsonify({"success": True, "data": inv})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/invoices/<int:inv_id>", methods=["DELETE"])
def delete_invoice(inv_id):
    try:
        ok = db.delete_invoice(inv_id)
        if not ok:
            return jsonify({"success": False, "error": "Invoice not found"}), 404
        return jsonify({"success": True, "message": "Invoice deleted successfully"})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/invoices/clear-all", methods=["POST"])
def clear_all_invoices():
    try:
        db.clear_all_invoices()
        return jsonify({"success": True, "message": "All invoices cleared successfully"})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/invoices/<int:inv_id>/pdf", methods=["GET"])
def download_pdf(inv_id):
    try:
        inv = db.get_invoice_by_id(inv_id)
        if not inv:
            return jsonify({"success": False, "error": "Invoice not found"}), 404
        settings = db.get_settings()
        pdf_bytes = pdf_generator.generate_invoice_pdf(inv, settings)
        clean_num = inv["invoice_number"].replace("/", "_")
        filename = f"{clean_num}_Nayaks_Sujay.pdf"
        return Response(
            pdf_bytes,
            mimetype="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=\"{filename}\""}
        )
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/archive/tree", methods=["GET"])
def get_archive_tree():
    try:
        tree = db.get_archive_tree()
        return jsonify({"success": True, "data": tree})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=False)
