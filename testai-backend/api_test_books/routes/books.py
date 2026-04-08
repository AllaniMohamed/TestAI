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


def validate_book_data(data, partial=False):
    """
    partial=False for POST (required fields enforced)
    partial=True for PUT (only validate provided fields)
    """
    if not data or not isinstance(data, dict):
        api.abort(400, "Request body must be a valid JSON object")

    allowed_fields = {
        'title',
        'isbn',
        'author_id',
        'publication_year',
        'category',
        'pages',
        'language',
        'available_copies',
        'total_copies',
        'description'
    }

    # Reject unknown fields (very useful for automated testing)
    unknown_fields = set(data.keys()) - allowed_fields
    if unknown_fields:
        api.abort(400, f"Unknown field(s): {', '.join(sorted(unknown_fields))}")

    required_fields = {'title', 'isbn', 'author_id'}

    if not partial:
        missing = [field for field in required_fields if field not in data]
        if missing:
            api.abort(400, f"Missing required field(s): {', '.join(missing)}")

    string_fields = ['title', 'isbn', 'category', 'language', 'description']
    integer_fields = ['author_id', 'publication_year', 'pages', 'available_copies', 'total_copies']

    # Strict string checks
    for field in string_fields:
        if field in data and data[field] is not None:
            if not isinstance(data[field], str):
                api.abort(400, f"'{field}' must be a string")

    # Strict integer checks (bool must be rejected too because bool is subclass of int in Python)
    for field in integer_fields:
        if field in data and data[field] is not None:
            if type(data[field]) is not int:
                api.abort(400, f"'{field}' must be an integer")

    # ISBN strict validation
    if 'isbn' in data and data['isbn'] is not None:
        isbn = data['isbn']
        if len(isbn) != 13 or not isbn.isdigit():
            api.abort(400, "'isbn' must be a string of exactly 13 digits")

    # Optional business rules
    if 'publication_year' in data and data['publication_year'] is not None:
        if data['publication_year'] < 0:
            api.abort(400, "'publication_year' must be >= 0")

    if 'pages' in data and data['pages'] is not None:
        if data['pages'] <= 0:
            api.abort(400, "'pages' must be > 0")

    if 'available_copies' in data and data['available_copies'] is not None:
        if data['available_copies'] < 0:
            api.abort(400, "'available_copies' must be >= 0")

    if 'total_copies' in data and data['total_copies'] is not None:
        if data['total_copies'] < 0:
            api.abort(400, "'total_copies' must be >= 0")

    # Cross-field rule
    available = data.get('available_copies')
    total = data.get('total_copies')
    if available is not None and total is not None:
        if available > total:
            api.abort(400, "'available_copies' cannot be greater than 'total_copies'")


def parse_int_query_param(param_name):
    value = request.args.get(param_name)
    if value is None:
        return None

    # reject booleans and non-integer strings explicitly
    if not value.isdigit():
        api.abort(400, f"Query parameter '{param_name}' must be a positive integer")

    return int(value)


def parse_available_query_param():
    value = request.args.get('available')
    if value is None:
        return None

    if value not in ('true', 'false'):
        api.abort(400, "Query parameter 'available' must be 'true' or 'false'")

    return value == 'true'


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

        category = request.args.get('category')
        author_id = parse_int_query_param('author_id')
        available = parse_available_query_param()

        if category is not None:
            query = query.filter_by(category=category)

        if author_id is not None:
            query = query.filter_by(author_id=author_id)

        if available is True:
            query = query.filter(Book.available_copies > 0)
        elif available is False:
            query = query.filter(Book.available_copies <= 0)

        books = query.all()
        return [book.to_dict() for book in books]

    @api.doc('create_book')
    @api.expect(book_input, validate=True)
    @api.marshal_with(book_model, code=201)
    def post(self):
        """Créer un nouveau livre"""
        data = request.json

        validate_book_data(data, partial=False)

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

        # Cross-field validation after defaults applied
        if book.available_copies > book.total_copies:
            api.abort(400, "'available_copies' cannot be greater than 'total_copies'")

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
    @api.expect(book_input, validate=True)
    @api.marshal_with(book_model)
    def put(self, id):
        """Mettre à jour un livre"""
        book = Book.query.get_or_404(id)
        data = request.json

        validate_book_data(data, partial=True)

        # If ISBN is being updated, check uniqueness
        if 'isbn' in data:
            existing = Book.query.filter_by(isbn=data['isbn']).first()
            if existing and existing.id != book.id:
                api.abort(400, 'ISBN déjà existant')

        if 'title' in data:
            book.title = data['title']
        if 'isbn' in data:
            book.isbn = data['isbn']
        if 'author_id' in data:
            book.author_id = data['author_id']
        if 'publication_year' in data:
            book.publication_year = data['publication_year']
        if 'category' in data:
            book.category = data['category']
        if 'pages' in data:
            book.pages = data['pages']
        if 'language' in data:
            book.language = data['language']
        if 'available_copies' in data:
            book.available_copies = data['available_copies']
        if 'total_copies' in data:
            book.total_copies = data['total_copies']
        if 'description' in data:
            book.description = data['description']

        # Final cross-field check after update
        if book.available_copies > book.total_copies:
            api.abort(400, "'available_copies' cannot be greater than 'total_copies'")

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

        if not isinstance(query, str):
            api.abort(400, "Query parameter 'q' must be a string")

        books = Book.query.filter(
            (Book.title.ilike(f'%{query}%')) |
            (Book.isbn.ilike(f'%{query}%'))
        ).all()

        return [book.to_dict() for book in books]