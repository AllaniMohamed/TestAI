from flask import request
from flask_restx import Namespace, Resource, fields
from models import db, Borrowing, Book
from datetime import datetime, timedelta

api = Namespace('borrowings', description='Gestion des emprunts')

# Modèles Swagger
borrowing_model = api.model('Borrowing', {
    'id': fields.Integer(readonly=True),
    'book': fields.Raw(description='Informations du livre'),
    'borrower_name': fields.String(required=True),
    'borrower_email': fields.String(required=True),
    'borrow_date': fields.DateTime(readonly=True),
    'due_date': fields.DateTime(required=True),
    'return_date': fields.DateTime(),
    'status': fields.String(description='BORROWED, RETURNED, OVERDUE'),
    'is_overdue': fields.Boolean(readonly=True)
})

borrowing_input = api.model('BorrowingInput', {
    'book_id': fields.Integer(required=True, example=1),
    'borrower_name': fields.String(required=True, example='Jean Dupont'),
    'borrower_email': fields.String(required=True, example='jean.dupont@email.com'),
    'days': fields.Integer(description='Nombre de jours d\'emprunt', example=14)
})

ALLOWED_STATUSES = {'BORROWED', 'RETURNED', 'OVERDUE'}


def validate_email(email):
    """
    Simple strict-ish email validation for dummy service.
    Enough for deterministic testing without external libs.
    """
    if not isinstance(email, str):
        return False

    if email.count('@') != 1:
        return False

    local, domain = email.split('@')

    if not local or not domain:
        return False

    if '.' not in domain:
        return False

    if domain.startswith('.') or domain.endswith('.'):
        return False

    return True


def validate_borrowing_data(data):
    """
    POST only, because this resource only creates borrowings.
    """
    if not data or not isinstance(data, dict):
        api.abort(400, "Request body must be a valid JSON object")

    allowed_fields = {'book_id', 'borrower_name', 'borrower_email', 'days'}

    unknown_fields = set(data.keys()) - allowed_fields
    if unknown_fields:
        api.abort(400, f"Unknown field(s): {', '.join(sorted(unknown_fields))}")

    required_fields = {'book_id', 'borrower_name', 'borrower_email'}
    missing = [field for field in required_fields if field not in data]
    if missing:
        api.abort(400, f"Missing required field(s): {', '.join(missing)}")

    # Strict integer checks (reject bool too)
    if type(data['book_id']) is not int:
        api.abort(400, "'book_id' must be an integer")

    if 'days' in data and data['days'] is not None:
        if type(data['days']) is not int:
            api.abort(400, "'days' must be an integer")

    # Strict string checks
    if not isinstance(data['borrower_name'], str):
        api.abort(400, "'borrower_name' must be a string")

    if not isinstance(data['borrower_email'], str):
        api.abort(400, "'borrower_email' must be a string")

    # Business rules
    if data['book_id'] <= 0:
        api.abort(400, "'book_id' must be > 0")

    if 'days' in data and data['days'] is not None:
        if data['days'] <= 0:
            api.abort(400, "'days' must be > 0")

    if not data['borrower_name'].strip():
        api.abort(400, "'borrower_name' cannot be empty")

    if not validate_email(data['borrower_email']):
        api.abort(400, "'borrower_email' must be a valid email address")


def parse_status_query_param():
    value = request.args.get('status')
    if value is None:
        return None

    if value not in ALLOWED_STATUSES:
        api.abort(400, "Query parameter 'status' must be one of: BORROWED, RETURNED, OVERDUE")

    return value


@api.route('/')
class BorrowingList(Resource):
    @api.doc('list_borrowings')
    @api.marshal_list_with(borrowing_model)
    @api.param('status', 'Filtrer par statut (BORROWED, RETURNED, OVERDUE)')
    def get(self):
        """Lister tous les emprunts"""
        query = Borrowing.query

        status = parse_status_query_param()
        if status is not None:
            query = query.filter_by(status=status)

        borrowings = query.all()
        return [b.to_dict() for b in borrowings]

    @api.doc('create_borrowing')
    @api.expect(borrowing_input, validate=True)
    @api.marshal_with(borrowing_model, code=201)
    def post(self):
        """Créer un nouvel emprunt"""
        data = request.json

        validate_borrowing_data(data)

        # Vérifier disponibilité du livre
        book = Book.query.get_or_404(data['book_id'])

        if book.available_copies <= 0:
            api.abort(400, 'Livre non disponible')

        # Créer l'emprunt
        days = data.get('days', 14)

        borrowing = Borrowing(
            book_id=data['book_id'],
            borrower_name=data['borrower_name'].strip(),
            borrower_email=data['borrower_email'].strip(),
            due_date=datetime.utcnow() + timedelta(days=days),
            status='BORROWED'
        )

        # Décrémenter les copies disponibles
        book.available_copies -= 1

        db.session.add(borrowing)
        db.session.commit()

        return borrowing.to_dict(), 201


@api.route('/<int:id>/return')
@api.param('id', 'Identifiant de l\'emprunt')
class BorrowingReturn(Resource):
    @api.doc('return_book')
    @api.marshal_with(borrowing_model)
    def post(self, id):
        """Retourner un livre emprunté"""
        borrowing = Borrowing.query.get_or_404(id)

        if borrowing.status == 'RETURNED':
            api.abort(400, 'Livre déjà retourné')

        # Optional: if you want stricter state handling
        if borrowing.status not in ('BORROWED', 'OVERDUE'):
            api.abort(400, f"Cannot return borrowing with status '{borrowing.status}'")

        # Marquer comme retourné
        borrowing.return_date = datetime.utcnow()
        borrowing.status = 'RETURNED'

        # Incrémenter les copies disponibles
        borrowing.book.available_copies += 1

        # Optional guard if you want to prevent exceeding total copies
        if borrowing.book.available_copies > borrowing.book.total_copies:
            api.abort(400, "Book available copies cannot exceed total copies")

        db.session.commit()
        return borrowing.to_dict()


@api.route('/overdue')
class BorrowingsOverdue(Resource):
    @api.doc('list_overdue')
    @api.marshal_list_with(borrowing_model)
    def get(self):
        """Lister tous les emprunts en retard"""
        now = datetime.utcnow()
        overdue = Borrowing.query.filter(
            Borrowing.due_date < now,
            Borrowing.status == 'BORROWED'
        ).all()

        return [b.to_dict() for b in overdue]