from flask import Blueprint

document_management_bp = Blueprint('document_management',__name__,)

from . import controller