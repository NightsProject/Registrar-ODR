from flask import jsonify
from flask_jwt_extended.exceptions import CSRFError as JWTCSRFError

def register_error_handlers(app):

    @app.errorhandler(400)
    def bad_request(e):
        return jsonify({"error": "Bad Request"}), 400

    @app.errorhandler(401)
    def unauthorized(e):
        return jsonify({"error": "Unauthorized"}), 401

    @app.errorhandler(403)
    def forbidden(e):
        return jsonify({"error": "Forbidden"}), 403

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "Not Found"}), 404

    @app.errorhandler(500)
    def internal_server_error(e):
        app.logger.error(f"Internal Server Error: {e}")
        return jsonify({"error": "Internal Server Error"}), 500

    @app.errorhandler(JWTCSRFError)
    def handle_jwt_csrf_error(e):
        return jsonify({"error": "CSRF token missing or invalid"}), 400
