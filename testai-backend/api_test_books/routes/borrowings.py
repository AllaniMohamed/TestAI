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

@api.route('/')
class BorrowingList(Resource):
    @api.doc('list_borrowings')
    @api.marshal_list_with(borrowing_model)
    @api.param('status', 'Filtrer par statut (BORROWED, RETURNED, OVERDUE)')
    def get(self):
        """Lister tous les emprunts"""
        query = Borrowing.query
        
        if request.args.get('status'):
            query = query.filter_by(status=request.args.get('status'))
        
        borrowings = query.all()
        return [b.to_dict() for b in borrowings]
    
    @api.doc('create_borrowing')
    @api.expect(borrowing_input)
    @api.marshal_with(borrowing_model, code=201)
    def post(self):
        """Créer un nouvel emprunt"""
        data = request.json
        
        # Vérifier disponibilité du livre
        book = Book.query.get_or_404(data['book_id'])
        
        if book.available_copies <= 0:
            api.abort(400, 'Livre non disponible')
        
        # Créer l'emprunt
        days = data.get('days', 14)
        borrowing = Borrowing(
            book_id=data['book_id'],
            borrower_name=data['borrower_name'],
            borrower_email=data['borrower_email'],
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
        
        # Marquer comme retourné
        borrowing.return_date = datetime.utcnow()
        borrowing.status = 'RETURNED'
        
        # Incrémenter les copies disponibles
        borrowing.book.available_copies += 1
        
        db.session.commit()
        return borrowing.to_dict()

@api.route('/overdue')
class BorrowingsOverdue(Resource):
    @api.doc('list_overdue')
    def get(self):
        """Lister tous les emprunts en retard"""
        now = datetime.utcnow()
        overdue = Borrowing.query.filter(
            Borrowing.due_date < now,
            Borrowing.status == 'BORROWED'
        ).all()
        
        return [b.to_dict() for b in overdue]