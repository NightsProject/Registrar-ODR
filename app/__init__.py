
from flask import Flask, g, render_template, send_from_directory, request
import os
from config import DB_USERNAME, DB_PASSWORD, DB_NAME, DB_HOST, DB_PORT, JWT_SECRET_KEY, FRONTEND_URL
from psycopg2 import pool
from .utils.error_handlers import register_error_handlers
from flask_cors import CORS
from flask_jwt_extended import (
    JWTManager, create_access_token, set_access_cookies, 
    unset_jwt_cookies, jwt_required, get_jwt_identity
)
from flask_session import Session
from datetime import timedelta
from dotenv import load_dotenv
from app.db_init import initialize_db

db_pool = None


def create_app(test_config=None):
    
   
    #initialize the database (create tables if not exist)
    #initialize_and_populate()
    load_dotenv()

    #in production
    #app = Flask(__name__, instance_relative_config=True, static_folder="static/react",  template_folder="static/react" )
  
    #in development
    app = Flask(__name__, static_folder="../frontend/build/static", template_folder="../frontend/build")
    
    
    # =====================
    #  CONFIG
    # =====================
    app.secret_key = os.getenv("FLASK_SECRET_KEY", "dev-secret-key")
    app.config["SESSION_COOKIE_HTTPONLY"] = True
    app.config["SESSION_COOKIE_SAMESITE"] = "lax"  
    app.config["SESSION_COOKIE_SECURE"] = False 
    app.config["SESSION_TYPE"] = "filesystem" 

    Session(app)
    
    # JWT CONFIGURATION
    app.config["JWT_SECRET_KEY"] = JWT_SECRET_KEY
    app.config["JWT_TOKEN_LOCATION"] = ["cookies"]
    app.config["JWT_COOKIE_CSRF_PROTECT"] = True
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=1)
    app.config["JWT_COOKIE_SECURE"] = False  # set True in production (HTTPS only)
    app.config["JWT_COOKIE_SAMESITE"] = "lax"  

    # CORS CONFIGURATION - Allow frontend origin with credentials
    CORS(
        app,
        supports_credentials=True,
        origins=[FRONTEND_URL],
        allow_headers=["Content-Type", "Authorization"],
        expose_headers=["Content-Type"],
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    )
    
    # Initialize JWT Manager
    jwt = JWTManager(app)
    
    
    # =====================
    #  DATABASE CONNECTION POOL
    # =====================

    #Initialize connection pool ONCE
    global db_pool
    if db_pool is None:
        db_pool = pool.SimpleConnectionPool(
            1, 10,  # min/max connections
            user=DB_USERNAME,
            password=DB_PASSWORD,
            host=DB_HOST,
            port=DB_PORT,
            database=DB_NAME
        )

    # Open connection for this request
    @app.before_request
    def get_db_connection():
        if "db_conn" not in g:
            g.db_conn = db_pool.getconn()

    # Close connection after request
    @app.teardown_appcontext
    def close_db_connection(exception):
        conn = g.pop("db_conn", None)
        if conn is not None:
            db_pool.putconn(conn)
            
    
    # =====================
    #  REGISTER BLUEPRINTS
    # =====================
    
    #ADMIN BLUEPRINTS
    from .admin.authentication import authentication_admin_bp as auth_admin_blueprint
    app.register_blueprint(auth_admin_blueprint)
    from .admin.dashboard import dashboard_bp as dashboard_blueprint
    app.register_blueprint(dashboard_blueprint)
    from .admin.document_manage import document_management_bp as document_management_blueprint
    app.register_blueprint(document_management_blueprint)
    from .admin.logging import logging_bp as logging_blueprint
    app.register_blueprint(logging_blueprint)
    from .admin.manage_request import manage_request_bp as manage_request_blueprint
    app.register_blueprint(manage_request_blueprint)
    from .admin.transactions import transactions_bp as transactions_blueprint
    app.register_blueprint(transactions_blueprint)
    from .admin.settings import settings_bp as settings_blueprint
    app.register_blueprint(settings_blueprint)

    
    #USER BLUEPRINTS
    from .user.authentication import authentication_user_bp as auth_user_blueprint
    app.register_blueprint(auth_user_blueprint, url_prefix='/user')
    from .user.document_list import document_list_bp as document_list_blueprint
    app.register_blueprint(document_list_blueprint)
    from .user.landing import landing_bp as landing_blueprint
    app.register_blueprint(landing_blueprint)
    from .user.request import request_bp as request_blueprint
    app.register_blueprint(request_blueprint)
    from .user.tracking import tracking_bp as tracking_blueprint
    app.register_blueprint(tracking_blueprint)
    from .user.payment import payment_bp as payment_blueprint
    app.register_blueprint(payment_blueprint, url_prefix='/user/payment')

    # ===================== 
    # MAYA WEBHOOK EXEMPTION
    # =====================
    # Maya can't send csrf tokens, so verify using signature instead
    @app.before_request
    def exempt_webhook_from_csrf():
        if request.path == '/user/payment/maya/webhook' and request.method == 'POST':
            g._jwt_extended_jwt_in_request_context = False

    #WHATSAPP BLUEPRINT
    from .whatsapp import whatsapp_bp as whatsapp_blueprint 
    app.register_blueprint(whatsapp_blueprint)           


    # === FRONTEND ROUTES (React) ===
    @app.route("/", defaults={"path": ""})
    @app.route("/<path:path>")
    def serve_react(path):

        if path and os.path.exists(os.path.join(app.static_folder, path)):
            return send_from_directory(app.static_folder, path)
        
        # Serve root files (favicon, manifest, etc.) from template folder (build root)
        abs_template_folder = os.path.join(app.root_path, app.template_folder)
        if path and os.path.exists(os.path.join(abs_template_folder, path)):
            return send_from_directory(abs_template_folder, path)
            
        return send_from_directory(abs_template_folder, "index.html")

    from .admin.authentication.controller import init_oauth
    init_oauth(app)


    @app.after_request
    def set_coop_headers(response):
        # Needed for Google Sign-In popup to communicate via postMessage
        response.headers["Cross-Origin-Opener-Policy"] = "same-origin-allow-popups"
        response.headers["Cross-Origin-Embedder-Policy"] = "unsafe-none"
        return response

    register_error_handlers(app)

    return app