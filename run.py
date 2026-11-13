"""
Nayak's Sujay - Hotel Billing & GST Invoice Management System
Startup script for the production-ready local application.
"""

import sys
import os

# Set root directory
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(ROOT_DIR, "backend"))

from app import app
import db

if __name__ == "__main__":
    print("=" * 65)
    print("  NAYAK'S SUJAY - HOTEL BILLING & GST MANAGEMENT SYSTEM")
    print("  Experience the Divine Comfort")
    print("=" * 65)
    
    # Initialize database
    db.init_db()
    print("✓ Local SQLite Database verified & ready at: data/nayak_billing.db")
    print("✓ Application Server running at: http://127.0.0.1:5000")
    print("✓ Press Ctrl+C to stop the server.")
    print("=" * 65)
    
    app.run(host="127.0.0.1", port=5000, debug=False)
