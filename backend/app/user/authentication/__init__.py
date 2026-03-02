from flask import Blueprint

authentication_user_bp = Blueprint('authentication_user', __name__)

from . import controller
