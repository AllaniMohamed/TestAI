TESTAI - COMPLETE README

Intelligent platform for automating REST API tests


📋 TABLE OF CONTENTS

Overview
Microservices architecture
Detailed services
Technologies used
Project structure
Inter-service communication
Databases
API endpoints
Docker & Deployment
Development guide
Main features
Authentication & Security
Report generation


🎯 OVERVIEW
What is TestAI?
TestAI is an innovative SaaS platform that automates and optimizes REST API testing by combining:

✅ Automatic Swagger/OpenAPI documentation scanning
🤖 Internal artificial intelligence via an adapter trained on the Qwen2.5-1.5B-Instruct model to generate realistic test data
🚀 Automated test execution with validation
📊 Detailed reports with quality metrics
👥 Multi-role collaboration (Manager/Guest/Admin)
🔄 Full execution history

Positioning
TestAI sits at the integration testing layer of the testing pyramid, specifically targeting REST APIs to fill the gap in intelligent automation at this critical layer.
Measured gains

95% reduction in test generation time
600% increase in coverage (6 tests/endpoint vs 1)
70% overall time savings on API testing


🏗️ MICROSERVICES ARCHITECTURE
Overall architecture
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                         │
│                    http://localhost:3000                         │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    API GATEWAY (Port 8888)                       │
│              - Centralized routing                               │
│              - CORS                                               │
│              - Rate limiting                                      │
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
Architecture principle
Modular microservices architecture where:

Each service has a single responsibility (Single Responsibility Principle)
Services communicate via REST API and OpenFeign
API Gateway: single entry point for the frontend
Eureka: automatic service discovery (no hardcoded URLs)
Docker Compose: orchestration of all services


🔧 DETAILED SERVICES
1. EUREKA-SERVER (Port 8761)
Role: Service Registry
Responsibilities:

Register all microservices at startup
Maintain a dynamic list of available instances
Provide service discovery
Enable client-side load balancing

Technologies:

Spring Cloud Netflix Eureka Server
Spring Boot 3.x

Key configuration:
yamleureka:
  client:
    register-with-eureka: false  # Eureka ne s'enregistre pas lui-même
    fetch-registry: false
  server:
    enable-self-preservation: false
Access URL: http://localhost:8761
Dashboard: Web interface showing all registered services

2. API-GATEWAY (Port 8888)
Role: Single entry point for all requests
Responsibilities:

Route requests to the correct microservices
Handle CORS to allow calls from the frontend
Apply rate limiting to prevent abuse
Centralize security configuration

Technologies:

Spring Cloud Gateway
Spring Boot 3.x

Configured routes:
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
Example request:
bash# Frontend calls
GET http://localhost:8888/project-service/api/projects

# Gateway routes to
GET http://project-service:8082/api/projects

3. USER-SERVICE (Port 8081)
Role: User management and authentication
Responsibilities:

User registration and login
Email/phone verification (SMS via Twilio)
User profile management
Avatar upload
Role management (MANAGER, GUEST, ADMIN)

Database: PostgreSQL (testai_users)
Main entities:
javaUser {
    UUID id
    String name
    String email (unique)
    String phoneNumber (unique)
    String password (BCrypt hashed)
    Role role (MANAGER, GUEST, ADMIN)
    Boolean isActive
    Boolean emailVerified
    Boolean phoneVerified
    String avatarUrl
    Instant createdAt
}
Key endpoints:
POST   /api/users/register           - Registration
POST   /api/users/login              - Login (returns JWT)
POST   /api/users/verify-email       - Verify email
POST   /api/users/verify-phone       - Verify phone
POST   /api/users/{id}/avatar        - Upload avatar
GET    /api/users/{id}               - Get user
GET    /api/users/email/{email}      - Find by email
PUT    /api/users/{id}               - Update profile
Keycloak integration: Uses Keycloak to manage JWT tokens
Outgoing communication: None (core service)

4. PROJECT-SERVICE (Port 8082)
Role: Project management (APIs to test)
Responsibilities:

Project CRUD
Storage of API authentication credentials (Basic, API Key, Bearer)
Automatic Swagger documentation scanning
Project sharing management (SharedAccess)
Cascade deletion (project → endpoints → tests → executions)

Database: PostgreSQL (testai_projects)
Main entities:
javaProject {
    UUID id
    UUID userId (owner)
    String name
    String description
    String projectUrl (API URL to test)
    DocsMode docMode (SWAGGER, MANUAL)
    String docUrl (Swagger URL or file)
    AuthType authType (NONE, BASIC, APIKEY, BEARER)
    ApiCredentials credentials (OneToOne)
    Instant createdAt
}

ApiCredentials {
    UUID id
    UUID projectId (OneToOne with Project)
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
    String managerEmail (who shares)
    String developerEmail (invited)
    UUID developerUserId (null if not registered yet)
    AccessLevel accessLevel (READ_ONLY, READ_WRITE)
    AccessStatus status (PENDING, ACTIVE, REVOKED)
    Instant sharedAt
    Instant acceptedAt
}
Key endpoints:
POST   /api/projects/add                    - Create project
GET    /api/projects/{id}                   - Get project
PUT    /api/projects/{id}                   - Update project
DELETE /api/projects/{id}                   - Delete project with cascade
GET    /api/projects/user/{userId}          - User projects
POST   /api/projects/{id}/scan-endpoints    - Scan Swagger
GET    /api/projects/{id}/endpoints         - List endpoints
POST   /api/projects/{id}/share             - Share project
GET    /api/projects/{id}/shares            - List shares
DELETE /api/projects/shares/{id}            - Revoke share
GET    /api/projects/shared-with-me         - Projects shared with me
Outgoing communication:

user-service: Verify user existence
endpoint-service: Scan endpoints, retrieve/delete endpoints
test-service: Delete tests when project is deleted
execution-service: Delete executions when project is deleted

Feign Clients:
java@FeignClient(name = "user-service")
UserServiceClient

@FeignClient(name = "endpoint-service")
EndpointServiceClient

@FeignClient(name = "test-service")
TestServiceClient

@FeignClient(name = "execution-service")
ExecutionServiceClient

5. ENDPOINT-SERVICE (Port 8083)
Role: API endpoint management
Responsibilities:

Scan Swagger/OpenAPI documentation
Store discovered endpoints
Create endpoints manually
CRUD endpoints
Provide request/response schemas for test generation

Database: PostgreSQL (testai_endpoints)
Main entities:
javaEndpoint {
    UUID id
    UUID projectId
    HttpMethod method (GET, POST, PUT, DELETE, PATCH)
    String path (e.g. "/api/users/{id}")
    String description
    DiscoveryType discoveryType (SWAGGER, MANUAL)
    String tags (categories, comma-separated)
    String parameters (JSON array of params)
    String requestBody (JSON Schema)
    String responseBody (JSON Schema)
    String statusCodes (e.g. "200,201,400")
    Boolean requiresAuth
    Instant createdAt
    Instant updatedAt
}
Key endpoints:
POST   /api/endpoints/scan                  - Scan Swagger
GET    /api/endpoints/project/{projectId}   - List project endpoints
GET    /api/endpoints/{id}                  - Get endpoint
POST   /api/endpoints                       - Create manual endpoint
PUT    /api/endpoints/{id}                  - Update endpoint
DELETE /api/endpoints/{id}                  - Delete endpoint
DELETE /api/endpoints/project/{projectId}   - Delete all project endpoints
GET    /api/endpoints/project/{projectId}/count - Count endpoints
Swagger scanning:
Uses Swagger Parser to:

Download the Swagger/OpenAPI file (JSON or YAML)
Parse the specification
Extract all endpoints (paths)
For each endpoint:

HTTP method
Path with parameters
Description
Parameters (query, path, header, body)
Request schema (requestBody)
Response schema (responses)
Expected status codes
Required security

Store in the database (avoid duplicates)

Outgoing communication:

test-service: Delete tests when endpoint is deleted

Feign Clients:
java@FeignClient(name = "test-service")
TestServiceClient

6. AI-SERVICE / generate-test-service (Port 8084) - Flask
Role: Intelligent test generation via internal AI
Responsibilities:

Generate 6 types of tests for each endpoint
Create realistic and contextual payloads (not random)
Use AI to understand the business domain

Technologies:

Flask (Python)
Adapter trained on the Qwen2.5-1.5B-Instruct model
No database (stateless)

Generated test types:

POSITIVE (Happy Path)

Valid and complete data
Expect code 200/201


WRONG_TYPE (Wrong types)

Incorrect types (string instead of integer)
Expect code 400


MISSING_FIELDS (Missing fields)

Omitted required fields
Expect code 400


VALIDATION (Validation)

Out-of-range values, incorrect formats
Expect code 400


BOUNDARY (Boundary cases)

Min/max values
Expect code 200 or 400 depending on constraints


AUTH (Security)

Tests without authentication
Expect code 401



Main endpoint:
POST /generate-tests
Body: [
  {/* Lines omitted intentionally */}
]

Response: [
  {/* Lines omitted intentionally */}
]

Outgoing communication: None (called by test-service)

7. TEST-SERVICE (Port 8084)
Role: Intermediate service between endpoint-service and ai-service
Responsibilities:

Fetch endpoints from endpoint-service
Call ai-service to generate tests
Store the 6 generated tests in the database
CRUD for tests
Regenerate tests

Database: PostgreSQL (testai_tests)
Main entities:
javaTest {
    UUID id
    UUID projectId
    UUID endpointId
    String endpointPath
    
    // 6 tests stored as JSONB
    Map<String, Object> positive
    Map<String, Object> wrongType
    Map<String, Object> missingFields
    Map<String, Object> validation
    Map<String, Object> boundary
    Map<String, Object> auth
}
Structure of a test:
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
Key endpoints:
POST   /api/tests/generate            - Generate tests (calls AI)
GET    /api/tests                     - List all tests
GET    /api/tests/{projectId}         - Tests for a project
GET    /api/tests/{projectId}/{endpointId} - Tests for an endpoint
PUT    /api/tests/update              - Update tests
DELETE /api/tests/{projectId}         - Delete project tests
DELETE /api/tests/{projectId}/{endpointId} - Delete endpoint tests
Generation flow:
1. Frontend → POST /api/tests/generate with endpoint list
2. test-service → Calls ai-service (Flask) with schemas
3. ai-service → Local model generates 6 tests per endpoint
4. ai-service → Returns JSON with tests
5. test-service → Parses and stores in DB
6. test-service → Returns summary to frontend
Outgoing communication:

oi-service (Flask): Generate tests via AI

Feign Clients:
java@FeignClient(name = "ai-service", url = "http://localhost:8084")
GenerateTestClient
7. TEST-SERVICE (Port 8084)
Role: Intermediate service between endpoint-service and ai-service
Responsibilities:

Fetch endpoints from endpoint-service
Call ai-service to generate tests
Store the 6 generated tests in the database
CRUD for tests
Regenerate tests

Database: PostgreSQL (testai_tests)
Main entities:
javaTest {
    UUID id
    UUID projectId
    UUID endpointId
    String endpointPath
    
    // 6 tests stored as JSONB
    Map<String, Object> positive
    Map<String, Object> wrongType
    Map<String, Object> missingFields
    Map<String, Object> validation
    Map<String, Object> boundary
    Map<String, Object> auth
}
Structure of a test:
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
Key endpoints:
POST   /api/tests/generate            - Generate tests (calls AI)
GET    /api/tests                     - List all tests
GET    /api/tests/{projectId}         - Tests for a project
GET    /api/tests/{projectId}/{endpointId} - Tests for an endpoint
PUT    /api/tests/update              - Update tests
DELETE /api/tests/{projectId}         - Delete project tests
DELETE /api/tests/{projectId}/{endpointId} - Delete endpoint tests
Generation flow:
1. Frontend → POST /api/tests/generate with endpoint list
2. test-service → Calls ai-service (Flask) with schemas
3. ai-service → Local model generates 6 tests per endpoint
4. ai-service → Returns JSON with tests
5. test-service → Parses and stores in DB
6. test-service → Returns summary to frontend
Outgoing communication:

oi-service (Flask): Generate tests via AI

Feign Clients:
java@FeignClient(name = "ai-service", url = "http://localhost:8084")
GenerateTestClient

8. EXECUTION-SERVICE (Port 8085)
Role: Test execution and history management
Responsibilities:

Execute a single test (TestExecutionService)
Execute all project tests in batch (ProjectExecutionService)
Store execution results
Manage execution history
Generate PDF reports

Database: PostgreSQL (testai_executions)
Main entities:
javaTestExecution {
    UUID id
    UUID projectId
    UUID endpointId
    String endpointPath
    String httpMethod
    TestType testType (POSITIVE, WRONG_TYPE, ...)
    
    // Sent request
    String requestUrl
    Map<String, String> requestHeaders
    Map<String, Object> requestBody
    
    // Received response
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
    
    // Metadata
    UUID executedBy
    Instant executedAt
    String executionContext (manual, scheduled, ci_cd)
    UUID executionId (linked to ProjectExecution)
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
    
    // Stats by type
    Integer positiveTests, positivePassedTests
    Integer wrongTypeTests, wrongTypePassedTests
    Integer missingFieldsTests, missingFieldsPassedTests
    Integer boundaryTests, boundaryPassedTests
    Integer validationTests, validationPassedTests
    Integer authTests, authPassedTests
}
Key endpoints:
POST   /api/executions/execute                    - Execute one test
POST   /api/executions/execute-project            - Execute full project
GET    /api/executions/project/{projectId}        - Project history
GET    /api/executions/{executionId}              - Execution details
GET    /api/executions/{executionId}/test-executions - Tests for an execution
GET    /api/executions/{executionId}/logs         - Real-time logs
DELETE /api/executions/project/{projectId}        - Delete history
Test execution flow:
1. Fetch Project (URL + credentials)
2. Fetch Endpoint (method, path)
3. Fetch generated Test (payload, expectedStatus)
4. Build full URL (base + path + pathParams + queryParams)
5. Build headers (auth + test headers)
6. Prepare HTTP entity (with or without body depending on method)
7. EXECUTE HTTP call to real API using RestTemplate
8. Capture response (200, 400, 401, 500...)
9. Validate: expectedStatus == actualStatus?
10. Save TestExecution in DB
11. Return result
Authentication handling:
switch (authType) {
  case "BASIC":
    headers.set("Authorization", "Basic " + base64(user:pass))
  case "APIKEY":
    if (location == "HEADER")
      headers.set(apiKeyHeader, apiKey)
  case "BEARER":
    headers.set("Authorization", "Bearer " + token)
}
Asynchronous execution:
For full projects (ProjectExecutionService):

Uses @Async and CompletableFuture
Creates ProjectExecution in DB (status = RUNNING)
Launches background execution
Updates ProjectExecution at completion (status = COMPLETED)
Stores all TestExecution

Outgoing communication:

project-service: Fetch project + credentials
endpoint-service: Fetch endpoints
test-service: Fetch generated tests
External API: Execute real tests

Feign Clients:
java@FeignClient(name = "project-service")
ProjectServiceClient

@FeignClient(name = "endpoint-service")
EndpointServiceClient

@FeignClient(name = "test-service")
TestServiceClient
PDF report generation:
SingleReportService:

Generates PDF report for an endpoint
Uses OpenPDF (iText fork)
Colored tables, status badges
Sections: Project Info, Endpoint Details, Test Executions
Export via endpoint: GET /api/reports/endpoint/{endpointId}
9. ADMIN-SERVICE (Port 8087)
Role: Centralized supervision and administration
Responsibilities:

Manage users (list, details, activation, deletion)
Access execution metrics and PDF reports
Manage projects and shares
Provide secure admin endpoints

Technologies:

Spring Boot 3.2
PostgreSQL
OpenFeign to communicate with user-service, project-service, and execution-service

Key endpoints:
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
Role: User notifications and alerts management
Responsibilities:

Send notifications to users
List and count unread notifications
Mark notifications as read
Maintain notification history

Technologies:

Spring Boot 3.2
PostgreSQL

Key endpoints:
POST   /api/notifications/send
GET    /api/notifications/user/{userId}
GET    /api/notifications/user/{userId}/unread-count
PUT    /api/notifications/{id}/read
PUT    /api/notifications/user/{userId}/read-all

💻 TECHNOLOGIES USED
Backend
Service | Framework | Language | Database
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

Libraries Spring
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

React 18 with TypeScript
Vite (build tool)
Tailwind CSS (styling)
React Router (routing)
Axios (HTTP client)
Recharts (graphs)

Infrastructure

Docker & Docker Compose
PostgreSQL (databases)
Keycloak (authentication)
Nginx (reverse proxy for the frontend)
│   │   ├── entity/
│   │   │   └── Test.java
│   │   ├── repository/
│   │   ├── feignclient/
│   │   │   └── GenerateTestClient.java (Flask AI)
│   │   └── dto/
│   ├── Dockerfile
│   └── pom.xml
│
├── execution-service/                # Test execution
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
├── admin-service/                    # Administration service
│   ├── src/main/java/
│   ├── src/main/resources/
│   ├── Dockerfile
│   └── pom.xml
│
├── notification-service/             # Notification service
│   ├── src/main/java/
│   ├── src/main/resources/
│   ├── Dockerfile
│   └── pom.xml
│
├── generate-test-service/            # AI / test generation service
│   ├── app.py                        # Entry point
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
├── testai-frontend/                  # Main user interface
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
└── testai-frontend-admin/            # Admin interface
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

🔗 INTER-SERVICE COMMUNICATION
OpenFeign: Synchronous communication
Principle:

Feign Client = Java interface annotated
Automatically generates HTTP code
Uses Eureka to resolve URLs
Automatic load balancing

Example:
java// In project-service
@FeignClient(name = "endpoint-service", path = "/api/endpoints")
public interface EndpointServiceClient {
    
    @GetMapping("/project/{projectId}")
    List<EndpointDTO> getEndpointsByProjectId(@PathVariable UUID projectId);
    
    @DeleteMapping("/project/{projectId}")
    Map<String, Object> deleteEndpointsByProjectId(@PathVariable UUID projectId);
}

// Usage
@Autowired
private EndpointServiceClient endpointServiceClient;

public void scanEndpoints(UUID projectId) {
    List<EndpointDTO> endpoints = endpointServiceClient.getEndpointsByProjectId(projectId);
}
What happens:
1. project-service calls endpointServiceClient.getEndpointsByProjectId(projectId)
2. Feign asks Eureka: "Where is endpoint-service?"
3. Eureka replies: "http://endpoint-service:8083"
4. Feign does: GET http://endpoint-service:8083/api/endpoints/project/{projectId}
5. endpoint-service responds with JSON
6. Feign deserializes into List<EndpointDTO>
7. project-service receives the list

Dependency graph
user-service
    └── (no dependency)

project-service
    ├── user-service (verify users)
    ├── endpoint-service (scan/fetch endpoints)
    ├── test-service (delete tests)
    ├── execution-service (delete executions)
    └── notification-service (send alerts)

endpoint-service
    └── test-service (delete tests)

test-service
    └── ai-service / generate-test-service (generate tests via Qwen2.5-1.5B-Instruct)

execution-service
    ├── project-service (fetch project + credentials)
    ├── endpoint-service (fetch endpoints)
    └── test-service (fetch tests)

ai-service / generate-test-service (Flask)
    └── (no dependency - called by test-service)

Circuit Breaker & Resilience
Uses Resilience4j to manage failures:
java@CircuitBreaker(name = "endpoint-service", fallbackMethod = "getEndpointsFallback")
public List<EndpointDTO> getEndpoints(UUID projectId) {
    return endpointServiceClient.getEndpointsByProjectId(projectId);
}

public List<EndpointDTO> getEndpointsFallback(UUID projectId, Exception e) {
    log.error("endpoint-service unavailable: {}", e.getMessage());
    return Collections.emptyList();
}

💾 DATABASES
Global schema
Each service has its own database (Database per Service pattern).
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

Table details
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

🌐 API ENDPOINTS
Full documentation
All endpoints are documented in each service's Swagger UI.
Swagger access:
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
🐳 DOCKER & DEPLOYMENT
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

Commands Docker
bash# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f [service-name]

# Rebuild a service
docker-compose up -d --build [service-name]

# View service status
docker-compose ps

Startup order
1. postgres
2. eureka-server (waits for health check)
3. api-gateway (waits for eureka)
4. user-service, project-service, endpoint-service, test-service, execution-service, admin-service, notification-service
5. ai-service / generate-test-service
6. frontend

🛠️ DEVELOPMENT GUIDE
Prerequisites

Java 17+
Maven 3.8+
Node.js 18+
Docker & Docker Compose
Python 3.12+ (for generate-test-service)
PostgreSQL 15+

Local setup
1. Clone the project
bashgit clone https://github.com/your-org/testai.git
cd testai
2. Create databases
sqlCREATE DATABASE testai_users;
CREATE DATABASE testai_projects;
CREATE DATABASE testai_endpoints;
CREATE DATABASE testai_tests;
CREATE DATABASE testai_executions;
3. Configure environment variables
Create .env at the root:
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
4. Start services locally
Option A: With Docker Compose (recommended)
bashdocker-compose up -d
Option B: Manually
bash# Eureka Server
cd eureka-server
mvn spring-boot:run

# API Gateway
cd api-gateway
mvn spring-boot:run

# User Service
cd user-service
mvn spring-boot:run

# ... other services
5. Start AI Service (Flask)
cd generate-test-service
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app.py
6. Start Frontend
bashcd frontend
npm install
npm run dev
Workflow

Create a branch:

bashgit checkout -b feature/branch-name

Develop:

Modify the code
Test locally
Commit frequently

Tests:

bash# Unit tests
mvn test

# Integration tests
mvn verify

Push & Pull Request:

bashgit push origin feature/branch-name

Code Review then Merge

🎯 MAIN FEATURES
1. Automatic API discovery
Workflow:
1. Manager creates a project with Swagger URL
2. project-service triggers automatic scan
3. endpoint-service downloads and parses Swagger
4. Extract all endpoints
5. Store in DB with complete schemas
Benefit: 90% reduction in setup time (6h → 30min for 100 endpoints)

2. Intelligent test generation
Workflow:
1. Manager clicks "Generate tests" for an endpoint
2. Frontend → test-service with endpointId
3. test-service retrieves schemas from endpoint-service
4. test-service → ai-service (Flask) with schemas
5. ai-service → Qwen2.5-1.5B-Instruct generates 6 realistic tests
6. test-service stores tests in DB
7. Frontend displays the 6 generated tests
Difference example:
Schemathesis (random):
json{
  "firstName": "xKj8P2qL",
  "email": "test@test.com",
  "age": 999999
}
TestAI (AI - realistic):
json{
  "firstName": "Sophie",
  "lastName": "Martin",
  "email": "sophie.martin@example.com",
  "age": 32,
  "phoneNumber": "+33612345678",
  "address": "15 Republic Street, 75001 Paris"
}
Benefit: 95% time reduction + better quality

3. Simplified execution
Workflow - Single test:
1. Manager clicks "Execute" on a POSITIVE test
2. Frontend → execution-service with testType
3. execution-service retrieves:
   - Project (URL + credentials)
   - Endpoint (method + path)
   - Test (payload + expectedStatus)
4. Builds full HTTP request
5. EXECUTES call to real API (RestTemplate)
6. Validates response (expectedStatus == actualStatus?)
7. Saves TestExecution in DB
8. Returns result to frontend
Workflow - Full project:
1. Manager clicks "Execute whole project"
2. Frontend → execution-service
3. Creates ProjectExecution (status=RUNNING)
4. Launches asynchronous execution (@Async)
5. For each endpoint:
   - Executes 6 tests
   - Saves each TestExecution
6. Updates ProjectExecution (status=COMPLETED)
7. Frontend displays results + statistics

4. Multi-role collaboration
Sharing workflow:
1. Manager clicks "Share project"
2. Enters developer email + access level (READ_ONLY/READ_WRITE)
3. project-service creates SharedAccess (status=PENDING)
4. Email sent to developer with invitation link
5. Developer clicks link → acceptance
6. If not registered yet: automatic account creation
7. SharedAccess updated (status=ACTIVE, developerUserId set)
8. Developer sees the project in "Projects shared with me"
Access levels:

READ_ONLY : View endpoints/tests/history
READ_WRITE : + Generate tests + Execute tests

5. History & traceability
Structure:
ProjectExecution (full batch)
├── Test 1 → TestExecution
├── Test 2 → TestExecution
├── Test 3 → TestExecution
└── ... → 50 TestExecution
Frontend displays:

List of ProjectExecution (date, success rate)
Click on execution → Details:

Chart (Passed / Failed / Errors)
Table of TestExecution
For each test: request sent + response received

Benefit: Reproducibility guaranteed + easier debugging

6. PDF reports
Service: SingleReportService in execution-service
Generation:
GET /api/reports/endpoint/{endpointId}

→ Generates PDF with:
  - Project Info (table)
  - Endpoint Details (table)
  - Test Executions (colored tables)
    * Metadata
    * Expected vs Actual
    * Request Sent
    * Response Received
    * Errors
Format:

Tables with alternating colors
Status badges (green/red/orange)
Code blocks for JSON
Multi-page

🔐 AUTHENTICATION & SECURITY
Keycloak
Role: Centralized authentication server
Configuration:
Realm: testai
Client: testai-app
Roles: MANAGER, GUEST, ADMIN
Signup workflow:
1. User fills the form (name, email, password, phone)
2. user-service hashes password (BCrypt)
3. user-service creates User in DB (role=MANAGER by default)
4. Sends email verification code (6 digits)
5. Sends SMS verification code via Twilio
6. User enters codes → emailVerified = true, phoneVerified = true
7. user-service → Keycloak to create user
8. Returns JWT
JWT Token:
json{
  "sub": "user-uuid",
  "email": "user@example.com",
  "role": "MANAGER",
  "exp": 1735689600
}
API credentials security
Storage:

Credentials stored in api_credentials table
Encryption option available (encrypted column)
OneToOne with Project (cascade delete)

Usage:

Retrieved only during test execution
Never exposed in API responses

📈 METRICS & MONITORING
Actuator Endpoints
All services expose:
GET /actuator/health       - Service health
GET /actuator/metrics      - Metrics (CPU, memory, etc.)
GET /actuator/info         - Version info
Business metrics
In execution-service:

Overall success rate by project
Average response time
Number of tests executed per day
Most tested endpoints

🚀 PRODUCTION DEPLOYMENT
Deployment architecture
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
    [Spring Boot services in cluster]
        │                │                │
        └────────────────┼────────────────┘
                         │
                    ┌────┴────┐
                    │PostgreSQL│
                    │ Cluster │
                    └─────────┘
Checklist for production

Variables of environment (secrets)
HTTPS (Let's Encrypt)
Database: automatic backups
Centralized logs (ELK Stack)
Monitoring (Prometheus + Grafana)
Rate limiting on Gateway
Circuit breakers configured
Health checks on all services
Horizontal scaling (Kubernetes)

📚 RESOURCES
Resources

Spring Cloud : https://spring.io/projects/spring-cloud
OpenFeign : https://spring.io/projects/spring-cloud-openfeign
Eureka : https://spring.io/guides/gs/service-registration-and-discovery/
Flask : https://flask.palletsprojects.com/
OpenAPI Spec : https://swagger.io/specification/

Testing tools

Postman : https://www.postman.com/
Swagger UI : http://localhost:8081/swagger-ui.html
Eureka Dashboard : http://localhost:8761

👨‍💻 TECHNOLOGIES USED

Backend : Spring Boot microservices architecture
Frontend : React + TypeScript
AI Service : Flask + Qwen2.5-1.5B-Instruct adapter
DevOps : Docker + Docker Compose

👥 CONTRIBUTORS

Ghada Fatnassi
