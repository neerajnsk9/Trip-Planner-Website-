import sys
import os

# Add parent directory to path to import app.py
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import app

# Vercel serverless entry point
app = app
