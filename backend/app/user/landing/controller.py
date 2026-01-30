from . import landing_bp
from flask import render_template, session, redirect, url_for


@landing_bp.route('/user/landing')
def landing():
 
    return render_template('/user/landing.html', username=session.get('username'), active='landing')
