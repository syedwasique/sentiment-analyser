import os
import sys

# Ensure project root is in sys.path when script is executed directly
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if base_dir not in sys.path:
    sys.path.insert(0, base_dir)

from flask import Flask

def create_app(test_config=None) -> Flask:
    """Flask application factory — pure REST API server. All UI is served by Vite."""
    app = Flask(__name__)

    app.config.from_mapping(
        SECRET_KEY='dev',
    )

    try:
        from flask_cors import CORS
        CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)
    except ImportError:
        pass

    @app.after_request
    def add_cors_headers(response):
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
        response.headers['Access-Control-Max-Age'] = '3600'
        return response

    if test_config is None:
        app.config.from_pyfile('config.py', silent=True)
    else:
        app.config.from_mapping(test_config)

    # Only register the analyze API blueprint — no views/UI blueprint
    from src.routes import analyze
    app.register_blueprint(analyze.bp)

    # Preload ML model and tokenizer into memory at server startup
    try:
        from src.inference import _load_models
        _load_models()
    except Exception as e:
        print(f"Warning: Could not preload model on startup: {e}")

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=False, use_reloader=False)