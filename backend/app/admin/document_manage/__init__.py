from flask import Blueprint

document_management_bp = Blueprint('document_management',__name__, url_prefix="/admin")

from . import controller