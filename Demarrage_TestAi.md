# 🚀 TestAI — Guide de démarrage de la plateforme

---

## 1. Cloner le projet

```bash
git clone <url-du-repo>
cd testai
```

---

## 2. Lancer le backend (microservices)

Tous les microservices et leurs bases de données se trouvent dans le dossier `testai-backend`.

```bash
cd testai-backend
```

Avant de lancer, créez un fichier `.env` à la racine de `testai-backend` :

```env
OPENAI_API_KEY=sk-...          # Clé OpenAI pour la génération de tests IA

# Twilio (SMS)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_VERIFY_SERVICE_SID=Vxxxxxxxxxxxxxxxxxx

# Email (SMTP)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=votre.email@gmail.com
MAIL_PASSWORD=votre_mot_de_passe_app   # Mot de passe d'application Gmail
```

Lancez tous les services avec Docker Compose :

```bash
docker-compose up -d
```

> **Ordre de démarrage automatique :**  
> `PostgreSQL DBs` → `Eureka Server` → `Keycloak` → `Microservices Spring Boot` → `AI Service (Flask)` → `API Gateway`

---

## 3. Configurer Keycloak

Keycloak est accessible à : **http://localhost:8080**

### Connexion à la console admin
- **Utilisateur :** `admin`
- **Mot de passe :** `admin123`

### Vérification du realm
Keycloak importe automatiquement le realm `testai` depuis `./keycloak-init/realm-config.json`.  
Vérifiez dans **Realm Settings** que le realm `testai` est bien présent.

### Vérification des clients
Dans **Clients**, assurez-vous que `user-service` est présent avec :
- `Client Secret` : `0W791wbIPTtDR3v7noogqAFpBBsOZpw0`
- `Access Type` : `confidential`

---

## 4. Configurer le service Email

Le service email utilise SMTP (ex. Gmail). Pour Gmail, il faut générer un **mot de passe d'application** :

1. Activez la validation en deux étapes sur votre compte Google
2. Allez dans **Mon compte Google → Sécurité → Mots de passe des applications**
3. Générez un mot de passe pour « Autre (nom personnalisé) » → `TestAI`
4. Copiez le mot de passe généré dans `.env` → `MAIL_PASSWORD`

Les variables correspondantes dans `user-service` (déjà prises en charge via `.env`) :

```
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=votre.email@gmail.com
MAIL_PASSWORD=xxxx xxxx xxxx xxxx
```
ces config sont dans le  user-service\application.yml

---

## 5. Configurer Twilio (SMS)

Twilio est utilisé pour la vérification du numéro de téléphone lors de l'inscription.

1. Créez un compte sur [https://www.twilio.com](https://www.twilio.com)
2. Récupérez dans la console Twilio :
   - **Account SID** (commence par `AC`)
   - **Auth Token**
   - **Verify-service SID** 
3. Renseignez ces valeurs dans le fichier `.env`  :

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_VERIFY_SERVICE_SID=xxxxxxxxxxxxx```

---

## 6. Configurer PgAdmin (visualiser les bases de données)

PgAdmin est accessible à : **http://localhost:5050**

- **Email :** `admin@admin.com`
- **Mot de passe :** `admin123`

### Ajouter les serveurs de bases de données

Pour chaque base, faites **Ajouter un serveur** (clic droit sur *Servers → Register → Server*) avec les paramètres suivants :

| Nom du serveur     | Host                      | Port | Base de données    | Utilisateur | Mot de passe |
|--------------------|---------------------------|------|--------------------|-------------|--------------|
| `user-db`          | `testai-user-db`          | 5432 | `user_db`          | `postgres`  | `postgres`   |
| `project-db`       | `testai-project-db`       | 5432 | `project_db`       | `postgres`  | `postgres`   |
| `endpoint-db`      | `testai-endpoint-db`      | 5432 | `endpoint_db`      | `postgres`  | `postgres`   |
| `test-db`          | `testai-test-db`          | 5432 | `test_db`          | `postgres`  | `postgres`   |
| `execution-db`     | `testai-execution-db`     | 5432 | `execution_db`     | `postgres`  | `postgres`   |
| `notification-db`  | `testai-notification-db`  | 5432 | `notification_db`  | `postgres`  | `postgres`   |

> **Important :** Dans l'onglet **Connection**, le champ **Host name/address** doit contenir le nom du conteneur Docker (ex. `testai-user-db`), pas `localhost`.

---

## 7. Créer un compte Admin en base de données

La création d'un admin nécessite **deux étapes obligatoires** : d'abord dans Keycloak (pour l'authentification), ensuite en base de données (pour les droits applicatifs). Les deux doivent avoir le **même mot de passe**.
 
### Étape 1 — Créer l'utilisateur dans Keycloak
 
1. Connectez-vous à **http://localhost:8080** → console admin Keycloak (`admin` / `admin123`)
2. Sélectionnez le realm **`testai`**
3. Allez dans **Users → Add user**
4. Remplissez :
   - **Username :** `admin@testai.com`
   - **Email :** `admin@testai.com`
   - **Email verified :** `ON`
   - **First name / Last name :** `Admin` / `TestAI`
5. Cliquez **Save**
6. Allez dans l'onglet **Credentials** de cet utilisateur
7. Cliquez **Set password**
8. Entrez votre mot de passe (ex. `Admin123!`), désactivez **Temporary**, cliquez **Save**
### Étape 2 — Créer l'utilisateur en base de données
 
Connectez-vous à `user-db` via PgAdmin, ouvrez le **Query Tool** et exécutez :
 
```sql
INSERT INTO users (
    id,
    name,
    email,
    phone_number,
    role,
    keycloak_id,
    is_active,
    email_verified,
    phone_verified,
    phone_verification_attempts,
    password_reset_attempts,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'Admin TestAI',
    'admin@testai.com',        -- Doit être identique à l'email créé dans Keycloak
    '+21600000000',
    'ADMIN',
    'KEYCLOAK_USER_ID',        -- Remplacez par l'ID Keycloak (voir note ci-dessous)
    true,
    true,
    true,
    0,
    0,
    NOW(),
    NOW()
);
```
 
> **Récupérer le Keycloak ID :**  
> Dans la console Keycloak → **Users** → cliquez sur l'utilisateur admin créé à l'étape 1 → copiez la valeur du champ **ID** (format UUID) en haut de la page. Remplacez `'KEYCLOAK_USER_ID'` par cette valeur.
 
> **Pas de mot de passe en base :** L'authentification est entièrement gérée par Keycloak. La table `users` ne stocke pas de mot de passe — c'est le `keycloak_id` qui fait le lien entre les deux systèmes.
 
> **Important :** L'email doit être **identique** dans Keycloak et dans la base de données.
 



## 8. Inscription d'un Manager

Un Manager doit s'inscrire via l'interface utilisateur et **valider ses identifiants** pour accéder aux fonctionnalités de la plateforme :

1. Accéder à l'interface frontend utilisateur (voir section 10)
2. Cliquer sur **S'inscrire**
3. Remplir le formulaire : nom, email, téléphone, mot de passe
4. **Valider l'email** : saisir le code à 6 chiffres reçu par email
5. **Valider le téléphone** : saisir le code à 6 chiffres reçu par SMS (Twilio)
6. Une fois les deux vérifications effectuées, le compte est activé avec le rôle `MANAGER`
7. Se connecter et accéder au tableau de bord

> Sans validation email ET téléphone, l'accès aux fonctionnalités est bloqué.

---

## 9. Parcours d'un Développeur (invité)

```
Le développeur reçoit un email d'invitation
        │
        ▼
┌─ Premier accès ? ──────────────────────────────────────────────┐
│                                                                  │
│  OUI (pas de compte)              NON (compte existant)         │
│       │                                    │                     │
│  Clic sur le lien              Clic sur le lien d'invitation    │
│  Page d'activation                          │                   │
│  ┌─────────────────┐            ┌──────────┴───────────┐        │
│  │ Mot de passe    │            │ Déjà connecté ?      │        │
│  │ Email auto-fill │            │  Oui → Accès direct  │        │
│  └────────┬────────┘            │  Non → Page login    │        │
│           │                     └──────────┬───────────┘        │
│    Soumet le formulaire                    │                     │
│    Compte créé automatiquement             │                     │
└──────────────────────┬─────────────────────┘                    │
                       │                                          │
                       ▼
              Accès au tableau de bord
                       │
          A-t-il des projets partagés ?
          │                        │
         OUI                      NON
          │                        │
  Consulte le projet         "Aucun projet partagé"
  Voir les tests (lecture)   "Contactez votre Manager"
  Examiner les rapports
  Exporter PDF si besoin
```

---

## 10. Lancer les interfaces Frontend

### Interface Utilisateurs (Manager / Développeur)

```bash
cd testai-frontend
npm install
npm run dev
```

Accessible à : **http://localhost:5173** (ou port affiché dans le terminal)

### Interface Admin

```bash
cd testai-frontend-admin
npm install
npm run dev
```

Accessible à : **http://localhost:5200** (ou port affiché dans le terminal)

---

## 11. Récapitulatif des ports

| Service              | URL                          |
|----------------------|------------------------------|
| Frontend Utilisateurs | http://localhost:5173        |
| Frontend Admin        | http://localhost:5200        |
| API Gateway           | http://localhost:8888        |
| Eureka Dashboard      | http://localhost:8761        |
| Keycloak              | http://localhost:8080        |
| PgAdmin               | http://localhost:5050        |
| User Service          | http://localhost:8081        |
| Project Service       | http://localhost:8082        |
| Endpoint Service      | http://localhost:8083        |
| AI Service (Flask)    | http://localhost:8084        |
| Test Service          | http://localhost:8085        |
| Execution Service     | http://localhost:8086        |
| Admin Service         | http://localhost:8087        |
| Notification Service  | http://localhost:8089        |
| Blog API (test)       | http://localhost:9000        |
| Books API (test)      | http://localhost:5001        |
| Jenkins (CI/CD)       | http://localhost:9090        |

---

## 12. Commandes utiles

```bash
# Voir les logs d'un service
docker-compose logs -f user-service

# Redémarrer un service
docker-compose restart project-service

# Rebuild et relancer un service
docker-compose up -d --build ai-service

# Arrêter tous les services
docker-compose down

# Arrêter et supprimer les volumes (reset complet)
docker-compose down -v
```