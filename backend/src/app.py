import os
import sys

# Ensure project root is in sys.path when script is executed directly
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if base_dir not in sys.path:
    sys.path.insert(0, base_dir)

from flask import Flask

def create_app(test_config=None) -> Flask:
    """Flask application factory."""
    # Project root is one level up from src/
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

    app = Flask(
        __name__,
        instance_relative_config=True,
        template_folder=os.path.join(base_dir, "templates"),
        static_folder=os.path.join(base_dir, "static"),
    )

    app.config.from_mapping(
        SECRET_KEY='dev',
    )

    try:
        from flask_cors import CORS
        CORS(app, resources={r"/*": {"origins": ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000", "http://127.0.0.1:3000", "*"]}})
    except ImportError:
        pass

    if test_config is None:
        app.config.from_pyfile('config.py', silent=True)
    else:
        app.config.from_mapping(test_config)

    try:
        os.makedirs(app.instance_path)
    except OSError:
        pass

    from src.routes import views, analyze
    app.register_blueprint(views.bp)
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
    app.run(debug=True, use_reloader=False)