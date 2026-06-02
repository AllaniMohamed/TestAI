# 🚀 TestAI — Platform Startup Guide

---

## 1. Clone the project

```bash
git clone <url-du-repo>
cd testai
```

---

## 2. Start the backend (microservices)

All microservices and their databases are located in the `testai-backend` folder.

```bash
cd testai-backend
```

Before starting, create a `.env` file at the root of `testai-backend`:

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

Start all services with Docker Compose:

```bash
docker-compose up -d
```

> **Automatic startup order:**  
> `PostgreSQL DBs` → `Eureka Server` → `Keycloak` → `Microservices Spring Boot` → `AI Service (Flask)` → `API Gateway`

---

## 3. Configure Keycloak

Keycloak is accessible at: **http://localhost:8080**

### Admin console login
- **User:** `admin`
- **Password:** `admin123`

### Verify the realm
Keycloak automatically imports the `testai` realm from `./keycloak-init/realm-config.json`.  
Check in **Realm Settings** that the `testai` realm is present.

### Verify the clients
In **Clients**, make sure `user-service` is present with:
- `Client Secret` : `0W791wbIPTtDR3v7noogqAFpBBsOZpw0`
- `Access Type` : `confidential`

---

## 4. Configure the Email service

The email service uses SMTP (e.g. Gmail). For Gmail, you must generate an **app password**:

1. Enable two-step verification on your Google account
2. Go to **My Google Account → Security → App passwords**
3. Generate a password for “Other (custom name)” → `TestAI`
4. Copy the generated password into `.env` → `MAIL_PASSWORD`

The corresponding variables in `user-service` (already handled via `.env`) are:

```
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=votre.email@gmail.com
MAIL_PASSWORD=xxxx xxxx xxxx xxxx
```
these configs are in the  user-service\application.yml

---

## 5. Configure Twilio (SMS)

Twilio is used to verify the phone number during registration.

1. Create an account at [https://www.twilio.com](https://www.twilio.com)
2. Retrieve from the Twilio console:
   - **Account SID** (starts with `AC`)
   - **Auth Token**
   - **Verify-service SID**
3. Fill in these values in the `.env` file:

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_VERIFY_SERVICE_SID=xxxxxxxxxxxxx```

---

## 6. Configure PgAdmin (view databases)

PgAdmin is accessible at: **http://localhost:5050**

- **Email:** `admin@admin.com`
- **Password:** `admin123`

### Add the database servers

For each database, click **Add server** (right-click on *Servers → Register → Server*) with the following settings:

| Server name         | Host                      | Port | Database           | User        | Password     |
|--------------------|---------------------------|------|--------------------|-------------|--------------|
| `user-db`          | `testai-user-db`          | 5432 | `user_db`          | `postgres`  | `postgres`   |
| `project-db`       | `testai-project-db`       | 5432 | `project_db`       | `postgres`  | `postgres`   |
| `endpoint-db`      | `testai-endpoint-db`      | 5432 | `endpoint_db`      | `postgres`  | `postgres`   |
| `test-db`          | `testai-test-db`          | 5432 | `test_db`          | `postgres`  | `postgres`   |
| `execution-db`     | `testai-execution-db`     | 5432 | `execution_db`     | `postgres`  | `postgres`   |
| `notification-db`  | `testai-notification-db`  | 5432 | `notification_db`  | `postgres`  | `postgres`   |

> **Important:** In the **Connection** tab, the **Host name/address** field must contain the Docker container name (e.g. `testai-user-db`), not `localhost`.

---

## 7. Create an Admin account in the database

Creating an admin requires **two mandatory steps**: first in Keycloak (for authentication), then in the database (for application permissions). Both must use the **same password**.
 
### Step 1 — Create the user in Keycloak
 
1. Log in to **http://localhost:8080** → Keycloak admin console (`admin` / `admin123`)
2. Select the **`testai`** realm
3. Go to **Users → Add user**
4. Fill in:
   - **Username:** `admin@testai.com`
   - **Email:** `admin@testai.com`
   - **Email verified:** `ON`
   - **First name / Last name:** `Admin` / `TestAI`
5. Click **Save**
6. Go to the **Credentials** tab for this user
7. Click **Set password**
8. Enter your password (e.g. `Admin123!`), disable **Temporary**, click **Save**
### Step 2 — Create the user in the database
 
Connect to `user-db` via PgAdmin, open the **Query Tool** and run:
 
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
    'admin@testai.com',        -- Must match the email created in Keycloak
    '+21600000000',
    'ADMIN',
    'KEYCLOAK_USER_ID',        -- Replace with the Keycloak ID (see note below)
    true,
    true,
    true,
    0,
    0,
    NOW(),
    NOW()
);
```
 
> **Retrieve the Keycloak ID:**  
> In the Keycloak console → **Users** → click the admin user created in step 1 → copy the value of the **ID** field (UUID format) at the top of the page. Replace `'KEYCLOAK_USER_ID'` with this value.
 
> **No password in the database:** Authentication is handled entirely by Keycloak. The `users` table does not store a password — the `keycloak_id` links the two systems.
 
> **Important:** The email must be **identical** in Keycloak and in the database.
 

## 8. Manager registration

A Manager must register through the user interface and **validate their credentials** to access the platform features:

1. Go to the user frontend interface (see section 10)
2. Click **Register**
3. Fill in the form: name, email, phone, password
4. **Validate the email:** enter the 6-digit code received by email
5. **Validate the phone:** enter the 6-digit code received by SMS (Twilio)
6. Once both verifications are complete, the account is activated with the `MANAGER` role
7. Log in and access the dashboard

> Without both email and phone validation, access to features is blocked.

---

## 9. Guest Developer flow

```
The developer receives an invitation email
        │
        ▼
┌─ First access? ─────────────────────────────────────────────────┐
│                                                                  │
│  YES (no account)               NO (existing account)           │
│       │                                    │                     │
│  Click the link               Click the invitation link         │
│  Activation page                          │                   │
│  ┌─────────────────┐            ┌──────────┴───────────┐        │
│  │ Password       │            │ Already logged in?   │        │
│  │ Email auto-fill│            │  Yes → Direct access │        │
│  └────────┬────────┘            │  No → Login page     │        │
│           │                     └──────────┬───────────┘        │
│    Submit the form                      │                     │
│    Account created automatically         │                     │
└──────────────────────┬─────────────────────┘                    │
                       │                                          │
                       ▼
              Access the dashboard
                       │
          Are there shared projects?
          │                        │
         YES                      NO
          │                        │
  View the project          "No shared project"
  View the tests (read)    "Contact your Manager"
  Review reports
  Export PDF if needed
```

---

## 10. Start the frontend interfaces

### User Interface (Manager / Developer)

```bash
cd testai-frontend
npm install
npm run dev
```

Accessible at: **http://localhost:5173** (or the port shown in the terminal)

### Admin Interface

```bash
cd testai-frontend-admin
npm install
npm run dev
```

Accessible at: **http://localhost:5200** (or the port shown in the terminal)

---

## 11. Port summary

| Service              | URL                          |
|----------------------|------------------------------|
| User Frontend        | http://localhost:5173        |
| Admin Frontend       | http://localhost:5200        |
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

## 12. Useful commands

```bash
# View service logs
docker-compose logs -f user-service

# Restart a service
docker-compose restart project-service

# Rebuild and restart a service
docker-compose up -d --build ai-service

# Stop all services
docker-compose down

# Stop and remove volumes (full reset)
docker-compose down -v
```
