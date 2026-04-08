from flask import request
from flask_restx import Namespace, Resource, fields
from models import db, Author
from datetime import datetime

api = Namespace('authors', description='Gestion des auteurs')

# Modèles Swagger
author_model = api.model('Author', {
    'id': fields.Integer(readonly=True, description='ID de l\'auteur'),
    'first_name': fields.String(required=True, description='Prénom'),
    'last_name': fields.String(required=True, description='Nom'),
    'birth_date': fields.Date(description='Date de naissance'),
    'nationality': fields.String(description='Nationalité'),
    'biography': fields.String(description='Biographie'),
    'books_count': fields.Integer(readonly=True, description='Nombre de livres'),
    'created_at': fields.DateTime(readonly=True)
})

author_input = api.model('AuthorInput', {
    'first_name': fields.String(required=True, example='Victor'),
    'last_name': fields.String(required=True, example='Hugo'),
    'birth_date': fields.Date(example='1802-02-26'),
    'nationality': fields.String(example='French'),
    'biography': fields.String(example='Écrivain français du XIXe siècle.')
})

def validate_author_data(data, partial=False):
    """
    partial=False for POST (required fields enforced)
    partial=True for PUT (only validate provided fields)
    """
    if not data:
        api.abort(400, "Request body must be a valid JSON object")

    required_fields = ['first_name', 'last_name']

    if not partial:
        for field in required_fields:
            if field not in data:
                api.abort(400, f"'{field}' is required")

    string_fields = ['first_name', 'last_name', 'nationality', 'biography']

    for field in string_fields:
        if field in data and data[field] is not None:
            if not isinstance(data[field], str):
                api.abort(400, f"'{field}' must be a string")

    if 'birth_date' in data and data['birth_date'] is not None:
        if not isinstance(data['birth_date'], str):
            api.abort(400, "'birth_date' must be a string in format YYYY-MM-DD")
        try:
            datetime.strptime(data['birth_date'], '%Y-%m-%d')
        except ValueError:
            api.abort(400, "'birth_date' must be in format YYYY-MM-DD")

@api.route('/')
class AuthorList(Resource):
    @api.doc('list_authors')
    @api.marshal_list_with(author_model)
    def get(self):
        """Lister tous les auteurs"""
        authors = Author.query.all()
        return [author.to_dict() for author in authors]
    
    @api.doc('create_author')
    @api.expect(author_input)
    @api.marshal_with(author_model, code=201)
    def post(self):
        """Créer un nouvel auteur"""
        data = request.json
        validate_author_data(data, partial=False)
        author = Author(
            first_name=data['first_name'],
            last_name=data['last_name'],
            birth_date=datetime.strptime(data['birth_date'], '%Y-%m-%d').date() if data.get('birth_date') else None,
            nationality=data.get('nationality'),
            biography=data.get('biography')
        )
        
        db.session.add(author)
        db.session.commit()
        
        return author.to_dict(), 201

@api.route('/<int:id>')
@api.param('id', 'Identifiant de l\'auteur')
class AuthorResource(Resource):
    @api.doc('get_author')
    @api.marshal_with(author_model)
    def get(self, id):
        """Récupérer un auteur par ID"""
        author = Author.query.get_or_404(id)
        return author.to_dict()
    
    @api.doc('update_author')
    @api.expect(author_input)
    @api.marshal_with(author_model)
    def put(self, id):
        """Mettre à jour un auteur"""
        author = Author.query.get_or_404(id)
        data = request.json
        validate_author_data(data, partial=True)
        author.first_name = data.get('first_name', author.first_name)
        author.last_name = data.get('last_name', author.last_name)
        
        if data.get('birth_date'):
            author.birth_date = datetime.strptime(data['birth_date'], '%Y-%m-%d').date()
        
        author.nationality = data.get('nationality', author.nationality)
        author.biography = data.get('biography', author.biography)
        
        db.session.commit()
        return author.to_dict()
    
    @api.doc('delete_author')
    @api.response(204, 'Auteur supprimé')
    def delete(self, id):
        """Supprimer un auteur"""
        author = Author.query.get_or_404(id)
        db.session.delete(author)
        db.session.commit()
        return '', 204

@api.route('/<int:id>/books')
@api.param('id', 'Identifiant de l\'auteur')
class AuthorBooks(Resource):
    @api.doc('get_author_books')
    def get(self, id):
        """Récupérer tous les livres d'un auteur"""
        author = Author.query.get_or_404(id)
        return {
            'author': author.to_dict(),
            'books': [book.to_dict() for book in author.books]
        }