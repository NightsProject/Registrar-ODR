from flask import Blueprint

developers_bp = Blueprint('developers', __name__)

from . import controller
