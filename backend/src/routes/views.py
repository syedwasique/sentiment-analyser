# Flask UI has been removed. All UI is served by the Vite React frontend.
# This file is kept as a placeholder so the blueprint import in app.py doesn't break.
from flask import Blueprint

bp = Blueprint('views', __name__)
