from flask import Flask,request   
from flask_cors import CORS
from flask_restx import Api
from config import config
from models import db
import os

def create_app(config_name='development'):
    """Factory pour créer l'application Flask"""
    app = Flask(__name__)
    app.config.from_object(config[config_name])
    
    # Initialiser extensions
    db.init_app(app)
    CORS(app)
    
    # Configurer Swagger UI
    api = Api(
        app,
        version='1.0',
        title='Library Management API',
        description='📚 API REST complète pour gérer une bibliothèque avec Swagger UI',
        doc='/swagger',
        prefix='/api'
    )
    
    # Enregistrer les namespaces (routes)
    from routes.authors import api as authors_ns
    from routes.books import api as books_ns
    from routes.borrowings import api as borrowings_ns
    
    api.add_namespace(authors_ns, path='/authors')
    api.add_namespace(books_ns, path='/books')
    api.add_namespace(borrowings_ns, path='/borrowings')
    
    # Créer les tables et charger des données de test
    with app.app_context():
        db.create_all()
        init_sample_data()
    
    @app.route('/')
    def index():
        return {
            'message': 'Welcome to Library Management API!',
            'swagger_ui': f"{request.host_url}swagger",
            'version': '1.0'
        }
    
    return app

def init_sample_data():
    """Charger des données de test"""
    from models import Author, Book
    from datetime import date
    
    # Vérifier si déjà des données
    if Author.query.first():
        return
    
    print("📚 Chargement des données de test...")
    
    # Créer des auteurs
    author1 = Author(
        first_name='Victor',
        last_name='Hugo',
        birth_date=date(1802, 2, 26),
        nationality='French',
        biography='Écrivain, poète et dramaturge français du XIXe siècle.'
    )
    
    author2 = Author(
        first_name='J.K.',
        last_name='Rowling',
        birth_date=date(1965, 7, 31),
        nationality='British',
        biography='Auteure britannique célèbre pour la série Harry Potter.'
    )
    
    author3 = Author(
        first_name='Antoine',
        last_name='de Saint-Exupéry',
        birth_date=date(1900, 6, 29),
        nationality='French',
        biography='Écrivain, poète et aviateur français.'
    )
    
    db.session.add_all([author1, author2, author3])
    db.session.commit()
    
    # Créer des livres
    book1 = Book(
        title='Les Misérables',
        isbn='9782070409228',
        author_id=author1.id,
        publication_year=1862,
        category='Roman',
        pages=1488,
        language='French',
        available_copies=3,
        total_copies=5,
        description='Roman historique et social de Victor Hugo.'
    )
    
    book2 = Book(
        title='Harry Potter à l\'école des sorciers',
        isbn='9782070584628',
        author_id=author2.id,
        publication_year=1997,
        category='Fantasy',
        pages=320,
        language='French',
        available_copies=5,
        total_copies=5,
        description='Premier tome de la saga Harry Potter.'
    )
    
    book3 = Book(
        title='Le Petit Prince',
        isbn='9782070612758',
        author_id=author3.id,
        publication_year=1943,
        category='Conte',
        pages=96,
        language='French',
        available_copies=2,
        total_copies=3,
        description='Conte philosophique et poétique.'
    )
    
    db.session.add_all([book1, book2, book3])
    db.session.commit()
    
    print("✅ Données de test chargées !")

if __name__ == '__main__':
    app = create_app('development')
    app.run(host='0.0.0.0', port=5001, debug=True)