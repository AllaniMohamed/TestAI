from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

# ==========================================
# MODÈLE AUTHOR
# ==========================================
class Author(db.Model):
    __tablename__ = 'authors'
    
    id = db.Column(db.Integer, primary_key=True)
    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    birth_date = db.Column(db.Date, nullable=True)
    nationality = db.Column(db.String(100), nullable=True)
    biography = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relation avec Books
    books = db.relationship('Book', back_populates='author', cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'full_name': f"{self.first_name} {self.last_name}",
            'birth_date': self.birth_date.isoformat() if self.birth_date else None,
            'nationality': self.nationality,
            'biography': self.biography,
            'books_count': len(self.books),
            'created_at': self.created_at.isoformat()
        }

# ==========================================
# MODÈLE BOOK
# ==========================================
class Book(db.Model):
    __tablename__ = 'books'
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    isbn = db.Column(db.String(13), unique=True, nullable=False)
    author_id = db.Column(db.Integer, db.ForeignKey('authors.id'), nullable=False)
    publication_year = db.Column(db.Integer, nullable=True)
    category = db.Column(db.String(100), nullable=True)
    pages = db.Column(db.Integer, nullable=True)
    language = db.Column(db.String(50), default='French')
    available_copies = db.Column(db.Integer, default=1)
    total_copies = db.Column(db.Integer, default=1)
    description = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relations
    author = db.relationship('Author', back_populates='books')
    borrowings = db.relationship('Borrowing', back_populates='book', cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'isbn': self.isbn,
            'author': {
                'id': self.author.id,
                'name': f"{self.author.first_name} {self.author.last_name}"
            } if self.author else None,
            'publication_year': self.publication_year,
            'category': self.category,
            'pages': self.pages,
            'language': self.language,
            'available_copies': self.available_copies,
            'total_copies': self.total_copies,
            'is_available': self.available_copies > 0,
            'description': self.description,
            'created_at': self.created_at.isoformat()
        }

# ==========================================
# MODÈLE BORROWING
# ==========================================
class Borrowing(db.Model):
    __tablename__ = 'borrowings'
    
    id = db.Column(db.Integer, primary_key=True)
    book_id = db.Column(db.Integer, db.ForeignKey('books.id'), nullable=False)
    borrower_name = db.Column(db.String(100), nullable=False)
    borrower_email = db.Column(db.String(100), nullable=False)
    borrow_date = db.Column(db.DateTime, default=datetime.utcnow)
    due_date = db.Column(db.DateTime, nullable=False)
    return_date = db.Column(db.DateTime, nullable=True)
    status = db.Column(db.String(20), default='BORROWED')  # BORROWED, RETURNED, OVERDUE
    
    # Relation
    book = db.relationship('Book', back_populates='borrowings')
    
    def to_dict(self):
        return {
            'id': self.id,
            'book': {
                'id': self.book.id,
                'title': self.book.title,
                'isbn': self.book.isbn
            } if self.book else None,
            'borrower_name': self.borrower_name,
            'borrower_email': self.borrower_email,
            'borrow_date': self.borrow_date.isoformat(),
            'due_date': self.due_date.isoformat(),
            'return_date': self.return_date.isoformat() if self.return_date else None,
            'status': self.status,
            'is_overdue': datetime.utcnow() > self.due_date and self.status == 'BORROWED'
        }