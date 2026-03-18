Scénario 1 : Développeur N'A PAS de compte
1. Manager partage avec dev-sans-compte@test.com
   ↓
   POST /api/projects/{id}/share
   Body: {"developerEmail": "dev-sans-compte@test.com"}
   ↓
2. project-service crée SharedAccess {
     developerEmail: "dev-sans-compte@test.com",
     userId: NULL  ← ⭐ Pas encore de compte
   }
   ↓
3. Email envoyé ✅
   ↓
4. Developer clique sur le lien
   ↓
   GET /invite/{token}
   ↓
5. Frontend affiche InvitationPage
   ↓
6. Developer clique "Accepter"
   ↓
   POST /api/invitations/{token}/activate
   ↓
7. Backend vérifie si compte existe
   → PAS de compte trouvé
   → SharedAccess.userId reste NULL
   → Status → ACTIVE
   ↓
8. Frontend redirige vers /register
   ↓
9. Developer s'inscrit
   ↓
   POST /api/auth/register
   {
     "email": "dev-sans-compte@test.com",
     "name": "Dev Name",
     "password": "pass123"
   }
   ↓
10. user-service crée le compte
    ↓
11. ⭐ BACKEND doit lier SharedAccess au nouveau userId
    → Voir section "Lier SharedAccess après inscription"


Scénario 2 : Développeur A DÉJÀ un compte
1. Manager partage avec dev-avec-compte@test.com
   ↓
2. SharedAccess créé {
     developerEmail: "dev-avec-compte@test.com",
     userId: NULL
   }
   ↓
3. Email envoyé ✅
   ↓
4. Developer clique sur le lien
   ↓
5. Developer clique "Accepter"
   ↓
   POST /api/invitations/{token}/activate
   ↓
6. Backend vérifie si compte existe
   → Compte TROUVÉ ✅
   → SharedAccess.userId = userId trouvé
   → Status → ACTIVE
   ↓
7. Frontend redirige vers /login
   ↓
8. Developer se connecte
   ↓
9. Developer voit les services partagés ✅

