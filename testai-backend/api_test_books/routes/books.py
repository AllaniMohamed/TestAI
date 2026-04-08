from flask import request
from flask_restx import Namespace, Resource, fields
from models import db, Book

api = Namespace('books', description='Gestion des livres')

# Modèles Swagger
book_model = api.model('Book', {
    'id': fields.Integer(readonly=True),
    'title': fields.String(required=True, description='Titre du livre'),
    'isbn': fields.String(required=True, description='ISBN (13 chiffres)'),
    'author': fields.Raw(description='Informations de l\'auteur'),
    'publication_year': fields.Integer(description='Année de publication'),
    'category': fields.String(description='Catégorie'),
    'pages': fields.Integer(description='Nombre de pages'),
    'language': fields.String(description='Langue'),
    'available_copies': fields.Integer(description='Exemplaires disponibles'),
    'total_copies': fields.Integer(description='Exemplaires total'),
    'is_available': fields.Boolean(readonly=True),
    'description': fields.String(description='Description'),
    'created_at': fields.DateTime(readonly=True)
})

book_input = api.model('BookInput', {
    'title': fields.String(required=True, example='Les Misérables'),
    'isbn': fields.String(required=True, example='9782070409228'),
    'author_id': fields.Integer(required=True, example=1),
    'publication_year': fields.Integer(example=1862),
    'category': fields.String(example='Roman'),
    'pages': fields.Integer(example=1488),
    'language': fields.String(example='French'),
    'available_copies': fields.Integer(example=3),
    'total_copies': fields.Integer(example=5),
    'description': fields.String(example='Roman historique')
})

@api.route('/')
class BookList(Resource):
    @api.doc('list_books')
    @api.marshal_list_with(book_model)
    @api.param('category', 'Filtrer par catégorie')
    @api.param('author_id', 'Filtrer par auteur')
    @api.param('available', 'Livres disponibles uniquement (true/false)')
    def get(self):
        """Lister tous les livres avec filtres optionnels"""
        query = Book.query
        
        # Filtres
        if request.args.get('category'):
            query = query.filter_by(category=request.args.get('category'))
        
        if request.args.get('author_id'):
            query = query.filter_by(author_id=int(request.args.get('author_id')))
        
        if request.args.get('available') == 'true':
            query = query.filter(Book.available_copies > 0)
        
        books = query.all()
        return [book.to_dict() for book in books]
    
    @api.doc('create_book')
    @api.expect(book_input)
    @api.marshal_with(book_model, code=201)
    def post(self):
        """Créer un nouveau livre"""
        data = request.json
        
        # Vérifier ISBN unique
        if Book.query.filter_by(isbn=data['isbn']).first():
            api.abort(400, 'ISBN déjà existant')
        
        book = Book(
            title=data['title'],
            isbn=data['isbn'],
            author_id=data['author_id'],
            publication_year=data.get('publication_year'),
            category=data.get('category'),
            pages=data.get('pages'),
            language=data.get('language', 'French'),
            available_copies=data.get('available_copies', 1),
            total_copies=data.get('total_copies', 1),
            description=data.get('description')
        )
        
        db.session.add(book)
        db.session.commit()
        
        return book.to_dict(), 201

@api.route('/<int:id>')
@api.param('id', 'Identifiant du livre')
class BookResource(Resource):
    @api.doc('get_book')
    @api.marshal_with(book_model)
    def get(self, id):
        """Récupérer un livre par ID"""
        book = Book.query.get_or_404(id)
        return book.to_dict()
    
    @api.doc('update_book')
    @api.expect(book_input)
    @api.marshal_with(book_model)
    def put(self, id):
        """Mettre à jour un livre"""
        book = Book.query.get_or_404(id)
        data = request.json
        
        book.title = data.get('title', book.title)
        book.publication_year = data.get('publication_year', book.publication_year)
        book.category = data.get('category', book.category)
        book.pages = data.get('pages', book.pages)
        book.language = data.get('language', book.language)
        book.available_copies = data.get('available_copies', book.available_copies)
        book.total_copies = data.get('total_copies', book.total_copies)
        book.description = data.get('description', book.description)
        
        db.session.commit()
        return book.to_dict()
    
    @api.doc('delete_book')
    @api.response(204, 'Livre supprimé')
    def delete(self, id):
        """Supprimer un livre"""
        book = Book.query.get_or_404(id)
        db.session.delete(book)
        db.session.commit()
        return '', 204

@api.route('/search')
class BookSearch(Resource):
    @api.doc('search_books')
    @api.param('q', 'Terme de recherche (titre ou ISBN)')
    def get(self):
        """Rechercher des livres par titre ou ISBN"""
        query = request.args.get('q', '')
        books = Book.query.filter(
            (Book.title.ilike(f'%{query}%')) | 
            (Book.isbn.ilike(f'%{query}%'))
        ).all()
        
        return [book.to_dict() for book in books]