MÉTHODE PRINCIPALE : executeTest()
Signature
javapublic ExecuteTestResponse executeTest(ExecuteTestRequest request)
Entrée (ExecuteTestRequest) :
json{
  "projectId": "uuid-du-projet",
  "endpointId": "uuid-de-endpoint",
  "testType": "POSITIVE",  // ou WRONG_TYPE, MISSING_FIELDS, etc.
  "executedBy": "uuid-du-user"
}
Sortie (ExecuteTestResponse) :
json{
  "executionId": "uuid-de-execution",
  "status": "SUCCESS",
  "statusCode": 201,
  "passed": true,
  "responseTimeMs": 234,
  "responseBody": {"id": 104, "status": "approved"},
  "errorMessage": null
}

🔍 EXPLICATION DÉTAILLÉE PAR ÉTAPES
ÉTAPE 1 : Log de début + Timer
javalog.info("🚀 Exécution test: projectId={}, endpointId={}, type={}",
    request.getProjectId(), request.getEndpointId(), request.getTestType());

Instant startTime = Instant.now();
Pourquoi ?

Log : Pour tracer l'exécution dans les logs (debugging)
startTime : Pour calculer le temps total d'exécution

Exemple de log :
🚀 Exécution test: projectId=f76b2b94-0db5-40cc-99b2-ff27477152bf, 
                   endpointId=d43205fc-c66d-404d-8b3e-e1661050a617, 
                   type=POSITIVE

ÉTAPE 2 : Récupération des données via Feign
javaProjectDTO project = projectServiceClient.getProjectById(request.getProjectId());
EndpointDTO endpoint = endpointServiceClient.getEndpointById(request.getEndpointId());
TestDTO tests = testServiceClient.getTestsByProjectIdAndEndpointId(
    request.getProjectId(), request.getEndpointId());
Ce qui se passe :

Appel à project-service → Récupère le projet avec URL de base + credentials
Appel à endpoint-service → Récupère l'endpoint (méthode, path)
Appel à test-service → Récupère TOUS les tests générés pour cet endpoint

Exemple de données récupérées :
ProjectDTO :
json{
  "id": "f76b2b94-...",
  "name": "Petstore API",
  "projectUrl": "https://petstore.swagger.io/v2",
  "authType": "BEARER",
  "credentials": {
    "bearerToken": "abc123xyz"
  }
}
EndpointDTO :
json{
  "id": "d43205fc-...",
  "method": "POST",
  "path": "/store/order",
  "requiresAuth": false
}
TestDTO (6 tests) :
json{
  "positive": {...},
  "wrongType": {...},
  "missingFields": {...},
  "validation": {...},
  "boundary": {...},
  "auth": null
}

ÉTAPE 3 : Sélection du test à exécuter
javaMap<String, Object> testData = selectTest(tests, request.getTestType());
if (testData == null) {
    throw new RuntimeException("Test type " + request.getTestType() + " not found");
}
Méthode selectTest() :
javaprivate Map<String, Object> selectTest(TestDTO tests, String testType) {
    return switch (testType.toUpperCase()) {
        case "POSITIVE" -> tests.getPositive();
        case "WRONG_TYPE" -> tests.getWrongType();
        case "MISSING_FIELDS" -> tests.getMissingFields();
        case "VALIDATION" -> tests.getValidation();
        case "BOUNDARY" -> tests.getBoundary();
        case "AUTH" -> tests.getAuth();
        default -> null;
    };
}
Ce qui se passe :

Si testType = "POSITIVE" → Retourne le test positive
Si testType = "WRONG_TYPE" → Retourne le test wrongType
etc.

Exemple de testData sélectionné :
json{
  "category": "POSITIVE",
  "response": {
    "name": "Place an order - Valid data",
    "headers": {
      "Authorization": "Bearer valid_test_token"
    },
    "payload": {
      "id": 104,
      "petId": 39,
      "status": "approved"
    },
    "pathParams": {},
    "queryParams": {},
    "expectedStatus": 201
  }
}

ÉTAPE 4 : Extraction de l'objet "response"
javaMap<String, Object> responseObj = (Map<String, Object>) testData.get("response");
if (responseObj == null) {
    throw new RuntimeException("Missing 'response' field in test data");
}
Pourquoi ?
Tous les tests ont la structure suivante :
json{
  "category": "...",
  "response": {  ← C'EST ÇA QU'ON EXTRAIT
    "payload": {...},
    "headers": {...},
    "expectedStatus": 201
  }
}
responseObj contient maintenant :
json{
  "name": "Place an order - Valid data",
  "headers": {"Authorization": "Bearer valid_test_token"},
  "payload": {"id": 104, "petId": 39, "status": "approved"},
  "pathParams": {},
  "queryParams": {},
  "expectedStatus": 201
}

ÉTAPE 5 : Construction de l'URL complète
java// 1. Récupérer le path de l'endpoint
String fullPath = endpoint.getPath();  // "/store/order/{orderId}"

// 2. Remplacer les paramètres de path
Map<String, Object> pathParams = (Map<String, Object>) 
    responseObj.getOrDefault("pathParams", Map.of());

for (Map.Entry<String, Object> entry : pathParams.entrySet()) {
    fullPath = fullPath.replace("{" + entry.getKey() + "}", 
                                entry.getValue().toString());
}

// 3. Ajouter les query parameters
String queryString = "";
Map<String, Object> queryParams = (Map<String, Object>) 
    responseObj.getOrDefault("queryParams", Map.of());

if (!queryParams.isEmpty()) {
    queryString = "?" + queryParams.entrySet().stream()
        .map(e -> e.getKey() + "=" + e.getValue())
        .collect(Collectors.joining("&"));
}

// 4. URL complète = base + path + query
String fullUrl = project.getProjectUrl() + fullPath + queryString;
Exemple concret :
Cas 1 : POST sans path params
endpoint.getPath() = "/store/order"
pathParams = {}
queryParams = {}

→ fullUrl = "https://petstore.swagger.io/v2/store/order"
Cas 2 : GET avec path param
endpoint.getPath() = "/store/order/{orderId}"
pathParams = {"orderId": 521}
queryParams = {}

→ fullPath = "/store/order/521"
→ fullUrl = "https://petstore.swagger.io/v2/store/order/521"
Cas 3 : GET avec path + query params
endpoint.getPath() = "/pet/findByStatus"
pathParams = {}
queryParams = {"status": "available", "limit": 10}

→ fullPath = "/pet/findByStatus"
→ queryString = "?status=available&limit=10"
→ fullUrl = "https://petstore.swagger.io/v2/pet/findByStatus?status=available&limit=10"

ÉTAPE 6 : Construction des headers
java// 1. Headers de base + auth (si nécessaire)
HttpHeaders headers = buildHeaders(project, endpoint);

// 2. Ajouter les headers spécifiques du test
Map<String, String> testHeaders = (Map<String, String>) 
    responseObj.getOrDefault("headers", Map.of());
testHeaders.forEach(headers::set);
Méthode buildHeaders() :
javaprivate HttpHeaders buildHeaders(ProjectDTO project, EndpointDTO endpoint) {
    HttpHeaders headers = new HttpHeaders();
    headers.setContentType(MediaType.APPLICATION_JSON);  // Toujours JSON

    // Ajouter authentification si nécessaire
    if (Boolean.TRUE.equals(endpoint.getRequiresAuth()) && 
        project.getCredentials() != null) {
        
        ApiCredentialsDTO creds = project.getCredentials();
        
        switch (project.getAuthType()) {
            case "BASIC":
                String auth = creds.getBasicUsername() + ":" + creds.getBasicPassword();
                String encoded = Base64.getEncoder().encodeToString(auth.getBytes());
                headers.set("Authorization", "Basic " + encoded);
                break;
                
            case "APIKEY":
                if ("HEADER".equals(creds.getApiKeyLocation())) {
                    headers.set(creds.getApiKeyHeader(), creds.getApiKey());
                }
                break;
                
            case "BEARER":
                headers.set("Authorization", "Bearer " + creds.getBearerToken());
                break;
        }
    }
    return headers;
}
Exemple de headers finaux :
Content-Type: application/json
Authorization: Bearer valid_test_token

ÉTAPE 7 : Préparation de l'entité HTTP
javaHttpEntity<?> entity;
String method = endpoint.getMethod();

if ("GET".equalsIgnoreCase(method) || "DELETE".equalsIgnoreCase(method)) {
    // GET/DELETE → Pas de body
    entity = new HttpEntity<>(headers);
} else {
    // POST/PUT → Avec body
    Object payload = responseObj.get("payload");
    entity = new HttpEntity<>(payload, headers);
}
Pourquoi cette distinction ?

GET/DELETE : Ne peuvent PAS avoir de body HTTP
POST/PUT/PATCH : Peuvent avoir un body

Exemple :
POST :
javaentity = new HttpEntity<>(
    {"id": 104, "petId": 39, "status": "approved"},  // Body
    headers                                           // Headers
)
GET :
javaentity = new HttpEntity<>(headers)  // Seulement headers, pas de body

ÉTAPE 8 : EXÉCUTION de la requête HTTP ⭐⭐⭐
javalong execStart = System.currentTimeMillis();  // Timer début
ResponseEntity<Map> response;

try {
    // APPEL HTTP RÉEL vers l'API
    response = restTemplate.exchange(
        fullUrl,                                  // URL complète
        HttpMethod.valueOf(method.toUpperCase()), // POST, GET, etc.
        entity,                                   // Headers + Body
        Map.class                                 // Type de réponse attendu
    );
    
} catch (HttpClientErrorException | HttpServerErrorException ex) {
    // Si l'API retourne 4xx ou 5xx, on capture quand même
    response = new ResponseEntity<>(
        parseBody(ex.getResponseBodyAsString()),  // Body de l'erreur
        ex.getResponseHeaders(),                  // Headers
        ex.getStatusCode()                        // Code (400, 401, etc.)
    );
}

long responseTimeMs = System.currentTimeMillis() - execStart;  // Timer fin
Ce qui se passe :
Scénario 1 : Succès (200/201) ✅
RestTemplate appelle : POST https://petstore.swagger.io/v2/store/order
Réponse : 201 Created
Body : {"id": 104, "status": "approved", "complete": true}

→ response contient la réponse complète
Scénario 2 : Erreur attendue (400) ⚠️
RestTemplate appelle : POST https://petstore.swagger.io/v2/store/order
Réponse : 400 Bad Request
Body : {"error": "Missing required field: petId"}

→ HttpClientErrorException levée
→ Capturée dans le catch
→ response contient quand même la réponse
Pourquoi capturer les exceptions ?

Pour certains tests (WRONG_TYPE, MISSING_FIELDS), on ATTEND une erreur 400
Si on ne capturait pas, le test planterait alors qu'il devrait réussir !


ÉTAPE 9 : Validation de la réponse
javaInteger expectedStatus = (Integer) responseObj.get("expectedStatus");
TestValidationResult validation = validateResponse(response, expectedStatus);
Méthode validateResponse() :
javaprivate TestValidationResult validateResponse(
    ResponseEntity<Map> response, 
    Integer expectedStatus
) {
    TestValidationResult result = new TestValidationResult();
    
    int actualCode = response.getStatusCode().value();  // Code reçu
    boolean statusMatch = expectedStatus != null && 
                          expectedStatus.equals(actualCode);
    
    result.setStatusCodeMatch(statusMatch);
    result.setSchemaValidationPassed(true);  // TODO: Valider JSON Schema
    result.setPassed(statusMatch);
    
    if (!statusMatch) {
        Map<String, Object> errors = new HashMap<>();
        errors.put("status_code", 
            "Expected " + expectedStatus + " but got " + actualCode);
        result.setValidationErrors(errors);
    }
    
    return result;
}
Exemple :
Test POSITIVE :
expectedStatus = 201
actualCode = 201
→ statusMatch = true
→ passed = true
→ validationErrors = null
Test WRONG_TYPE :
expectedStatus = 400
actualCode = 400
→ statusMatch = true
→ passed = true  (✅ Le test a RÉUSSI car on attendait 400)
→ validationErrors = null
Test échoué :
expectedStatus = 201
actualCode = 500
→ statusMatch = false
→ passed = false
→ validationErrors = {"status_code": "Expected 201 but got 500"}

ÉTAPE 10 : Sauvegarde dans la DB
javaTestExecution execution = saveExecution(
    request, project, endpoint, fullUrl,
    entity, response, responseTimeMs, validation, startTime
);
Méthode saveExecution() :
javaprivate TestExecution saveExecution(...) {
    TestExecution execution = TestExecution.builder()
        // Identifiants
        .projectId(request.getProjectId())
        .endpointId(request.getEndpointId())
        .endpointPath(endpoint.getPath())
        .httpMethod(endpoint.getMethod())
        .testType(TestType.valueOf(request.getTestType().toUpperCase()))
        
        // Requête envoyée
        .requestUrl(fullUrl)
        .requestHeaders(extractHeaders(entity.getHeaders()))
        .requestBody(entity.getBody() instanceof Map ? 
                     (Map<String, Object>) entity.getBody() : null)
        
        // Réponse reçue
        .responseStatusCode(response.getStatusCode().value())
        .responseHeaders(extractHeaders(response.getHeaders()))
        .responseBody(response.getBody())  // ⭐ RÉPONSE DE L'API
        .responseTimeMs(responseTimeMs)
        
        // Validation
        .statusCodeMatch(validation.isStatusCodeMatch())
        .schemaValidationPassed(validation.isSchemaValidationPassed())
        .status(validation.isPassed() ? TestStatus.SUCCESS : TestStatus.FAILED)
        .errorMessage(validation.isPassed() ? null : "Test failed")
        .validationErrors(validation.getValidationErrors())
        
        // Métadonnées
        .executedBy(request.getExecutedBy())
        .executionContext("manual")
        .build();
    
    return executionRepository.save(execution);
}
Ce qui est sauvegardé en DB :
json{
  "id": "execution-uuid",
  "projectId": "f76b2b94-...",
  "endpointId": "d43205fc-...",
  "endpointPath": "/store/order",
  "httpMethod": "POST",
  "testType": "POSITIVE",
  
  "requestUrl": "https://petstore.swagger.io/v2/store/order",
  "requestHeaders": {"Content-Type": "application/json", "Authorization": "Bearer ..."},
  "requestBody": {"id": 104, "petId": 39, "status": "approved"},
  
  "responseStatusCode": 201,
  "responseHeaders": {"Content-Type": "application/json"},
  "responseBody": {"id": 104, "status": "approved", "complete": true},
  "responseTimeMs": 234,
  
  "expectedStatusCode": 201,
  "statusCodeMatch": true,
  "status": "SUCCESS",
  "errorMessage": null,
  
  "executedBy": "user-uuid",
  "executedAt": "2025-04-03T10:00:00Z",
  "executionContext": "manual"
}

ÉTAPE 11 : Retour de la réponse
javareturn ExecuteTestResponse.builder()
    .executionId(execution.getId())
    .status(execution.getStatus().name())  // "SUCCESS"
    .statusCode(execution.getResponseStatusCode())  // 201
    .passed(validation.isPassed())  // true
    .responseTimeMs(responseTimeMs)  // 234
    .responseBody(execution.getResponseBody())  // {...}
    .errorMessage(execution.getErrorMessage())  // null
    .validationErrors(execution.getValidationErrors())  // null
    .build();
Cette réponse est envoyée au frontend pour affichage !

🔴 GESTION DES ERREURS
java} catch (Exception e) {
    log.error("❌ Erreur exécution test: {}", e.getMessage(), e);
    TestExecution errorExecution = saveError(request, e, startTime);
    
    return ExecuteTestResponse.builder()
        .executionId(errorExecution.getId())
        .status("ERROR")
        .passed(false)
        .errorMessage(e.getMessage())
        .build();
}
Quand ça arrive ?

L'API est down (timeout, connexion refusée)
URL invalide
Problème réseau
Bug dans le code

Ce qui est sauvegardé :
json{
  "status": "ERROR",
  "errorMessage": "Connection timeout: petstore.swagger.io"
}

📊 EXEMPLE COMPLET - FLUX DE A À Z
Requête initiale
jsonPOST /api/executions/execute
{
  "projectId": "f76b2b94-...",
  "endpointId": "d43205fc-...",
  "testType": "POSITIVE",
  "executedBy": "user-123"
}
Étapes internes
1. Récupère Project : {projectUrl: "https://petstore.swagger.io/v2", authType: "NONE"}
2. Récupère Endpoint : {method: "POST", path: "/store/order"}
3. Récupère Tests : {positive: {...}, wrongType: {...}, ...}
4. Sélectionne test POSITIVE
5. Extrait responseObj : {payload: {...}, expectedStatus: 201}
6. Construit URL : "https://petstore.swagger.io/v2/store/order"
7. Construit headers : {"Content-Type": "application/json"}
8. Crée entity : HttpEntity(payload, headers)
9. APPELLE l'API réelle : POST https://petstore.swagger.io/v2/store/order
10. Reçoit réponse : 201 Created, body: {"id": 104, "status": "approved"}
11. Valide : expectedStatus(201) == actualCode(201) → PASSED
12. Sauvegarde en DB
13. Retourne résultat
Réponse finale
json{
  "executionId": "exec-uuid",
  "status": "SUCCESS",
  "statusCode": 201,
  "passed": true,
  "responseTimeMs": 234,
  "responseBody": {
    "id": 104,
    "status": "approved",
    "complete": true
  },
  "errorMessage": null
}

✅ POINTS CLÉS À RETENIR

RestTemplate fait l'appel HTTP réel vers l'API externe
Try-catch capture les erreurs 4xx/5xx (attendues pour certains tests)
Validation compare expectedStatus vs actualCode
Sauvegarde complète : requête + réponse + résultat
executedBy permet de tracer qui a lancé le test
responseBody contient la VRAIE réponse de l'API (pas le test)


Voilà ! Maintenant tu peux expliquer clairement à ton binôme ! 🚀