import os

class Config:
    """Configuration de base"""
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    
    # Base de données SQLite (équivalent H2 en-memory)
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'sqlite:///library.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Swagger UI
    RESTX_MASK_SWAGGER = False
    SWAGGER_UI_DOC_EXPANSION = 'list'
    
    # CORS
    CORS_ORIGINS = '*'

class DevelopmentConfig(Config):
    """Configuration développement"""
    DEBUG = True
    SQLALCHEMY_ECHO = True  # Afficher les requêtes SQL

class ProductionConfig(Config):
    """Configuration production"""
    DEBUG = False
    SQLALCHEMY_ECHO = False

# Configuration par défaut
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}