# 🎓 Registrar: Online Document Request (ODR) System

<div align="center">

![Python](https://img.shields.io/badge/Python-3.13-blue?style=for-the-badge&logo=python)
![Flask](https://img.shields.io/badge/Flask-3.1.2-green?style=for-the-badge&logo=flask)
![React](https://img.shields.io/badge/React-19.2.0-blue?style=for-the-badge&logo=react)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-13+-blue?style=for-the-badge&logo=postgresql)

*A web-based system for requesting and managing academic documents at MSU-IIT*

[Features](#-features) · [Tech Stack](#-tech-stack) · [Quick Start](#-quick-start) · [Configuration](#-configuration) · [Deployment](#-deployment) · [Documentation](#-documentation)

</div>

---

## Overview

The **Registrar ODR System** digitizes the academic document request process for MSU-IIT. Students and external requesters submit document requests online, pay through Maya, and track their request status in real time. Registrar staff process requests through a role-based admin panel with WhatsApp notifications throughout.

**Request lifecycle:** `PENDING → IN-PROGRESS → DOC-READY → RELEASED` (or `REJECTED`)

---

## ✨ Features

### For Students & External Requesters
- WhatsApp OTP authentication for students; authorization letter upload for outsiders
- Submit requests for transcripts, certifications, enrollment certificates, and more
- Real-time request tracking with status updates
- Maya payment gateway integration (online and over-the-counter)
- Complete request history

### For Admin Staff
- Role-based access control across five roles: `developer`, `admin`, `manager`, `staff`, `auditor`
- Request management: assign, process, approve, reject, and request document changes
- Document and requirements configuration (CRUD with relationship management)
- Financial transaction tracking and reporting
- System-wide settings: operating hours, day restrictions, admin fees, date availability
- Comprehensive activity logs and audit trails
- WhatsApp notifications for all status changes
- Load balancing with configurable per-admin request limits

### Role Permission Matrix

| Feature | Developer | Admin | Manager | Staff | Auditor |
|---|:---:|:---:|:---:|:---:|:---:|
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ |
| Requests | ✅ | ✅ | ✅ | ✅ | ❌ |
| Transactions | ✅ | ✅ | ❌ | ❌ | ✅ |
| Documents | ✅ | ✅ | ✅ | ❌ | ❌ |
| Logs | ✅ | ✅ | ✅ | ❌ | ❌ |
| Settings | ✅ | ✅ | ❌ | ❌ | ❌ |
| Developers | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | Python 3.13, Flask 3.1.2 |
| **Database** | PostgreSQL 13+ with psycopg2 connection pooling |
| **Authentication** | JWT (HTTP-only cookies), Google OAuth 2.0, WhatsApp OTP |
| **Frontend** | React 19.2.0, Tailwind CSS 3.4.18, React Router DOM 7.9.4 |
| **HTTP Client** | Axios |
| **File Storage** | Supabase |
| **Payments** | Maya Payment Gateway |
| **Notifications** | WhatsApp Business API |
| **Serving** | Gunicorn + Nginx (production), ProxyFix middleware |
| **Containerization** | Docker + Docker Compose |

---

## 🚀 Quick Start

### Prerequisites
- Python 3.13+
- Node.js 16+ and npm
- PostgreSQL 13+ (running)
- Git

### Setup

```bash
# 1. Clone
git clone https://online-doc-req-admin@bitbucket.org/registrar-online-document-request/registrar-odr.git
cd registrar-odr

# 2. Backend dependencies
pipenv shell
pipenv install

# 3. Frontend dependencies
cd frontend && npm install && cd ..

# 4. Create database
createdb odr_system

# 5. Configure environment
cp .env.example .env
# Edit .env with your values (see Configuration section)

# 6. Initialize database schema
python -c "from app.db_init import initialize_and_populate; initialize_and_populate()"

# 7. Run (two terminals)
python run.py              # Terminal 1 — backend on :8000
cd frontend && npm start   # Terminal 2 — frontend on :3000
```

### Access
- **User portal:** http://localhost:3000
- **Admin panel:** http://localhost:3000/admin/login
- **API:** http://127.0.0.1:8000 (proxied through frontend in development)

---

## 🔧 Configuration

All configuration is loaded from a `.env` file in the project root via `config.py`. **All variables are required in production** — the app will not start safely without them.

```bash
# ── Flask ──────────────────────────────────────────
FLASK_SECRET_KEY="your-strong-random-secret"
JWT_SECRET_KEY="your-strong-random-jwt-secret"

# ── Database ───────────────────────────────────────
DB_NAME=odr_system
DB_USERNAME=odr_user
DB_PASSWORD=your_secure_password
DB_HOST=localhost
DB_PORT=5432

# ── Google OAuth (admin login) ─────────────────────
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# ── Supabase (file storage) ────────────────────────
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_ANON_KEY="your-supabase-anon-key"

# ── Maya (payments) ────────────────────────────────
MAYA_SECRET_KEY="your-maya-secret-key"
MAYA_PUBLIC_KEY="your-maya-public-key"
# MAYA_DISABLE_SECURITY=true   # development only — disables webhook verification

# ── CORS ───────────────────────────────────────────
FRONTEND_URL="http://localhost:3000"
```

### First Admin Account
1. Configure Google OAuth with authorized redirect URI: `http://localhost:3000/admin/callback`
2. Restrict to `@g.msuiit.edu.ph` domain in your Google Cloud Console
3. Log in with a `@g.msuiit.edu.ph` Google account — the system auto-creates an admin record
4. Promote to a role via the Settings → Admin Management tab

---

## 📁 Project Structure

```
registrar-odr/
├── app/                          # Flask application
│   ├── __init__.py               # App factory, connection pool, blueprints
│   ├── db_init.py                # Schema initialization
│   ├── config.py                 # Environment-based config
│   ├── admin/
│   │   ├── authentication/       # Google OAuth login/logout
│   │   ├── dashboard/            # Stats, notifications, recent activity
│   │   ├── document_manage/      # Document & requirements CRUD
│   │   ├── logging/              # Activity log viewer
│   │   ├── manage_request/       # Full request lifecycle management
│   │   ├── settings/             # Hours, fees, admins, date restrictions
│   │   ├── transactions/         # Financial reporting
│   │   └── developers/           # Feedback & test registration tools
│   ├── user/
│   │   ├── authentication/       # WhatsApp OTP flow
│   │   ├── document_list/        # Available documents
│   │   ├── request/              # Request submission
│   │   ├── tracking/             # Status tracking
│   │   └── payment/              # Maya payment handling
│   ├── whatsapp/                 # WhatsApp API integration
│   ├── services/
│   │   └── supabase_file_service.py
│   ├── utils/
│   │   ├── decorator.py          # jwt_required_with_role, request_allowed_required
│   │   ├── error_handlers.py     # Global error handler registration
│   │   └── time_utils.py         # Philippine time helpers
│   ├── templates/index.html      # React app shell
│   └── static/react/             # Built frontend (generated by npm run build)
├── frontend/                     # React application
│   ├── src/
│   │   ├── components/
│   │   │   ├── admin/            # Admin UI components
│   │   │   ├── user/             # User UI components
│   │   │   └── common/           # Shared components
│   │   ├── pages/                # Route-level page components
│   │   ├── contexts/AuthContext.jsx
│   │   ├── hooks/                # Custom React hooks
│   │   ├── services/             # Axios API wrappers
│   │   └── utils/
│   │       ├── roleUtils.js      # ROLE_PERMISSIONS matrix, nav filtering
│   │       └── csrf.js           # CSRF token helpers
│   ├── nginx.conf                # Nginx config for Docker frontend container
│   └── package.json
├── migrate/
│   └── migrate_college_code.py   # One-off migration script
├── backend/Dockerfile            # Backend container (Gunicorn on :10000)
├── docker-compose.yml
├── Pipfile / requirements.txt
├── run.py                        # Development entry point
└── Documentation/
    ├── API_DOCUMENTATION.md
    ├── COMPREHENSIVE_TESTING_CHECKLIST.md
    ├── 01_DASHBOARD_TAB.md  →  07_TRANSACTIONS_TAB.md
    └── DEVELOPERS_RULES_AND_STANDARD.txt
```

---

## 🐳 Deployment

### Docker (Recommended)

```bash
docker compose up --build
```

The compose setup runs three services:
- **postgres** — PostgreSQL 13 with a named volume
- **backend** — Gunicorn on port `10000`
- **frontend** — Nginx on port `10001`, proxying `/api/*` to backend

Set all environment variables from the [Configuration](#-configuration) section in your `docker-compose.yml` or a `.env` file at the compose level.

### Traditional (Nginx + Gunicorn)

```bash
# 1. Build frontend and copy into Flask static directory
cd frontend && npm run build && cd ..

# 2. Run backend with Gunicorn
gunicorn --bind 0.0.0.0:8000 --workers 4 --timeout 120 run:app
```

**Nginx config:**
```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate     /path/to/cert.crt;
    ssl_certificate_key /path/to/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    add_header Strict-Transport-Security "max-age=63072000" always;
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;

    location / {
        root /path/to/registrar-odr/app/static/react;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

### Production Checklist

- [ ] All `.env` variables set — no fallback defaults in production
- [ ] `SESSION_COOKIE_SECURE` and `JWT_COOKIE_SECURE` set to `True`
- [ ] SSL certificate installed, HTTP → HTTPS redirect active
- [ ] Database backed up before migrations
- [ ] `MAYA_DISABLE_SECURITY` removed or set to `false`
- [ ] Google OAuth redirect URIs updated to production domain
- [ ] Supabase bucket permissions reviewed

---

## 📚 API Reference

Authentication uses JWT stored in HTTP-only cookies with CSRF protection on all state-changing requests.

### User Endpoints
| Method | Path | Description |
|---|---|---|
| POST | `/user/authentication/check-id` | Verify student ID, send OTP |
| POST | `/user/authentication/verify-otp` | Verify OTP, issue JWT |
| GET | `/user/document_list/api/view-documents` | List available documents |
| POST | `/user/request/api/complete-request` | Submit a new request |
| POST | `/user/tracking/api/track` | Track request by ID |
| POST | `/user/payment/mark-paid` | Initiate Maya payment |

### Admin Endpoints
| Method | Path | Description |
|---|---|---|
| POST | `/api/admin/google-login` | Google OAuth login |
| POST | `/api/admin/logout` | Clear JWT cookies |
| GET | `/api/admin/dashboard` | Stats, notifications, activity |
| GET | `/api/admin/requests` | List all requests |
| PUT | `/api/admin/requests/<id>/status` | Update request status |
| GET | `/api/admin/admins` | List admin users |
| POST | `/api/admin/admins` | Create admin |
| DELETE | `/api/admin/admins/<email>` | Delete admin |
| GET | `/api/admin/logs` | Fetch activity logs |
| GET/PUT | `/api/admin/settings` | Read/update system settings |
| GET | `/api/admin/domain-whitelist` | Manage allowed Google domains |

Full API details: [`Documentation/API_DOCUMENTATION.md`](Documentation/API_DOCUMENTATION.md)

---

## 📖 Documentation

| Document | Description |
|---|---|
| [`Documentation/API_DOCUMENTATION.md`](Documentation/API_DOCUMENTATION.md) | Complete REST API reference |
| [`Documentation/01_DASHBOARD_TAB.md`](Documentation/01_DASHBOARD_TAB.md) | Admin dashboard implementation |
| [`Documentation/02_AUTHENTICATION_TAB.md`](Documentation/02_AUTHENTICATION_TAB.md) | Google OAuth & admin management |
| [`Documentation/03_MANAGE_REQUEST_TAB.md`](Documentation/03_MANAGE_REQUEST_TAB.md) | Request lifecycle management |
| [`Documentation/04_DOCUMENT_MANAGEMENT_TAB.md`](Documentation/04_DOCUMENT_MANAGEMENT_TAB.md) | Document & requirements config |
| [`Documentation/05_LOGGING_TAB.md`](Documentation/05_LOGGING_TAB.md) | Activity logging & audit trails |
| [`Documentation/06_SETTINGS_TAB.md`](Documentation/06_SETTINGS_TAB.md) | System configuration |
| [`Documentation/07_TRANSACTIONS_TAB.md`](Documentation/07_TRANSACTIONS_TAB.md) | Financial transaction tracking |
| [`Documentation/09_DOMAIN_MANAGEMENT_DOCUMENTATION.md`](Documentation/09_DOMAIN_MANAGEMENT_DOCUMENTATION.md) | Email domain whitelist |
| [`Documentation/COMPREHENSIVE_TESTING_CHECKLIST.md`](Documentation/COMPREHENSIVE_TESTING_CHECKLIST.md) | Manual QA checklist |
| [`Documentation/DEVELOPERS_RULES_AND_STANDARD.txt`](Documentation/DEVELOPERS_RULES%20_AND_STANDARD.txt) | Coding standards & conventions |

---

## 🤝 Contributing

1. Fork and clone the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Follow the standards in [`Documentation/DEVELOPERS_RULES_AND_STANDARD.txt`](Documentation/DEVELOPERS_RULES%20_AND_STANDARD.txt)
4. Write tests for new functionality (minimum 80% coverage on critical paths)
5. Commit with conventional messages: `feat:`, `fix:`, `docs:`, `refactor:`
6. Submit a pull request with a clear description of changes

<div align="center">

Built for MSU-IIT Registrar's Office

</div>