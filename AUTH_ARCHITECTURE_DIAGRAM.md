# Diagrammes Architecture - Système d'Authentification v1.1

**Version:** 1.1.0  
**Date:** 29 Janvier 2026

---

## 1. Vue d'Ensemble Architecture

```mermaid
graph TB
    subgraph Client["Client React"]
        AuthContext[AuthContext Provider]
        ProtectedRoute[ProtectedRoute HOC]
        LoginPage[Pages Auth:<br/>Login, Signup,<br/>Forgot, Reset]
        AccountPages[Pages Compte:<br/>Dashboard, Profile,<br/>Orders, OrderDetail]
        Navigation[Navigation<br/>Menu User]
        CheckoutPage[CheckoutPage<br/>Pré-rempli si auth]
        CheckoutSuccess[CheckoutSuccess<br/>Création post-achat]
    end
    
    subgraph Backend["Express Backend"]
        SessionMW[Session Middleware<br/>express-session]
        PassportMW[Passport Middleware<br/>initialize + session]
        AuthRoutes[Routes Auth<br/>/api/auth/*]
        ProtectedRoutes[Routes Protégées<br/>/api/customers/me<br/>/api/orders/my-orders]
        PassportConfig[Passport Config<br/>LocalStrategy]
        AuthMiddleware[requireAuth<br/>Middleware]
    end
    
    subgraph Database["PostgreSQL"]
        CustomersTable[Table customers<br/>+ password<br/>+ resetToken]
        SessionTable[Table session<br/>sid, sess, expire]
        OrdersTable[Table orders<br/>FK customerId]
    end
    
    AuthContext -->|fetch with credentials| AuthRoutes
    ProtectedRoute -->|check isAuthenticated| AuthContext
    AccountPages --> ProtectedRoute
    LoginPage -->|login/signup| AuthContext
    Navigation -->|logout| AuthContext
    CheckoutPage -->|useAuth| AuthContext
    CheckoutSuccess -->|setPassword| AuthContext
    
    AuthRoutes --> PassportConfig
    AuthRoutes --> SessionMW
    ProtectedRoutes --> AuthMiddleware
    AuthMiddleware -->|req.isAuthenticated| PassportMW
    
    PassportConfig -->|bcrypt.compare| CustomersTable
    SessionMW --> SessionTable
    PassportMW -->|deserialize| CustomersTable
    ProtectedRoutes --> CustomersTable
    ProtectedRoutes --> OrdersTable
    
    style AuthContext fill:#4CAF50
    style PassportConfig fill:#2196F3
    style SessionTable fill:#FF9800
    style CustomersTable fill:#9C27B0
```

---

## 2. Flux Authentification Détaillé

### Flux Signup (Inscription)

```mermaid
sequenceDiagram
    participant User as Utilisateur
    participant SignupPage
    participant AuthContext
    participant API as /api/auth/signup
    participant Bcrypt
    participant DB as PostgreSQL
    participant Passport
    
    User->>SignupPage: Remplit formulaire
    SignupPage->>SignupPage: Valide (password min 8 chars)
    SignupPage->>AuthContext: signup(email, password, firstName, lastName)
    AuthContext->>API: POST {email, password, ...}
    
    API->>API: Validation Zod
    API->>DB: Check email existe ?
    DB-->>API: Non
    
    API->>Bcrypt: hash(password, 10)
    Bcrypt-->>API: $2a$10$hash...
    
    API->>DB: INSERT customer (password hashé)
    DB-->>API: customer created
    
    API->>Passport: req.login(customer)
    Passport->>Passport: serializeUser(customer)
    Passport->>DB: INSERT session
    DB-->>Passport: Session créée
    
    Passport-->>API: Cookie session
    API-->>AuthContext: customer (sans password)
    AuthContext->>AuthContext: setUser(customer)
    AuthContext-->>SignupPage: Success
    SignupPage->>SignupPage: Redirect /account
```

### Flux Login (Connexion)

```mermaid
sequenceDiagram
    participant User as Utilisateur
    participant LoginPage
    participant AuthContext
    participant API as /api/auth/login
    participant Passport
    participant Bcrypt
    participant DB as PostgreSQL
    
    User->>LoginPage: Entre email + password
    LoginPage->>AuthContext: login(email, password)
    AuthContext->>API: POST {email, password}
    
    API->>Passport: authenticate('local')
    Passport->>DB: getCustomerByEmailWithPassword(email)
    DB-->>Passport: customer (avec password hash)
    
    Passport->>Bcrypt: compare(password, hash)
    Bcrypt-->>Passport: true/false
    
    alt Password Valide
        Passport->>Passport: serializeUser(customer)
        Passport->>DB: INSERT session
        Passport-->>API: Cookie + customer (sans password)
        API-->>AuthContext: customer
        AuthContext->>AuthContext: setUser(customer)
        AuthContext-->>LoginPage: Success
        LoginPage->>LoginPage: Redirect
    else Password Invalide
        Passport-->>API: Error "Email ou mot de passe incorrect"
        API-->>AuthContext: 401
        AuthContext-->>LoginPage: Afficher erreur
    end
```

### Flux Requête Protégée

```mermaid
sequenceDiagram
    participant Client
    participant API as /api/customers/me
    participant Session as Session MW
    participant Passport
    participant requireAuth as requireAuth MW
    participant DB as PostgreSQL
    
    Client->>API: GET (Cookie: sid=abc123)
    API->>Session: Extract sessionID
    Session->>DB: SELECT sess FROM session WHERE sid='abc123'
    DB-->>Session: sess JSON
    
    Session->>Passport: deserializeUser(userId)
    Passport->>DB: getCustomer(userId)
    DB-->>Passport: customer
    Passport->>Passport: Attach req.user
    
    Passport->>requireAuth: next()
    requireAuth->>requireAuth: Check req.isAuthenticated()
    
    alt Authentifié
        requireAuth->>API: next() - req.user disponible
        API->>API: Route handler
        API-->>Client: 200 + customer data
    else Non Authentifié
        requireAuth-->>Client: 401 "Non authentifié"
    end
```

---

## 3. Flux Mot de Passe Oublié

```mermaid
graph TB
    A[User clique<br/>'Mot de passe oublié'] --> B[ForgotPasswordPage]
    B --> C[Saisit email]
    C --> D[POST /api/auth/forgot-password]
    
    D --> E{Email existe<br/>en DB?}
    E -->|Non| F[Message succès générique]
    E -->|Oui| G[Génère token<br/>crypto.randomBytes 32]
    
    G --> H[Save token + expires<br/>dans customer]
    H --> I[Log lien console<br/>TODO: Send email]
    I --> F
    
    F --> J[Message affiché:<br/>'Email envoyé si compte existe']
    
    K[User ouvre lien] --> L[ResetPasswordPage?token=xxx]
    L --> M[Saisit nouveau password]
    M --> N[POST /api/auth/reset-password]
    
    N --> O{Token valide<br/>et pas expiré?}
    O -->|Non| P[401 Token invalide]
    O -->|Oui| Q[Hash nouveau password]
    
    Q --> R[Update customer<br/>Clear token]
    R --> S[Auto-login<br/>Create session]
    S --> T[Redirect /account]
    
    style G fill:#4CAF50
    style Q fill:#2196F3
    style S fill:#FF9800
```

---

## 4. Flux Création Compte Post-Achat (Best Practice)

```mermaid
sequenceDiagram
    participant User
    participant Checkout as CheckoutPage
    participant Stripe
    participant Success as CheckoutSuccessPage
    participant Auth as AuthContext
    participant API as /api/auth/set-password
    participant DB
    
    User->>Checkout: Remplit formulaire (guest)
    Note over Checkout: email: user@test.com<br/>Pas de compte
    
    Checkout->>Stripe: Paiement
    Stripe-->>Success: Redirect (success)
    
    Success->>DB: Create order + customer (sans password)
    DB-->>Success: Order créé
    
    Success->>Success: Show confirmation
    
    alt User veut créer compte
        Success->>User: Formulaire: "Définir un mot de passe"
        User->>Success: Saisit password
        Success->>Auth: setPassword(email, password)
        Auth->>API: POST {email, password}
        
        API->>DB: Check customer existe (email)
        DB-->>API: ✅ Customer exists (créé au checkout)
        
        API->>DB: Check customer.password IS NULL
        DB-->>API: ✅ Pas encore de password
        
        API->>API: Hash password
        API->>DB: UPDATE customer SET password=hash
        DB-->>API: Updated
        
        API->>API: Auto-login (create session)
        API-->>Auth: Customer + cookie
        Auth->>Auth: setUser(customer)
        
        Success->>Success: Message "Compte créé !"
        Success->>Success: Redirect /account
    else User ignore
        Success->>Success: Bouton "Non merci"
        Success->>Success: Redirect /
    end
    
    Note over Success,API: Email déjà connu du checkout<br/>→ UX simplifiée (juste password)
```

---

## 5. État AuthContext (Frontend)

```mermaid
stateDiagram-v2
    [*] --> Loading: App Mount
    
    Loading --> Authenticated: GET /api/auth/me<br/>returns user
    Loading --> NotAuthenticated: GET /api/auth/me<br/>returns 401
    
    NotAuthenticated --> Authenticating: login() called
    Authenticating --> Authenticated: POST /api/auth/login<br/>Success
    Authenticating --> NotAuthenticated: 401 Error
    
    NotAuthenticated --> Authenticating2: signup() called
    Authenticating2 --> Authenticated: POST /api/auth/signup<br/>Success + Auto-login
    
    Authenticated --> NotAuthenticated: logout() called<br/>POST /api/auth/logout
    
    Authenticated --> Authenticated: refreshUser()<br/>GET /api/auth/me
    
    note right of Authenticated
        user: Customer
        isAuthenticated: true
        isLoading: false
    end note
    
    note right of NotAuthenticated
        user: null
        isAuthenticated: false
        isLoading: false
    end note
```

---

## 6. Schéma Base de Données Complet

```mermaid
erDiagram
    CUSTOMERS ||--o{ ORDERS : places
    CUSTOMERS ||--o{ SESSIONS : has
    
    CUSTOMERS {
        varchar id PK
        text email UK "NOT NULL"
        text first_name "NOT NULL"
        text last_name "NOT NULL"
        text phone "nullable"
        jsonb address "nullable"
        decimal total_spent "default 0"
        integer order_count "default 0"
        text notes "nullable"
        timestamp created_at "NOT NULL"
        text password "nullable - NOUVEAU v1.1"
        text reset_password_token "nullable - NOUVEAU v1.1"
        timestamp reset_password_expires "nullable - NOUVEAU v1.1"
    }
    
    SESSIONS {
        varchar sid PK
        json sess "NOT NULL"
        timestamp expire "NOT NULL, indexed"
    }
    
    ORDERS {
        varchar id PK
        varchar customer_id FK "NOT NULL"
        text customer_name "NOT NULL"
        text customer_email "NOT NULL"
        text status "NOT NULL"
        text payment_status "default pending"
        text stripe_session_id "nullable"
        text stripe_payment_intent_id "nullable"
        jsonb items "NOT NULL"
        decimal total_amount "NOT NULL"
        jsonb shipping_address "NOT NULL"
        text tracking_number "nullable"
        jsonb logs "nullable"
        timestamp created_at "NOT NULL"
    }
```

---

## 7. Flux Checkout Intelligent (Auth vs Guest)

```mermaid
graph TB
    Start[User arrive /checkout] --> CheckAuth{Authentifié?}
    
    CheckAuth -->|Oui| AuthFlow[Formulaire pré-rempli]
    CheckAuth -->|Non| GuestFlow[Formulaire vide]
    
    AuthFlow --> AuthMsg[Affiche: 'Connecté en tant que email@...']
    GuestFlow --> GuestMsg[Affiche: 'Déjà un compte ? Se connecter']
    
    AuthMsg --> Fill1[Pré-remplit:<br/>- email<br/>- firstName<br/>- lastName<br/>- phone<br/>- address si existe]
    GuestMsg --> Fill2[Champs vides]
    
    Fill1 --> Submit[Soumettre formulaire]
    Fill2 --> Submit
    
    Submit --> Stripe[Paiement Stripe]
    Stripe --> SuccessPage[CheckoutSuccessPage]
    
    SuccessPage --> CheckAuth2{Authentifié?}
    
    CheckAuth2 -->|Oui| ShowOrder[Afficher confirmation<br/>Pas de proposition compte]
    CheckAuth2 -->|Non| ProposeAccount[Afficher:<br/>'Créer un compte']
    
    ProposeAccount --> UserChoice{User choisit}
    UserChoice -->|Oui| SetPwd[Définir password]
    UserChoice -->|Non| ShowOrder
    
    SetPwd --> CreateAccount[POST /api/auth/set-password]
    CreateAccount --> AutoLogin[Auto-login]
    AutoLogin --> ShowOrder2[Redirect /account]
    
    ShowOrder --> End[Fin]
    ShowOrder2 --> End
    
    style AuthFlow fill:#4CAF50
    style ProposeAccount fill:#FF9800
    style AutoLogin fill:#2196F3
```

---

## 8. Hiérarchie Contextes React

```mermaid
graph TB
    App[App.tsx] --> SubdomainCheck{Subdomain?}
    
    SubdomainCheck -->|admin| AdminApp[AdminApp.tsx]
    SubdomainCheck -->|public| PublicApp[PublicApp.tsx]
    
    PublicApp --> AuthProvider[AuthProvider<br/>État: user, isAuthenticated]
    AuthProvider --> BooksProvider[BooksProvider<br/>Catalogue livres]
    BooksProvider --> MenuProvider[MenuProvider<br/>Navigation menus]
    MenuProvider --> CartProvider[CartProvider<br/>Panier + localStorage]
    CartProvider --> EcommerceProvider[EcommerceProvider<br/>Admin data: customers, orders]
    
    EcommerceProvider --> Routes[Routes<br/>wouter]
    
    Routes --> AuthRoutes["/login, /signup<br/>/forgot-password<br/>/reset-password"]
    Routes --> AccountRoutes["/account/*<br/>ProtectedRoute"]
    Routes --> PublicRoutes["/catalogue<br/>/cart<br/>/checkout"]
    
    AccountRoutes --> ProtectedRoute[ProtectedRoute]
    ProtectedRoute -->|Check| AuthProvider
    ProtectedRoute -->|if !auth| Redirect[Redirect /login]
    ProtectedRoute -->|if auth| Render[Render children]
    
    style AuthProvider fill:#4CAF50,color:#fff
    style ProtectedRoute fill:#FF5722,color:#fff
    style EcommerceProvider fill:#9E9E9E
```

**Note:** `EcommerceProvider` charge customers/orders pour AdminDashboard. Les clients connectés utilisent les routes `/me` et `/my-orders` directement.

---

## 9. Cycle de Vie Session

```mermaid
stateDiagram-v2
    [*] --> NoSession: User visit site
    
    NoSession --> SessionCreated: Login/Signup success
    
    SessionCreated --> Active: Session in DB
    
    Active --> Active: Each request:<br/>deserialize user
    Active --> Extended: Activity before 30d
    Extended --> Active: Extend expire time
    
    Active --> Expired: 30 days no activity
    Active --> Destroyed: Logout called
    
    Expired --> NoSession: Auto cleanup
    Destroyed --> NoSession: req.session.destroy()
    
    NoSession --> [*]
    
    note right of Active
        Table session:
        sid: "abc123..."
        sess: {"passport":{"user":"uuid"}}
        expire: timestamp
    end note
```

---

## 10. Password Security Flow

```mermaid
graph LR
    subgraph Input["User Input"]
        PlainPwd[Password<br/>'mypassword123']
    end
    
    subgraph Signup["Signup/SetPassword"]
        Bcrypt1[bcrypt.hash<br/>10 rounds]
        Hash1[Hash<br/>'$2a$10$...']
        Save1[Save to DB]
    end
    
    subgraph Login["Login"]
        Retrieve[Retrieve hash<br/>from DB]
        Bcrypt2[bcrypt.compare<br/>plain vs hash]
        Result{Match?}
    end
    
    subgraph Storage["Database"]
        DB1[(customers.password<br/>'$2a$10$...')]
    end
    
    subgraph API["API Response"]
        Exclude[storage.getCustomer<br/>EXCLUT password]
        Safe[SafeCustomer<br/>Pas de password]
    end
    
    PlainPwd --> Bcrypt1
    Bcrypt1 --> Hash1
    Hash1 --> Save1
    Save1 --> DB1
    
    DB1 --> Retrieve
    PlainPwd --> Bcrypt2
    Retrieve --> Bcrypt2
    Bcrypt2 --> Result
    
    Result -->|Yes| Login_Success[Login Success]
    Result -->|No| Login_Fail[401 Error]
    
    DB1 -.->|Never exposed| Exclude
    Exclude --> Safe
    
    style PlainPwd fill:#FF5722,color:#fff
    style Hash1 fill:#4CAF50,color:#fff
    style DB1 fill:#9C27B0,color:#fff
    style Safe fill:#2196F3,color:#fff
```

---

## 11. Routes et Protection

```mermaid
graph TB
    subgraph Public["Routes Publiques"]
        P1["/api/books<br/>GET"]
        P2["/api/auth/signup<br/>POST + Rate Limit"]
        P3["/api/auth/login<br/>POST + Rate Limit"]
        P4["/api/checkout/create-session<br/>POST"]
    end
    
    subgraph Protected["Routes Protégées Client"]
        PR1["/api/customers/me<br/>GET + requireAuth"]
        PR2["/api/customers/me<br/>PATCH + requireAuth"]
        PR3["/api/orders/my-orders<br/>GET + requireAuth"]
    end
    
    subgraph Admin["Routes Admin (À Protéger v1.2)"]
        A1["/api/customers<br/>GET - TOUS clients"]
        A2["/api/orders<br/>GET - TOUTES commandes"]
        A3["/api/books<br/>POST/PATCH"]
    end
    
    Internet[Internet] --> Public
    
    AuthUser[Client Authentifié<br/>Cookie session] --> Protected
    AuthUser -.->|Also access| Public
    
    AdminUser[Admin<br/>Future: requireAdmin] -.->|Future v1.2| Admin
    AdminUser -.->|Also access| Public
    
    Guest[Visiteur Guest] --> Public
    Guest -.->|Tente accès| Protected
    Protected -.->|401| RedirectLogin[Redirect /login]
    
    style Protected fill:#4CAF50,color:#fff
    style Admin fill:#FF9800,color:#fff
    style Public fill:#2196F3,color:#fff
```

---

## 12. Flux Données AuthContext

```mermaid
graph LR
    subgraph Mount["Component Mount"]
        UseEffect[useEffect mount] --> CheckAuth[GET /api/auth/me]
    end
    
    subgraph Server["Server Response"]
        CheckAuth --> IsAuth{Session<br/>valide?}
        IsAuth -->|200| UserData[Return customer]
        IsAuth -->|401| NoUser[Return error]
    end
    
    subgraph State["React State"]
        UserData --> SetUser[setUser customer]
        NoUser --> SetNull[setUser null]
        SetUser --> Ready1[isLoading: false<br/>isAuthenticated: true]
        SetNull --> Ready2[isLoading: false<br/>isAuthenticated: false]
    end
    
    subgraph Render["Components Re-render"]
        Ready1 --> ShowAuth[Show user menu<br/>Pre-fill forms]
        Ready2 --> ShowGuest[Show login/signup<br/>Empty forms]
    end
    
    style SetUser fill:#4CAF50
    style SetNull fill:#9E9E9E
    style ShowAuth fill:#2196F3,color:#fff
```

---

## 13. Navigation Conditionnelle

```mermaid
graph TB
    Nav[Navigation Component] --> CheckAuth{useAuth<br/>isAuthenticated?}
    
    CheckAuth -->|true| AuthNav[Navigation Authentifiée]
    CheckAuth -->|false| GuestNav[Navigation Guest]
    
    AuthNav --> Avatar[Avatar avec initiales<br/>user.firstName 0 + lastName 0]
    Avatar --> Dropdown{Click avatar}
    
    Dropdown --> Menu[Dropdown Menu]
    Menu --> Item1[Mon compte → /account]
    Menu --> Item2[Mes commandes → /account/orders]
    Menu --> Divider[---]
    Menu --> Item3[Déconnexion logout]
    
    Item3 --> LogoutAction[POST /api/auth/logout]
    LogoutAction --> Redirect1[Redirect /]
    
    GuestNav --> BtnLogin[Bouton 'Connexion']
    GuestNav --> BtnSignup[Bouton 'Inscription']
    
    BtnLogin --> Login[→ /login]
    BtnSignup --> Signup[→ /signup]
    
    style AuthNav fill:#4CAF50,color:#fff
    style GuestNav fill:#2196F3,color:#fff
    style Item3 fill:#FF5722,color:#fff
```

---

## 14. Pages Protection Flow

```mermaid
graph TB
    User[User navigue vers<br/>/account/profile] --> Route[Route wouter]
    
    Route --> Wrap[ProtectedRoute wrapper]
    
    Wrap --> Check{useAuth<br/>isAuthenticated?}
    
    Check -->|Loading| Loader[Affiche Loader<br/>Vérifie session]
    Loader --> Check
    
    Check -->|false| SavePath[Save current path]
    SavePath --> Redirect[Redirect /login?redirect=/account/profile]
    
    Check -->|true| Render[Render children<br/>AccountProfilePage]
    
    Redirect --> LoginPage[LoginPage]
    LoginPage --> LoginSuccess{Login<br/>Success?}
    
    LoginSuccess -->|Yes| GetRedirect[Read redirect param]
    GetRedirect --> RedirectBack[Redirect /account/profile]
    RedirectBack --> Render
    
    LoginSuccess -->|No| LoginPage
    
    style Loader fill:#FFC107
    style Redirect fill:#FF5722,color:#fff
    style Render fill:#4CAF50,color:#fff
```

---

## 15. Architecture Complète (Zoom Out)

```mermaid
graph TB
    subgraph Frontend["Frontend React (Port 5000)"]
        direction TB
        UI[UI Components<br/>Tailwind + Radix]
        Pages[Pages<br/>Login, Account, Checkout...]
        Contexts[Contexts<br/>Auth, Cart, Books...]
        
        UI --> Pages
        Pages --> Contexts
    end
    
    subgraph Backend["Backend Express (Port 5000)"]
        direction TB
        Routes[Routes<br/>auth, books, orders...]
        Middleware[Middleware<br/>auth, validation, rate-limit]
        Services[Services<br/>Stripe, Storage...]
        
        Routes --> Middleware
        Middleware --> Services
    end
    
    subgraph Auth["Auth Layer (NOUVEAU v1.1)"]
        direction TB
        Passport[Passport.js<br/>LocalStrategy]
        Session[express-session<br/>+ connect-pg-simple]
        Bcrypt[bcrypt<br/>Hash passwords]
        
        Passport --> Session
        Passport --> Bcrypt
    end
    
    subgraph Database["PostgreSQL (Neon)"]
        direction TB
        Tables[customers, orders,<br/>books, session...]
    end
    
    subgraph External["Services Externes"]
        Stripe[Stripe<br/>Payments]
        Storage[Object Storage<br/>Images, Fonts]
    end
    
    Frontend <-->|fetch API| Backend
    Backend --> Auth
    Auth --> Database
    Backend --> Database
    Backend <--> Stripe
    Backend <--> Storage
    
    style Auth fill:#4CAF50,color:#fff
    style Frontend fill:#2196F3,color:#fff
    style Backend fill:#9C27B0,color:#fff
    style Database fill:#FF9800,color:#fff
```

---

## 📚 Légende des Couleurs

- 🟢 **Vert** - Authentification / Sécurité
- 🔵 **Bleu** - Frontend / UI
- 🟣 **Violet** - Backend / API
- 🟠 **Orange** - Base de Données / Stockage
- 🔴 **Rouge** - Actions destructives / Erreurs
- ⚪ **Gris** - État inactif / Non utilisé

---

**Pour documentation textuelle complète:** [AUTHENTICATION_SYSTEM.md](AUTHENTICATION_SYSTEM.md)  
**Pour guide rapide:** [QUICKSTART_AUTH.md](QUICKSTART_AUTH.md)  
**Pour index navigation:** [DOCS_INDEX.md](DOCS_INDEX.md)
