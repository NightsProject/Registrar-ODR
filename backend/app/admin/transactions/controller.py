from . import transactions_bp
from flask import jsonify, request
from app.utils.decorator import jwt_required_with_role
from flask_jwt_extended import get_jwt_identity
from .models import TransactionsModel
from flask_jwt_extended import jwt_required

@transactions_bp.route("/api/admin/transactions", methods=["GET"])
@jwt_required()
def get_transactions():
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
		return jsonify({
				'transactions': result['transactions'], 
				'total': result['total'], 
				'total_pages': result['total_pages']
		}), 200
	except Exception as e:
		return jsonify({'error': str(e)}), 500


@transactions_bp.route('/api/admin/transactions/summary', methods=['GET'])
@jwt_required()
def get_summary():
	try:
		# returns total amount of paid transactions, total number, unpaid transactions
		start_date = request.args.get('start_date')
		end_date = request.args.get('end_date')
		search = request.args.get('search')
		
		result = TransactionsModel.get_summary_stats(start_date=start_date, end_date=end_date, search=search)
		return jsonify(result), 200
	except Exception as e:
		return jsonify({'error': str(e)}), 500
