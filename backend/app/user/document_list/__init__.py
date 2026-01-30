from flask import Blueprint

document_list_bp = Blueprint('document_list',__name__)


from . import controller