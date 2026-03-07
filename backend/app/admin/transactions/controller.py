from . import transactions_bp
from flask import jsonify, request, current_app
from app.utils.decorator import jwt_required_with_role
from flask_jwt_extended import get_jwt_identity
from .models import TransactionsModel
from flask_jwt_extended import jwt_required
from app.services.logging_service import log_admin_action, log_error

@transactions_bp.route("/api/admin/transactions", methods=["GET"])
@jwt_required()
def get_transactions():
    admin_id = get_jwt_identity()
    try:
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 20))
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        search = request.args.get('search')
        sort = request.args.get('sort', 'desc')

        result = TransactionsModel.get_transactions(
                page=page, limit=limit, start_date=start_date, end_date=end_date, search=search, sort=sort
        )
        
        # Log transactions access
        log_admin_action(
            action="transactions_list_accessed",
            details=f"Admin: {admin_id}, Page: {page}, Total: {result['total']}",
            category="PAYMENT"
        )
        
        return jsonify({
                'transactions': result['transactions'], 
                'total': result['total'], 
                'total_pages': result['total_pages']
        }), 200
    except Exception as e:
        log_error("get_transactions", str(e), f"Admin: {admin_id}")
        current_app.logger.error(f"Error fetching transactions: {e}")
        return jsonify({'error': str(e)}), 500


@transactions_bp.route('/api/admin/transactions/summary', methods=['GET'])
@jwt_required()
def get_summary():
    admin_id = get_jwt_identity()
    try:
        # returns total amount of paid transactions, total number, unpaid transactions
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        search = request.args.get('search')
        
        result = TransactionsModel.get_summary_stats(start_date=start_date, end_date=end_date, search=search)
        
        # Log summary access
        log_admin_action(
            action="transactions_summary_accessed",
            details=f"Admin: {admin_id}, Start: {start_date}, End: {end_date}",
            category="PAYMENT"
        )
        
        return jsonify(result), 200
    except Exception as e:
        log_error("get_summary", str(e), f"Admin: {admin_id}")
        current_app.logger.error(f"Error fetching summary: {e}")
        return jsonify({'error': str(e)}), 500
