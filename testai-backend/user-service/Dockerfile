# ==========================================
# Dockerfile multi-stage pour User Service
# ==========================================

# Stage 1: Build
FROM maven:3.9-eclipse-temurin-17 AS build

WORKDIR /app

# Copier les fichiers Maven
COPY pom.xml .
COPY src ./src

# Compiler le projet (skip tests pour build plus rapide)
RUN mvn clean package -DskipTests

# Stage 2: Run
FROM eclipse-temurin:17-jre

WORKDIR /app

RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Créer un utilisateur non-root pour la sécurité
RUN groupadd -r spring && useradd -r -g spring spring
USER spring:spring

# Copier le JAR depuis le stage build
COPY --from=build /app/target/user-service.jar app.jar

# Exposer le port
EXPOSE 8081

# Variables d'environnement par défaut
ENV SPRING_PROFILES_ACTIVE=docker
ENV JAVA_OPTS="-Xmx512m -Xms256m"

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:8081/actuator/health || exit 1

# Point d'entrée
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]