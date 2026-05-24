 TESTAI - README COMPLET

Plateforme intelligente d'automatisation des tests d'APIs REST


📋 TABLE DES MATIÈRES

Vue d'ensemble
Architecture microservices
Services détaillés
Technologies utilisées
Structure du projet
Communication inter-services
Bases de données
Endpoints API
Docker & Déploiement
Guide de développement
Fonctionnalités principales
Authentification & Sécurité
Génération de rapports


🎯 VUE D'ENSEMBLE
Qu'est-ce que TestAI ?
TestAI est une plateforme SaaS innovante qui automatise et optimise les tests d'APIs REST en combinant :

✅ Scan automatique de documentation Swagger/OpenAPI
🤖 Intelligence artificielle interne via adaptateur entraîné sur le modèle Qwen2.5-1.5B-Instruct pour générer des données de test réalistes
🚀 Exécution automatisée des tests avec validation
📊 Rapports détaillés avec métriques de qualité
👥 Collaboration multi-rôles (Manager/Guest/Admin)
🔄 Historique complet de toutes les exécutions

Positionnement
TestAI se positionne au niveau des tests d'intégration dans la pyramide des tests, en ciblant spécifiquement les APIs REST pour combler le manque d'automatisation intelligente sur cette couche critique.
Gains mesurés

95% de réduction du temps de génération de tests
600% d'augmentation de la couverture (6 tests/endpoint vs 1)
70% de gain de temps global sur les tests d'APIs


🏗️ ARCHITECTURE MICROSERVICES
Architecture globale
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                         │
│                    http://localhost:3000                         │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    API GATEWAY (Port 8888)                       │
│              - Routage centralisé                                │
│              - CORS                                              │
│              - Rate limiting                                     │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   EUREKA SERVER (Port 8761)                      │
│              - Service Discovery                                 │
│              - Load Balancing                                    │
└────────────────────────────┬────────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│ USER-SERVICE │   │PROJECT-SERVICE│   │ENDPOINT-SERVICE│ │ADMIN-SERVICE │
│   (8081)     │   │    (8082)     │   │    (8083)     │ │    (8087)    │
└──────────────┘   └──────────────┘   └──────────────┘   └──────────────┘
        │                    │                    │                    │
        └────────────────────┼────────────────────┴────────────────────┘
                             │
                 ┌───────────┴───────────┐
                 │                       │
                 ▼                       ▼
         ┌──────────────┐        ┌────────────────┐
         │NOTIFICATION- │        │ TEST-SERVICE   │
         │ SERVICE      │        │   (8085)       │
         │   (8089)     │        └────────────────┘
         └──────────────┘               │
                             ┌─────────┴─────────┐
                             │                   │
                             ▼                   ▼
                      ┌──────────────┐     ┌──────────────┐
                      │EXECUTION-    │     │AI-SERVICE /  │
                      │ SERVICE      │     │generate-test-│
                      │  (8086)      │     │ service (8084)│
                      └──────────────┘     └──────────────┘
Principe de l'architecture
Architecture microservices modulaire où :

Chaque service a une responsabilité unique (Single Responsibility Principle)
Les services communiquent via REST API et OpenFeign
API Gateway : point d'entrée unique pour le frontend
Eureka : découverte automatique des services (pas d'URL hardcodées)
Docker Compose : orchestration de tous les services


🔧 SERVICES DÉTAILLÉS
1. EUREKA-SERVER (Port 8761)
Rôle : Service Registry (Registre de services)
Responsabilités :

Enregistrer tous les microservices au démarrage
Maintenir une liste dynamique des instances disponibles
Fournir la découverte de services (Service Discovery)
Permettre le load balancing côté client

Technologies :

Spring Cloud Netflix Eureka Server
Spring Boot 3.x

Configuration clé :
yamleureka:
  client:
    register-with-eureka: false  # Eureka ne s'enregistre pas lui-même
    fetch-registry: false
  server:
    enable-self-preservation: false
URL d'accès : http://localhost:8761
Dashboard : Interface web montrant tous les services enregistrés

2. API-GATEWAY (Port 8888)
Rôle : Point d'entrée unique pour toutes les requêtes
Responsabilités :

Router les requêtes vers les bons microservices
Gérer CORS pour permettre les appels depuis le frontend
Appliquer rate limiting pour éviter les abus
Centraliser la configuration de sécurité

Technologies :

Spring Cloud Gateway
Spring Boot 3.x

Routes configurées :
yamlspring:
  cloud:
    gateway:
      routes:
        - id: user-service
          uri: lb://user-service
          predicates:
            - Path=/user-service/**
        
        - id: project-service
          uri: lb://project-service
          predicates:
            - Path=/project-service/**
        
        - id: endpoint-service
          uri: lb://endpoint-service
          predicates:
            - Path=/endpoint-service/**
        
        - id: test-service
          uri: lb://test-service
          predicates:
            - Path=/test-service/**

        - id: execution-service
          uri: lb://execution-service
          predicates:
            - Path=/execution-service/**

        - id: ai-service
          uri: http://ai-service:8084
          predicates:
            - Path=/ai-service/**

        - id: admin-service
          uri: lb://ADMIN-SERVICE
          predicates:
            - Path=/admin-service/**

        - id: notification-service
          uri: lb://notification-service
          predicates:
            - Path=/notification-service/**
Exemple d'appel :
bash# Frontend appelle
GET http://localhost:8888/project-service/api/projects

# Gateway route vers
GET http://project-service:8082/api/projects

3. USER-SERVICE (Port 8081)
Rôle : Gestion des utilisateurs et authentification
Responsabilités :

Inscription et connexion des utilisateurs
Vérification email/téléphone (SMS via Twilio)
Gestion des profils utilisateurs
Upload d'avatars
Gestion des rôles (MANAGER, GUEST, ADMIN)

Base de données : PostgreSQL (testai_users)
Entités principales :
javaUser {
    UUID id
    String name
    String email (unique)
    String phoneNumber (unique)
    String password (hashé BCrypt)
    Role role (MANAGER, GUEST, ADMIN)
    Boolean isActive
    Boolean emailVerified
    Boolean phoneVerified
    String avatarUrl
    Instant createdAt
}
Endpoints clés :
POST   /api/users/register           - Inscription
POST   /api/users/login              - Connexion (retourne JWT)
POST   /api/users/verify-email       - Vérifier email
POST   /api/users/verify-phone       - Vérifier téléphone
POST   /api/users/{id}/avatar        - Upload avatar
GET    /api/users/{id}               - Récupérer utilisateur
GET    /api/users/email/{email}      - Trouver par email
PUT    /api/users/{id}               - Modifier profil
Intégration Keycloak : Utilise Keycloak pour la gestion des tokens JWT
Communication sortante : Aucune (service de base)

4. PROJECT-SERVICE (Port 8082)
Rôle : Gestion des projets (APIs à tester)
Responsabilités :

CRUD des projets
Stockage des credentials d'authentification API (Basic, API Key, Bearer)
Scan automatique de documentation Swagger
Gestion des partages de projets (SharedAccess)
Suppression en cascade (projet → endpoints → tests → exécutions)

Base de données : PostgreSQL (testai_projects)
Entités principales :
javaProject {
    UUID id
    UUID userId (propriétaire)
    String name
    String description
    String projectUrl (URL de l'API à tester)
    DocsMode docMode (SWAGGER, MANUAL)
    String docUrl (URL Swagger ou fichier)
    AuthType authType (NONE, BASIC, APIKEY, BEARER)
    ApiCredentials credentials (OneToOne)
    Instant createdAt
}

ApiCredentials {
    UUID id
    UUID projectId (OneToOne avec Project)
    // BASIC
    String basicUsername
    String basicPassword
    // APIKEY
    String apiKey
    String apiKeyHeader
    ApiKeyLocation apiKeyLocation (HEADER, QUERY_PARAM)
    // BEARER
    String bearerToken
    Boolean encrypted
}

SharedAccess {
    UUID id
    UUID projectId
    String managerEmail (qui partage)
    String developerEmail (invité)
    UUID developerUserId (null si pas encore inscrit)
    AccessLevel accessLevel (READ_ONLY, READ_WRITE)
    AccessStatus status (PENDING, ACTIVE, REVOKED)
    Instant sharedAt
    Instant acceptedAt
}
Endpoints clés :
POST   /api/projects/add                    - Créer projet
GET    /api/projects/{id}                   - Récupérer projet
PUT    /api/projects/{id}                   - Modifier projet
DELETE /api/projects/{id}                   - Supprimer en cascade
GET    /api/projects/user/{userId}          - Projets d'un user
POST   /api/projects/{id}/scan-endpoints    - Scanner Swagger
GET    /api/projects/{id}/endpoints         - Lister endpoints
POST   /api/projects/{id}/share             - Partager projet
GET    /api/projects/{id}/shares            - Lister partages
DELETE /api/projects/shares/{id}            - Révoquer partage
GET    /api/projects/shared-with-me         - Projets partagés avec moi
Communication sortante :

user-service : Vérifier existence utilisateur
endpoint-service : Scanner endpoints, récupérer/supprimer endpoints
test-service : Supprimer tests lors de suppression projet
execution-service : Supprimer exécutions lors de suppression projet

Feign Clients :
java@FeignClient(name = "user-service")
UserServiceClient

@FeignClient(name = "endpoint-service")
EndpointServiceClient

@FeignClient(name = "test-service")
TestServiceClient

@FeignClient(name = "execution-service")
ExecutionServiceClient

5. ENDPOINT-SERVICE (Port 8083)
Rôle : Gestion des endpoints d'une API
Responsabilités :

Scanner documentation Swagger/OpenAPI
Stocker les endpoints détectés
Créer endpoints manuellement
CRUD endpoints
Fournir schémas de requête/réponse pour génération de tests

Base de données : PostgreSQL (testai_endpoints)
Entités principales :
javaEndpoint {
    UUID id
    UUID projectId
    HttpMethod method (GET, POST, PUT, DELETE, PATCH)
    String path (ex: "/api/users/{id}")
    String description
    DiscoveryType discoveryType (SWAGGER, MANUAL)
    String tags (catégories, séparées par virgules)
    String parameters (JSON array des params)
    String requestBody (JSON Schema)
    String responseBody (JSON Schema)
    String statusCodes (ex: "200,201,400")
    Boolean requiresAuth
    Instant createdAt
    Instant updatedAt
}
Endpoints clés :
POST   /api/endpoints/scan                  - Scanner Swagger
GET    /api/endpoints/project/{projectId}   - Lister endpoints projet
GET    /api/endpoints/{id}                  - Récupérer endpoint
POST   /api/endpoints                       - Créer endpoint manuel
PUT    /api/endpoints/{id}                  - Modifier endpoint
DELETE /api/endpoints/{id}                  - Supprimer endpoint
DELETE /api/endpoints/project/{projectId}   - Supprimer tous endpoints projet
GET    /api/endpoints/project/{projectId}/count - Compter endpoints
Scanner Swagger :
Utilise Swagger Parser pour :

Télécharger fichier Swagger/OpenAPI (JSON ou YAML)
Parser la spécification
Extraire tous les endpoints (paths)
Pour chaque endpoint :

Méthode HTTP
Path avec paramètres
Description
Paramètres (query, path, header, body)
Schéma de requête (requestBody)
Schéma de réponse (responses)
Codes de statut attendus
Sécurité requise


Stocker en base (éviter doublons)

Communication sortante :

test-service : Supprimer tests lors de suppression endpoint

Feign Clients :
java@FeignClient(name = "test-service")
TestServiceClient

6. AI-SERVICE / generate-test-service (Port 8084) - Flask
Rôle : Génération intelligente de tests via IA interne
Responsabilités :

Générer 6 types de tests pour chaque endpoint
Créer des payloads réalistes et contextuels (pas aléatoires)
Utiliser l'IA pour comprendre le domaine métier

Technologies :

Flask (Python)
Adaptateur entraîné sur le modèle Qwen2.5-1.5B-Instruct
Pas de base de données (stateless)

Types de tests générés :

POSITIVE (Happy Path)

Données valides et complètes
Attend code 200/201


WRONG_TYPE (Mauvais types)

Types incorrects (string au lieu d'integer)
Attend code 400


MISSING_FIELDS (Champs manquants)

Omet champs requis
Attend code 400


VALIDATION (Validation)

Valeurs hors limites, formats incorrects
Attend code 400


BOUNDARY (Cas limites)

Valeurs min/max
Attend code 200 ou 400 selon contraintes


AUTH (Sécurité)

Tests sans authentification
Attend code 401



Endpoint principal :
POST /generate-tests
Body: [
  {
    "projectId": "uuid",
    "endpointId": "uuid",
    "method": "POST",
    "path": "/api/users",
    "requestBodySchema": "{...}",
    "responseBodySchema": "{...}",
    "requiresAuth": true
  }
]

Response: [
  {
    "projectId": "uuid",
    "endpointId": "uuid",
    "endpoint": "POST /api/users",
    "tests": [
      {
        "category": "POSITIVE",
        "response": {
          "name": "Create user - Valid data",
          "headers": {},
          "payload": {
            "firstName": "Sophie",
            "lastName": "Martin",
            "email": "sophie.martin@example.com",
            "age": 32
          },
          "pathParams": {},
          "queryParams": {},
          "requiresAuth": false,
          "expectedStatus": 201
        }
      },
      {
        "category": "WRONG_TYPE",
        "response": {
          "name": "Create user - Wrong type for age",
          "payload": {
            "firstName": "Jean",
            "lastName": "Dupont",
            "email": "jean@example.com",
            "age": "invalid"
          },
          "expectedStatus": 400
        }
      },
      // ... 4 autres tests
    ]
  }
]

Communication sortante : Aucune (appelé par test-service)

7. TEST-SERVICE (Port 8084)
Rôle : Intermédiaire entre endpoint-service et ai-service
Responsabilités :

Récupérer endpoints depuis endpoint-service
Appeler ai-service pour générer tests
Stocker les 6 tests générés en base
CRUD des tests
Régénération de tests

Base de données : PostgreSQL (testai_tests)
Entités principales :
javaTest {
    UUID id
    UUID projectId
    UUID endpointId
    String endpointPath
    
    // 6 tests stockés en JSONB
    Map<String, Object> positive
    Map<String, Object> wrongType
    Map<String, Object> missingFields
    Map<String, Object> validation
    Map<String, Object> boundary
    Map<String, Object> auth
}
Structure d'un test :
json{
  "category": "POSITIVE",
  "response": {
    "name": "Create user - Valid data",
    "headers": {"Authorization": "Bearer token"},
    "payload": {"firstName": "Sophie", "lastName": "Martin"},
    "pathParams": {},
    "queryParams": {},
    "requiresAuth": false,
    "expectedStatus": 201
  }
}
Endpoints clés :
POST   /api/tests/generate            - Générer tests (appelle AI)
GET    /api/tests                     - Lister tous tests
GET    /api/tests/{projectId}         - Tests d'un projet
GET    /api/tests/{projectId}/{endpointId} - Tests d'un endpoint
PUT    /api/tests/update              - Modifier tests
DELETE /api/tests/{projectId}         - Supprimer tests projet
DELETE /api/tests/{projectId}/{endpointId} - Supprimer tests endpoint
Flux de génération :
1. Frontend → POST /api/tests/generate avec liste d'endpoints
2. test-service → Appelle ai-service (Flask) avec schémas
3. ai-service → Model Local génère 6 tests par endpoint
4. ai-service → Retourne JSON avec tests
5. test-service → Parse et stocke en DB
6. test-service → Retourne résumé au frontend
Communication sortante :

ai-service (Flask) : Générer tests via IA

Feign Clients :
java@FeignClient(name = "ai-service", url = "http://localhost:8084")
GenerateTestClient

8. EXECUTION-SERVICE (Port 8085)
Rôle : Exécution des tests et gestion de l'historique
Responsabilités :

Exécuter un seul test (TestExecutionService)
Exécuter tous les tests d'un projet en batch (ProjectExecutionService)
Stocker résultats d'exécution
Gérer historique des exécutions
Générer rapports PDF

Base de données : PostgreSQL (testai_executions)
Entités principales :
javaTestExecution {
    UUID id
    UUID projectId
    UUID endpointId
    String endpointPath
    String httpMethod
    TestType testType (POSITIVE, WRONG_TYPE, ...)
    
    // Requête envoyée
    String requestUrl
    Map<String, String> requestHeaders
    Map<String, Object> requestBody
    
    // Réponse reçue
    Integer responseStatusCode
    Map<String, String> responseHeaders
    Map<String, Object> responseBody
    Long responseTimeMs
    
    // Validation
    Integer expectedStatusCode
    Boolean statusCodeMatch
    Boolean schemaValidationPassed
    TestStatus status (SUCCESS, FAILED, ERROR)
    String errorMessage
    Map<String, Object> validationErrors
    
    // Métadonnées
    UUID executedBy
    Instant executedAt
    String executionContext (manual, scheduled, ci_cd)
    UUID executionId (lié à ProjectExecution)
}

ProjectExecution {
    UUID id
    UUID projectId
    String projectName
    Integer totalEndpoints
    Integer totalTests
    Integer testsPassed
    Integer testsFailed
    Integer testsError
    Double successRate
    Long totalDurationMs
    ExecutionStatus status (RUNNING, COMPLETED, FAILED)
    UUID executedBy
    Instant executedAt
    Instant completedAt
    String executionContext
    
    // Stats par type
    Integer positiveTests, positivePassedTests
    Integer wrongTypeTests, wrongTypePassedTests
    Integer missingFieldsTests, missingFieldsPassedTests
    Integer boundaryTests, boundaryPassedTests
    Integer validationTests, validationPassedTests
    Integer authTests, authPassedTests
}
Endpoints clés :
POST   /api/executions/execute                    - Exécuter 1 test
POST   /api/executions/execute-project            - Exécuter projet complet
GET    /api/executions/project/{projectId}        - Historique projet
GET    /api/executions/{executionId}              - Détails exécution
GET    /api/executions/{executionId}/test-executions - Tests d'une exécution
GET    /api/executions/{executionId}/logs         - Logs temps réel
DELETE /api/executions/project/{projectId}        - Supprimer historique
Flux d'exécution d'un test :
java1. Récupérer Project (URL + credentials)
2. Récupérer Endpoint (method, path)
3. Récupérer Test généré (payload, expectedStatus)
4. Construire URL complète (base + path + pathParams + queryParams)
5. Construire headers (auth + headers du test)
6. Préparer entity HTTP (avec ou sans body selon méthode)
7. EXÉCUTER appel HTTP vers API réelle via RestTemplate
8. Capturer réponse (200, 400, 401, 500...)
9. Valider : expectedStatus == actualStatus ?
10. Sauvegarder TestExecution en DB
11. Retourner résultat
Gestion authentification :
javaswitch (authType) {
  case "BASIC":
    headers.set("Authorization", "Basic " + base64(user:pass))
  case "APIKEY":
    if (location == "HEADER")
      headers.set(apiKeyHeader, apiKey)
  case "BEARER":
    headers.set("Authorization", "Bearer " + token)
}
Exécution asynchrone :
Pour les projets complets (ProjectExecutionService) :

Utilise @Async et CompletableFuture
Crée ProjectExecution en DB (status = RUNNING)
Lance exécution en arrière-plan
Met à jour ProjectExecution à la fin (status = COMPLETED)
Stocke tous les TestExecution

Communication sortante :

project-service : Récupérer projet + credentials
endpoint-service : Récupérer endpoints
test-service : Récupérer tests générés
API externe : Exécuter tests réels

Feign Clients :
java@FeignClient(name = "project-service")
ProjectServiceClient

@FeignClient(name = "endpoint-service")
EndpointServiceClient

@FeignClient(name = "test-service")
TestServiceClient
Génération de rapports PDF :
Service SingleReportService :

Génère rapport PDF pour un endpoint
Utilise OpenPDF (iText fork)
Tableaux colorés, badges de statut
Sections : Project Info, Endpoint Details, Test Executions
Export via endpoint : GET /api/reports/endpoint/{endpointId}

9. ADMIN-SERVICE (Port 8087)
Rôle : Supervision et administration centrale
Responsabilités :

Gérer les utilisateurs (liste, détails, activation, suppression)
Accéder aux métriques d'exécution et rapports PDF
Gérer les projets et partages
Fournir des endpoints d'administration sécurisés

Technologies :

Spring Boot 3.2
PostgreSQL
OpenFeign pour communiquer avec user-service, project-service et execution-service

Endpoints clés :
GET    /api/admin/users
GET    /api/admin/users/{id}/full
POST   /api/admin/users/{userId}/toggle
DELETE /api/admin/users/{id}
GET    /api/admin/stats/{userId}/execution-global-stats
GET    /api/admin/stats/{userId}/global-tests-rate
GET    /api/admin/stats/{userId}/latest-project-execs
GET    /api/admin/projects/{projectId}/shares
GET    /api/admin/projects/{userId}/projectsIds
GET    /api/admin/projects/{id}
DELETE /api/admin/projects/{id}

10. NOTIFICATION-SERVICE (Port 8089)
Rôle : Gestion des notifications et alertes utilisateur
Responsabilités :

Envoyer des notifications aux utilisateurs
Lister et compter les notifications non lues
Marquer les notifications comme lues
Maintenir une base d'historique de notifications

Technologies :

Spring Boot 3.2
PostgreSQL

Endpoints clés :
POST   /api/notifications/send
GET    /api/notifications/user/{userId}
GET    /api/notifications/user/{userId}/unread-count
PUT    /api/notifications/{id}/read
PUT    /api/notifications/user/{userId}/read-all

💻 TECHNOLOGIES UTILISÉES
Backend
Service | Framework | Langage | Base de données
eureka-server | Spring Cloud | Java 17 | -
api-gateway | Spring Cloud Gateway | Java 17 | -
user-service | Spring Boot 3.2 | Java 17 | PostgreSQL
project-service | Spring Boot 3.2 | Java 17 | PostgreSQL
endpoint-service | Spring Boot 3.2 | Java 17 | PostgreSQL
test-service | Spring Boot 3.2 | Java 17 | PostgreSQL
execution-service | Spring Boot 3.2 | Java 17 | PostgreSQL
admin-service | Spring Boot 3.2 | Java 17 | PostgreSQL
notification-service | Spring Boot 3.2 | Java 17 | PostgreSQL
generate-test-service | Flask | Python 3.12 | -

Librairies Spring
xml<!-- Spring Cloud -->
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-netflix-eureka-server</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-netflix-eureka-client</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-gateway</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-openfeign</artifactId>
</dependency>

<!-- Spring Boot -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-jpa</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-validation</artifactId>
</dependency>

<!-- Database -->
<dependency>
    <groupId>org.postgresql</groupId>
    <artifactId>postgresql</artifactId>
</dependency>

<!-- Security -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-oauth2-resource-server</artifactId>
</dependency>
<dependency>
    <groupId>org.keycloak</groupId>
    <artifactId>keycloak-spring-boot-starter</artifactId>
</dependency>

<!-- Utilities -->
<dependency>
    <groupId>org.projectlombok</groupId>
    <artifactId>lombok</artifactId>
</dependency>
<dependency>
    <groupId>io.swagger.parser.v3</groupId>
    <artifactId>swagger-parser</artifactId>
</dependency>
Frontend

React 18 avec TypeScript
Vite (build tool)
Tailwind CSS (styling)
React Router (routing)
Axios (HTTP client)
Recharts (graphiques)

Infrastructure

Docker & Docker Compose
PostgreSQL (bases de données)
Keycloak (authentification)
Nginx (reverse proxy pour le frontend)


📁 STRUCTURE DU PROJET
testai/
├── docker-compose.yml                # Orchestration de tous les services
├── README.md
│
├── eureka-server/                    # Service Discovery
│   ├── src/main/java/
│   ├── src/main/resources/
│   │   └── application.yml
│   ├── Dockerfile
│   └── pom.xml
│
├── api-gateway/                      # API Gateway
│   ├── src/main/java/
│   ├── src/main/resources/
│   │   └── application.yml
│   ├── Dockerfile
│   └── pom.xml
│
├── user-service/                     # Gestion utilisateurs
│   ├── src/main/java/com/testai/userservice/
│   │   ├── controller/
│   │   │   └── UserController.java
│   │   ├── service/
│   │   │   └── UserService.java
│   │   ├── entity/
│   │   │   └── User.java
│   │   ├── repository/
│   │   │   └── UserRepository.java
│   │   ├── dto/
│   │   └── config/
│   ├── src/main/resources/
│   │   └── application.yml
│   ├── Dockerfile
│   └── pom.xml
│
├── project-service/                  # Gestion projets
│   ├── src/main/java/com/testai/projectservice/
│   │   ├── controller/
│   │   │   └── ProjectController.java
│   │   ├── service/
│   │   │   ├── ProjectService.java
│   │   │   └── SharedAccessService.java
│   │   ├── entity/
│   │   │   ├── Project.java
│   │   │   ├── ApiCredentials.java
│   │   │   └── SharedAccess.java
│   │   ├── repository/
│   │   ├── feignclient/
│   │   │   ├── UserServiceClient.java
│   │   │   ├── EndpointServiceClient.java
│   │   │   ├── TestServiceClient.java
│   │   │   └── ExecutionServiceClient.java
│   │   └── dto/
│   ├── Dockerfile
│   └── pom.xml
│
├── endpoint-service/                 # Gestion endpoints
│   ├── src/main/java/com/testai/endpointservice/
│   │   ├── controller/
│   │   │   └── EndpointController.java
│   │   ├── service/
│   │   │   ├── EndpointService.java
│   │   │   └── SwaggerScannerService.java
│   │   ├── entity/
│   │   │   └── Endpoint.java
│   │   ├── repository/
│   │   ├── feignclient/
│   │   │   └── TestServiceClient.java
│   │   └── dto/
│   ├── Dockerfile
│   └── pom.xml
│
├── test-service/                     # Gestion tests
│   ├── src/main/java/com/testai/testservice/
│   │   ├── controller/
│   │   │   └── TestController.java
│   │   ├── service/
│   │   │   └── TestService.java
│   │   ├── entity/
│   │   │   └── Test.java
│   │   ├── repository/
│   │   ├── feignclient/
│   │   │   └── GenerateTestClient.java (Flask AI)
│   │   └── dto/
│   ├── Dockerfile
│   └── pom.xml
│
├── execution-service/                # Exécution tests
│   ├── src/main/java/org/example/executionservice/
│   │   ├── controller/
│   │   │   └── ExecutionController.java
│   │   ├── service/
│   │   │   ├── TestExecutionService.java
│   │   │   ├── ProjectExecutionService.java
│   │   │   └── SingleReportService.java
│   │   ├── entity/
│   │   │   ├── TestExecution.java
│   │   │   └── ProjectExecution.java
│   │   ├── repository/
│   │   ├── feignclient/
│   │   │   ├── ProjectServiceClient.java
│   │   │   ├── EndpointServiceClient.java
│   │   │   └── TestServiceClient.java
│   │   └── dto/
│   ├── Dockerfile
│   └── pom.xml
│
├── admin-service/                    # Service d'administration
│   ├── src/main/java/
│   ├── src/main/resources/
│   ├── Dockerfile
│   └── pom.xml
│
├── notification-service/             # Service de notifications
│   ├── src/main/java/
│   ├── src/main/resources/
│   ├── Dockerfile
│   └── pom.xml
│
├── generate-test-service/            # Service IA / génération de tests
│   ├── app.py                        # Point d'entrée
│   ├── config.py
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── base-model/
│   ├── converters/
│   ├── generators/
│   ├── models/
│   ├── pipeline/
│   ├── put-post-adapter/
│   └── utils/
│
├── testai-frontend/                  # Interface utilisateur principale
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── types/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
└── testai-frontend-admin/            # Interface d'administration
    ├── src/
    │   ├── components/
    │   ├── context/
    │   ├── pages/
    │   ├── services/
    │   ├── types/
    │   ├── App.tsx
    │   └── main.tsx
    ├── package.json
    ├── tsconfig.json
    └── vite.config.ts

🔗 COMMUNICATION INTER-SERVICES
OpenFeign : Communication synchrone
Principe :

Feign Client = Interface Java annotée
Génère automatiquement le code HTTP
Utilise Eureka pour résoudre les URLs
Load balancing automatique

Exemple :
java// Dans project-service
@FeignClient(name = "endpoint-service", path = "/api/endpoints")
public interface EndpointServiceClient {
    
    @GetMapping("/project/{projectId}")
    List<EndpointDTO> getEndpointsByProjectId(@PathVariable UUID projectId);
    
    @DeleteMapping("/project/{projectId}")
    Map<String, Object> deleteEndpointsByProjectId(@PathVariable UUID projectId);
}

// Utilisation
@Autowired
private EndpointServiceClient endpointServiceClient;

public void scanEndpoints(UUID projectId) {
    List<EndpointDTO> endpoints = endpointServiceClient.getEndpointsByProjectId(projectId);
}
Ce qui se passe :
1. project-service appelle endpointServiceClient.getEndpointsByProjectId(projectId)
2. Feign demande à Eureka : "Où est endpoint-service ?"
3. Eureka répond : "http://endpoint-service:8083"
4. Feign fait : GET http://endpoint-service:8083/api/endpoints/project/{projectId}
5. endpoint-service répond avec JSON
6. Feign désérialise en List<EndpointDTO>
7. project-service reçoit la liste
Graphe de dépendances
user-service
    └── (aucune dépendance)

project-service
    ├── user-service (vérifier users)
    ├── endpoint-service (scanner/récupérer endpoints)
    ├── test-service (supprimer tests)
    ├── execution-service (supprimer exécutions)
    └── notification-service (envoyer alertes)

endpoint-service
    └── test-service (supprimer tests)

test-service
    └── ai-service / generate-test-service (générer tests via Qwen2.5-1.5B-Instruct)

execution-service
    ├── project-service (récupérer projet + credentials)
    ├── endpoint-service (récupérer endpoints)
    └── test-service (récupérer tests)

ai-service / generate-test-service (Flask)
    └── (aucune dépendance - appelé par test-service)
Circuit Breaker & Résilience
Utilise Resilience4j pour gérer les pannes :
java@CircuitBreaker(name = "endpoint-service", fallbackMethod = "getEndpointsFallback")
public List<EndpointDTO> getEndpoints(UUID projectId) {
    return endpointServiceClient.getEndpointsByProjectId(projectId);
}

public List<EndpointDTO> getEndpointsFallback(UUID projectId, Exception e) {
    log.error("endpoint-service indisponible : {}", e.getMessage());
    return Collections.emptyList();
}

💾 BASES DE DONNÉES
Schéma global
Chaque service a sa propre base de données (Database per Service pattern).
PostgreSQL Instance
├── testai_users          (user-service)
│   └── users
│
├── testai_projects       (project-service)
│   ├── projects
│   ├── api_credentials
│   └── shared_access
│
├── testai_endpoints      (endpoint-service)
│   └── endpoints
│
├── testai_tests          (test-service)
│   └── tests
│
└── testai_executions     (execution-service)
    ├── test_executions
    └── project_executions
Détail des tables
users (user-service)
sqlCREATE TABLE users (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone_number VARCHAR(20) UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'MANAGER',
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    phone_verified BOOLEAN DEFAULT false,
    avatar_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT NOW()
);
projects (project-service)
sqlCREATE TABLE projects (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    project_url VARCHAR(500) NOT NULL,
    doc_mode VARCHAR(20) NOT NULL,
    doc_url VARCHAR(500) NOT NULL,
    auth_type VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
api_credentials (project-service)
sqlCREATE TABLE api_credentials (
    id UUID PRIMARY KEY,
    project_id UUID UNIQUE NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    basic_username VARCHAR(255),
    basic_password VARCHAR(255),
    api_key VARCHAR(500),
    api_key_header VARCHAR(100),
    api_key_location VARCHAR(20),
    bearer_token TEXT,
    is_encrypted BOOLEAN DEFAULT false
);
shared_access (project-service)
sqlCREATE TABLE shared_access (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    manager_email VARCHAR(255) NOT NULL,
    developer_email VARCHAR(255) NOT NULL,
    developer_user_id UUID,
    access_level VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL,
    shared_at TIMESTAMP DEFAULT NOW(),
    accepted_at TIMESTAMP
);
endpoints (endpoint-service)
sqlCREATE TABLE endpoints (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL,
    method VARCHAR(10) NOT NULL,
    path VARCHAR(500) NOT NULL,
    description TEXT,
    discovery_type VARCHAR(20) NOT NULL,
    tags VARCHAR(500),
    parameters TEXT,
    request_body TEXT,
    response_body TEXT,
    status_codes VARCHAR(100),
    requires_auth BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
tests (test-service)
sqlCREATE TABLE tests (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL,
    endpoint_id UUID NOT NULL,
    endpoint_path VARCHAR(500) NOT NULL,
    positive JSONB NOT NULL,
    wrong_type JSONB,
    missing_fields JSONB,
    boundary JSONB,
    validation JSONB,
    auth JSONB
);
test_executions (execution-service)
sqlCREATE TABLE test_executions (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL,
    endpoint_id UUID NOT NULL,
    endpoint_path VARCHAR(500) NOT NULL,
    http_method VARCHAR(10) NOT NULL,
    test_type VARCHAR(20) NOT NULL,
    
    request_url TEXT NOT NULL,
    request_headers JSONB,
    request_body JSONB,
    
    response_status_code INTEGER NOT NULL,
    response_headers JSONB,
    response_body JSONB,
    response_time_ms BIGINT,
    
    expected_status_code INTEGER,
    status_code_match BOOLEAN,
    schema_validation_passed BOOLEAN,
    status VARCHAR(20) NOT NULL,
    error_message TEXT,
    validation_errors JSONB,
    
    executed_by UUID NOT NULL,
    executed_at TIMESTAMP DEFAULT NOW(),
    execution_context VARCHAR(50),
    execution_id UUID
);
project_executions (execution-service)
sqlCREATE TABLE project_executions (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL,
    project_name VARCHAR(200) NOT NULL,
    total_endpoints INTEGER NOT NULL,
    total_tests INTEGER NOT NULL,
    tests_passed INTEGER NOT NULL,
    tests_failed INTEGER NOT NULL,
    tests_error INTEGER NOT NULL,
    success_rate DOUBLE PRECISION,
    total_duration_ms BIGINT,
    status VARCHAR(20) NOT NULL,
    executed_by UUID NOT NULL,
    executed_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    execution_context VARCHAR(50)
);

🌐 ENDPOINTS API
Documentation complète
Tous les endpoints sont documentés dans Swagger UI de chaque service.
Accès Swagger :
http://localhost:8081/swagger-ui.html  (user-service)
http://localhost:8082/swagger-ui.html  (project-service)
http://localhost:8083/swagger-ui.html  (endpoint-service)
http://localhost:8084/swagger-ui.html  (test-service)
http://localhost:8085/swagger-ui.html  (execution-service)
Routes via API Gateway
Base URL : http://localhost:8888
# USER SERVICE
POST   /user-service/api/users/register
POST   /user-service/api/users/login
GET    /user-service/api/users/{id}

# PROJECT SERVICE
POST   /project-service/api/projects/add
GET    /project-service/api/projects/{id}
PUT    /project-service/api/projects/{id}
DELETE /project-service/api/projects/{id}
POST   /project-service/api/projects/{id}/scan-endpoints
POST   /project-service/api/projects/{id}/share

# ENDPOINT SERVICE
GET    /endpoint-service/api/endpoints/project/{projectId}
POST   /endpoint-service/api/endpoints/scan

# TEST SERVICE
POST   /test-service/api/tests/generate
GET    /test-service/api/tests/{projectId}

# EXECUTION SERVICE
POST   /execution-service/api/executions/execute
POST   /execution-service/api/executions/execute-project
GET    /execution-service/api/executions/project/{projectId}
GET    /execution-service/api/executions/{executionId}/test-executions

🐳 DOCKER & DÉPLOIEMENT
docker-compose.yml
yamlversion: '3.8'

services:
  # PostgreSQL
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: testai
      POSTGRES_PASSWORD: testai123
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - testai-network

  # Eureka Server
  eureka-server:
    build: ./eureka-server
    ports:
      - "8761:8761"
    networks:
      - testai-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8761/actuator/health"]
      interval: 10s
      timeout: 5s
      retries: 5

  # API Gateway
  api-gateway:
    build: ./api-gateway
    ports:
      - "8888:8888"
    environment:
      - EUREKA_CLIENT_SERVICEURL_DEFAULTZONE=http://eureka-server:8761/eureka/
    depends_on:
      eureka-server:
        condition: service_healthy
    networks:
      - testai-network

  # User Service
  user-service:
    build: ./user-service
    ports:
      - "8081:8081"
    environment:
      - SPRING_DATASOURCE_URL=jdbc:postgresql://postgres:5432/testai_users
      - EUREKA_CLIENT_SERVICEURL_DEFAULTZONE=http://eureka-server:8761/eureka/
    depends_on:
      - postgres
      - eureka-server
    networks:
      - testai-network

  # Project Service
  project-service:
    build: ./project-service
    ports:
      - "8082:8082"
    environment:
      - SPRING_DATASOURCE_URL=jdbc:postgresql://postgres:5432/testai_projects
      - EUREKA_CLIENT_SERVICEURL_DEFAULTZONE=http://eureka-server:8761/eureka/
    depends_on:
      - postgres
      - eureka-server
    networks:
      - testai-network

  # Endpoint Service
  endpoint-service:
    build: ./endpoint-service
    ports:
      - "8083:8083"
    environment:
      - SPRING_DATASOURCE_URL=jdbc:postgresql://postgres:5432/testai_endpoints
      - EUREKA_CLIENT_SERVICEURL_DEFAULTZONE=http://eureka-server:8761/eureka/
    depends_on:
      - postgres
      - eureka-server
    networks:
      - testai-network

  # Test Service
  test-service:
    build: ./test-service
    ports:
      - "8084:8084"
    environment:
      - SPRING_DATASOURCE_URL=jdbc:postgresql://postgres:5432/testai_tests
      - EUREKA_CLIENT_SERVICEURL_DEFAULTZONE=http://eureka-server:8761/eureka/
    depends_on:
      - postgres
      - eureka-server
    networks:
      - testai-network

  # Execution Service
  execution-service:
    build: ./execution-service
    ports:
      - "8085:8085"
    environment:
      - SPRING_DATASOURCE_URL=jdbc:postgresql://postgres:5432/testai_executions
      - EUREKA_CLIENT_SERVICEURL_DEFAULTZONE=http://eureka-server:8761/eureka/
    depends_on:
      - postgres
      - eureka-server
    networks:
      - testai-network

  # AI Service (Flask)
  ai-service:
    build: ./generate-test-service
    ports:
      - "8084:8084"
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    networks:
      - testai-network

  # Frontend
  frontend:
    build: ./frontend
    ports:
      - "3000:80"
    depends_on:
      - api-gateway
    networks:
      - testai-network

volumes:
  postgres_data:

networks:
  testai-network:
    driver: bridge
Commandes Docker
bash# Lancer tous les services
docker-compose up -d

# Arrêter tous les services
docker-compose down

# Voir les logs
docker-compose logs -f [service-name]

# Rebuild un service
docker-compose up -d --build [service-name]

# Voir l'état des services
docker-compose ps
Ordre de démarrage
1. postgres
2. eureka-server (attend health check)
3. api-gateway (attend eureka)
4. user-service, project-service, endpoint-service, test-service, execution-service, admin-service, notification-service
5. ai-service / generate-test-service
6. frontend

🛠️ GUIDE DE DÉVELOPPEMENT
Prérequis

Java 17+
Maven 3.8+
Node.js 18+
Docker & Docker Compose
Python 3.12+ (pour generate-test-service)
PostgreSQL 15+

Setup local
1. Cloner le projet
bashgit clone https://github.com/your-org/testai.git
cd testai
2. Créer bases de données
sqlCREATE DATABASE testai_users;
CREATE DATABASE testai_projects;
CREATE DATABASE testai_endpoints;
CREATE DATABASE testai_tests;
CREATE DATABASE testai_executions;
3. Configurer variables d'environnement
Créer .env à la racine :
env# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=testai
DB_PASSWORD=testai123

# OpenAI
OPENAI_API_KEY=sk-...

# Keycloak
KEYCLOAK_AUTH_SERVER_URL=http://localhost:8080/auth
KEYCLOAK_REALM=testai
KEYCLOAK_CLIENT_ID=testai-app
4. Lancer services localement
Option A : Avec Docker Compose (recommandé)
bashdocker-compose up -d
Option B : Manuellement
bash# Eureka Server
cd eureka-server
mvn spring-boot:run

# API Gateway
cd api-gateway
mvn spring-boot:run

# User Service
cd user-service
mvn spring-boot:run

# ... autres services
5. Lancer AI Service (Flask)
cd generate-test-service
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app.py
6. Lancer Frontend
bashcd frontend
npm install
npm run dev
Workflow de développement

Créer une branche :

bashgit checkout -b feature/nom-feature

Développer :


Modifier le code
Tester localement
Commit régulièrement


Tests :

bash# Tests unitaires
mvn test

# Tests d'intégration
mvn verify

Push & Pull Request :

bashgit push origin feature/nom-feature

Code Review puis Merge


🎯 FONCTIONNALITÉS PRINCIPALES
1. Découverte automatique d'APIs
Workflow :
1. Manager crée un projet avec URL Swagger
2. project-service déclenche scan automatique
3. endpoint-service télécharge et parse Swagger
4. Extraction de tous les endpoints
5. Stockage en DB avec schémas complets
Gain : 90% de réduction du temps de configuration (6h → 30min pour 100 endpoints)

2. Génération intelligente de tests
Workflow :
1. Manager clique "Générer tests" pour un endpoint
2. Frontend → test-service avec endpointId
3. test-service récupère schémas depuis endpoint-service
4. test-service → ai-service (Flask) avec schémas
5. ai-service → Qwen2.5-1.5B-Instruct génère 6 tests réalistes
6. test-service stocke tests en DB
7. Frontend affiche les 6 tests générés
Exemple de différence :
Schemathesis (aléatoire) :
json{
  "firstName": "xKj8P2qL",
  "email": "test@test.com",
  "age": 999999
}
TestAI (IA - réaliste) :
json{
  "firstName": "Sophie",
  "lastName": "Martin",
  "email": "sophie.martin@example.com",
  "age": 32,
  "phoneNumber": "+33612345678",
  "address": "15 rue de la République, 75001 Paris"
}
Gain : 95% de réduction du temps + meilleure qualité

3. Exécution simplifiée
Workflow - Test unique :
1. Manager clique "Exécuter" sur un test POSITIVE
2. Frontend → execution-service avec testType
3. execution-service récupère :
   - Project (URL + credentials)
   - Endpoint (method + path)
   - Test (payload + expectedStatus)
4. Construit requête HTTP complète
5. EXÉCUTE appel vers API réelle (RestTemplate)
6. Valide réponse (expectedStatus == actualStatus ?)
7. Sauvegarde TestExecution en DB
8. Retourne résultat au frontend
Workflow - Projet complet :
1. Manager clique "Exécuter tout le projet"
2. Frontend → execution-service
3. Crée ProjectExecution (status=RUNNING)
4. Lance exécution asynchrone (@Async)
5. Pour chaque endpoint :
   - Exécute les 6 tests
   - Sauvegarde chaque TestExecution
6. Met à jour ProjectExecution (status=COMPLETED)
7. Frontend affiche résultats + statistiques

4. Collaboration multi-rôles
Workflow de partage :
1. Manager clique "Partager projet"
2. Entre email du développeur + access level (READ_ONLY/READ_WRITE)
3. project-service crée SharedAccess (status=PENDING)
4. Email envoyé au développeur avec lien d'invitation
5. Développeur clique lien → acceptation
6. Si pas encore inscrit : création compte automatique
7. SharedAccess mis à jour (status=ACTIVE, developerUserId rempli)
8. Développeur voit projet dans "Projets partagés avec moi"
Niveaux d'accès :

READ_ONLY : Consulter endpoints/tests/historique
READ_WRITE : + Générer tests + Exécuter tests


5. Historique & Traçabilité
Structure :
ProjectExecution (batch complet)
├── Test 1 → TestExecution
├── Test 2 → TestExecution
├── Test 3 → TestExecution
└── ... → 50 TestExecution
Frontend affiche :

Liste des ProjectExecution (date, taux de succès)
Clic sur une exécution → Détails :

Graphique (Réussis / Échoués / Erreurs)
Tableau des TestExecution
Pour chaque test : requête envoyée + réponse reçue



Gain : Reproductibilité garantie + debugging facilité

6. Rapports PDF
Service : SingleReportService dans execution-service
Génération :
GET /api/reports/endpoint/{endpointId}

→ Génère PDF avec :
  - Project Info (tableau)
  - Endpoint Details (tableau)
  - Test Executions (tableaux colorés)
    * Métadonnées
    * Expected vs Actual
    * Request Sent
    * Response Received
    * Errors
Format :

Tableaux avec alternance de couleurs
Badges de statut (vert/rouge/orange)
Code blocks pour JSON
Multi-pages


🔐 AUTHENTIFICATION & SÉCURITÉ
Keycloak
Rôle : Serveur d'authentification centralisé
Configuration :
Realm: testai
Client: testai-app
Roles: MANAGER, GUEST, ADMIN
Workflow d'inscription :
1. User remplit formulaire (name, email, password, phone)
2. user-service hash password (BCrypt)
3. user-service crée User en DB (role=MANAGER par défaut)
4. Envoie code vérification email (6 chiffres)
5. Envoie code vérification SMS via Twilio
6. User entre codes → emailVerified = true, phoneVerified = true
7. user-service → Keycloak pour créer utilisateur
8. Retourne JWT
JWT Token :
json{
  "sub": "user-uuid",
  "email": "user@example.com",
  "role": "MANAGER",
  "exp": 1735689600
}
Sécurité des credentials API
Stockage :

Credentials stockés dans table api_credentials
Possibilité de chiffrement (colonne encrypted)
OneToOne avec Project (suppression cascade)

Utilisation :

Récupérés uniquement lors de l'exécution de tests
Jamais exposés dans les réponses API


📈 MÉTRIQUES & MONITORING
Actuator Endpoints
Tous les services exposent :
GET /actuator/health       - Santé du service
GET /actuator/metrics      - Métriques (CPU, mémoire, etc.)
GET /actuator/info         - Infos version
Métriques métier
Dans execution-service :

Taux de succès global par projet
Temps de réponse moyen
Nombre de tests exécutés par jour
Endpoints les plus testés


🚀 DÉPLOIEMENT PRODUCTION
Architecture de déploiement
┌─────────────────────────────────────┐
│         Load Balancer               │
│       (Nginx / AWS ALB)             │
└──────────────┬──────────────────────┘
               │
    ┌──────────┴──────────┐
    │                     │
    ▼                     ▼
┌─────────┐         ┌─────────┐
│Frontend │         │ Gateway │
│ (Nginx) │         │         │
└─────────┘         └────┬────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
    [Services Spring Boot en cluster]
        │                │                │
        └────────────────┼────────────────┘
                         │
                    ┌────┴────┐
                    │PostgreSQL│
                    │ Cluster │
                    └─────────┘
Checklist production

 Variables d'environnement (secrets)
 HTTPS (Let's Encrypt)
 Base de données : backup automatique
 Logs centralisés (ELK Stack)
 Monitoring (Prometheus + Grafana)
 Rate limiting sur Gateway
 Circuit breakers configurés
 Health checks sur tous services
 Scaling horizontal (Kubernetes)


📚 RESSOURCES
Documentation

Spring Cloud : https://spring.io/projects/spring-cloud
OpenFeign : https://spring.io/projects/spring-cloud-openfeign
Eureka : https://spring.io/guides/gs/service-registration-and-discovery/
Flask : https://flask.palletsprojects.com/
OpenAPI Spec : https://swagger.io/specification/

Outils de test

Postman : https://www.postman.com/
Swagger UI : http://localhost:8081/swagger-ui.html
Eureka Dashboard : http://localhost:8761


👨‍💻 TECHNOLOGIES UTILISES

Backend : Architecture microservices Spring Boot
Frontend : React + TypeScript
AI Service : Flask + adaptateur Qwen2.5-1.5B-Instruct
DevOps : Docker + Docker Compose


👥 CONTRIBUTEURS

Ghada Fatnassi
Allani Mohamed