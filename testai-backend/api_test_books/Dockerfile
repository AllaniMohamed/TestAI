# Utiliser une image Python officielle légère
FROM python:3.11-slim

# Définir le répertoire de travail dans le conteneur
WORKDIR /app

# Copier les fichiers de dépendances en premier (meilleur caching)
COPY requirements.txt .

# Installer les dépendances
RUN pip install --no-cache-dir -r requirements.txt

# Copier tout le reste du projet
COPY . .

# Exposer le port utilisé par Flask
EXPOSE 5001

# Variable d'environnement pour désactiver le buffering des logs
ENV PYTHONUNBUFFERED=1

# Lancer l'application
CMD ["python", "app.py"]