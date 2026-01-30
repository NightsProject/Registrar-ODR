from flask import Blueprint

logging_bp = Blueprint('logging',__name__)

from . import controller