from flask import Blueprint

manage_request_bp = Blueprint('manage_request', __name__)

from . import controller
