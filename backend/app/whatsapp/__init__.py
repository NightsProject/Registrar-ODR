from flask import Blueprint
whatsapp_bp = Blueprint('whatsapp', __name__,)
from . import controller
