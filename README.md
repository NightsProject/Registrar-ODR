# 🎓 Registrar: Online Document Request (ODR) System

<div align="center">

![ODR System Logo](https://img.shields.io/badge/ODR-System-blue?style=for-the-badge)
![Python](https://img.shields.io/badge/Python-3.13-blue?style=for-the-badge&logo=python)
![Flask](https://img.shields.io/badge/Flask-3.1.2-green?style=for-the-badge&logo=flask)
![React](https://img.shields.io/badge/React-19.2.0-blue?style=for-the-badge&logo=react)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-13+-blue?style=for-the-badge&logo=postgresql)

*A comprehensive web-based system for academic document requests and management*

[Features](#-key-features) • [Technology Stack](#-technology-stack) • [Quick Start](#-quick-start) • [API Documentation](#-api-documentation) • [Contributing](#-contributing)

</div>

---

## 🎯 Overview

The **Registrar: Online Document Request (ODR)** system is a comprehensive web-based application designed to modernize and streamline the process of requesting academic documents. Built specifically for educational institutions, this system digitizes the traditional paper-based document request process, reducing manual workload for registrar staff while providing students and external requesters with a transparent, efficient, and user-friendly experience.

### 🎯 Project Goals
- **Digitize** the document request process for maximum efficiency
- **Streamline** communication between students and registrar staff
- **Automate** status tracking and notifications
- **Integrate** secure payment processing
- **Provide** comprehensive admin tools for request management

---

## ✨ Key Features

### 👩‍🎓 User Capabilities (Students & External Requesters)
- **🔐 Multi-Factor Authentication**: OTP verification via WhatsApp for students, authorization letters for external requests
- **📄 Document Requests**: Easy-to-use interface for requesting various academic records (transcripts, certifications, enrollment certificates, etc.)
- **📊 Real-Time Tracking**: Live status updates with detailed progress tracking (Pending → In Progress → Doc Ready → Released)
- **💳 Secure Payments**: Integrated Maya payment gateway with multiple payment options
- **📱 Mobile Responsive**: Optimized for mobile devices with intuitive touch interfaces
- **📋 Document History**: Complete history of all submitted requests and their statuses
- **🔍 Advanced Search**: Filter and search through requests by date, type, status, and more

### 🧑‍💼 Admin Capabilities (Registrar Staff)
- **📊 Comprehensive Dashboard**: Real-time statistics, pending tasks, and system notifications
- **🎯 Request Management**: Review, approve, reject, assign, and update request statuses with detailed audit trails
- **📚 Document Administration**: Create, edit, and manage document types, requirements, and pricing
- **👥 User Management**: Admin user management with Google OAuth integration for @g.msuiit.edu.ph domain
- **💰 Transaction Processing**: Complete financial tracking and reporting system
- **📝 Activity Logging**: Comprehensive logging of all administrative actions for audit purposes
- **⚙️ System Configuration**: Configurable request hours, admin fees, and system parameters
- **🤝 Load Balancing**: Intelligent request assignment with manual and automatic distribution options
- **🔔 Notification System**: Automated WhatsApp notifications for status updates

### 🔧 System Features
- **🛡️ Security**: JWT-based authentication, CSRF protection, secure session management
- **☁️ Cloud Integration**: Supabase for file storage and WhatsApp API integration
- **📱 WhatsApp Integration**: Automated notifications and OTP delivery
- **🔄 Real-Time Updates**: Live status updates and notifications
- **📊 Analytics**: Comprehensive reporting and analytics for system performance
- **🎨 Modern UI**: Clean, intuitive interface built with React and Tailwind CSS

---

## 🛠️ Technology Stack

### Backend
- **Framework**: Python Flask 3.1.2
- **Database**: PostgreSQL 13+ with psycopg2-binary connection pooling
- **Authentication**: 
  - JWT (JSON Web Tokens) for session management
  - Google OAuth 2.0 for admin authentication
  - WhatsApp OTP verification for users
- **Session Management**: Flask-Session with secure cookies
- **API Documentation**: Comprehensive REST API with detailed endpoints
- **File Storage**: Supabase for document and authorization letter storage
- **Payment Processing**: Maya payment gateway integration
- **Logging**: Structured logging for audit trails and debugging
- **Dependencies**: Authlib, google-auth, postgrest, supabase, pydantic, httpx

### Frontend
- **Framework**: React 19.2.0 with modern hooks and context
- **Styling**: Tailwind CSS 3.4.18 for responsive design
- **Routing**: React Router DOM 7.9.4 for navigation
- **State Management**: React Context API with custom hooks
- **HTTP Client**: Axios for API communication
- **Build Tools**: React Scripts 5.0.1 with dotenv-cli
- **Development**: Hot reload, proxy configuration for API calls
- **Additional Libraries**: React DnD, html2pdf.js, testing libraries

### Database & Infrastructure
- **Database**: PostgreSQL 13+ with optimized indexes
- **Connection Pooling**: psycopg2-binary connection pool for performance
- **File Storage**: Supabase for cloud file storage
- **Environment Management**: Python pipenv for dependency management
- **Configuration**: Environment-based configuration with .env files

### External Integrations
- **Google OAuth**: Admin authentication with domain restrictions
- **WhatsApp Business API**: OTP verification and notifications
- **Maya Payment Gateway**: Secure payment processing
- **Supabase**: Cloud storage and additional backend services

---

## 🚀 Quick Start

### Prerequisites
Ensure you have the following installed:
- **Python 3.13+**
- **Node.js 16+** and **npm**
- **PostgreSQL 13+** (running instance)
- **Git**

### 🏃‍♂️ Rapid Setup

```bash
# 1. Clone the repository
git clone https://online-doc-req-admin@bitbucket.org/registrar-online-document-request/registrar-odr.git
cd registrar-odr

# 2. Backend setup
pipenv shell
pipenv install

# 3. Frontend setup (in another terminal)
cd frontend
npm install
cd ..

# 4. Database setup
createdb odr_system

# 5. Environment configuration
cp .env.example .env
# Edit .env with your configuration

# 6. Initialize database
python -c "from app.db_init import initialize_and_populate; initialize_and_populate()"

# 7. Run the application
# Terminal 1 - Backend
python run.py

# Terminal 2 - Frontend
cd frontend && npm start
```

### 🌐 Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://127.0.0.1:8000 (proxied through frontend)
- **Admin Panel**: http://localhost:3000/admin/login

---

## 📋 Detailed Setup Guide

### 1️⃣ Prerequisites Installation

#### Python & Dependencies
```bash
# Install Python 3.13
# Install pipenv
pip install pipenv

# Verify installation
python --version
pipenv --version
```

#### Node.js & npm
```bash
# Install Node.js 16+ from nodejs.org
# Verify installation
node --version
npm --version
```

#### PostgreSQL
```bash
# Install PostgreSQL 13+
# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database user and database
sudo -u postgres psql
CREATE USER odr_user WITH PASSWORD 'your_password';
CREATE DATABASE odr_system OWNER odr_user;
GRANT ALL PRIVILEGES ON DATABASE odr_system TO odr_user;
\q
```

### 2️⃣ Environment Setup

#### Clone Repository
```bash
git clone https://online-doc-req-admin@bitbucket.org/registrar-online-document-request/registrar-odr.git
cd registrar-odr
```

#### Backend Environment
```bash
# Activate virtual environment
pipenv shell

# Install Python dependencies
pipenv install

# Alternative: Install from requirements.txt
pip install -r requirements.txt
```

#### Frontend Environment
```bash
# Navigate to frontend directory
cd frontend

# Install Node.js dependencies
npm install

# Return to project root
cd ..
```

### 3️⃣ Database Configuration

#### Create Database
```sql
-- Connect to PostgreSQL as superuser
psql -U postgres

-- Create database and user
CREATE DATABASE odr_system;
CREATE USER odr_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE odr_system TO odr_user;

-- Exit PostgreSQL
\q
```

#### Database Initialization
The system automatically creates tables on first run. Manual initialization:
```bash
# Run database initialization
python -c "from app.db_init import initialize_and_populate; initialize_and_populate()"
```

### 4️⃣ Environment Variables Configuration

Create a `.env` file in the project root directory:

```bash
# ===========================================
# FLASK APPLICATION CONFIGURATION
# ===========================================
FLASK_SECRET_KEY="your-super-secret-flask-key-here"
JWT_SECRET_KEY="your-jwt-secret-key-here"

# ===========================================
# DATABASE CONFIGURATION
# ===========================================
DB_NAME=odr_system
DB_USERNAME=odr_user
DB_PASSWORD=your_secure_password
DB_HOST=localhost
DB_PORT=5432

# ===========================================
# GOOGLE OAUTH CONFIGURATION
# ===========================================
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# ===========================================
# SUPABASE CONFIGURATION
# ===========================================
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_ANON_KEY="your-supabase-anon-key"

# ===========================================
# PAYMENT GATEWAY CONFIGURATION
# ===========================================
MAYA_SECRET_KEY="your-maya-secret-key"
MAYA_PUBLIC_KEY="your-maya-public-key"

# ===========================================
# FRONTEND CONFIGURATION
# ===========================================
FRONTEND_URL="http://localhost:3000"
```

### 5️⃣ Running the Application

#### Development Mode

**Backend (Terminal 1):**
```bash
# Activate virtual environment
pipenv shell

# Run Flask development server
python run.py
```

**Frontend (Terminal 2):**
```bash
cd frontend
npm start
```

#### Build for Production

**Frontend Build:**
```bash
cd frontend
npm run build
# This automatically copies the build to app/static/react/
```

**Backend Production:**
```bash
# Using Gunicorn
gunicorn --bind 0.0.0.0:8000 run:app
```

### 6️⃣ Default Admin Account

To create the first admin account:

1. **Google OAuth Setup**:
   - Configure Google OAuth 2.0 with @g.msuiit.edu.ph domain restriction
   - Add authorized redirect URIs: `http://localhost:3000/admin/callback`

2. **First Admin Login**:
   - Navigate to admin panel
   - Login with Google account from @g.msuiit.edu.ph domain
   - System automatically creates admin role

---

## 🔧 Configuration

### Backend Configuration
The system uses environment-based configuration through `config.py`:

```python
# Key configuration values
FLASK_SECRET_KEY = getenv("FLASK_SECRET_KEY")
JWT_SECRET_KEY = getenv("JWT_SECRET_KEY")
DB_NAME = getenv("DB_NAME")
DB_USERNAME = getenv("DB_USERNAME")
DB_PASSWORD = getenv("DB_PASSWORD")
DB_HOST = getenv("DB_HOST")
DB_PORT = getenv("DB_PORT")
GOOGLE_CLIENT_ID = getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = getenv("GOOGLE_CLIENT_SECRET")
SUPABASE_URL = getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = getenv("SUPABASE_ANON_KEY")
FRONTEND_URL = getenv("FRONTEND_URL", "http://localhost:3000")
```

### Frontend Configuration
The frontend uses React Scripts with proxy configuration:

```json
{
  "proxy": "http://127.0.0.1:8000",
  "scripts": {
    "start": "dotenv -e ../.env -- react-scripts start",
    "build": "react-scripts build && rm -rf ../app/static/react && mkdir -p ../app/static/react && cp -r build/* ../app/static/react/"
  }
}
```

### Database Configuration

The system uses PostgreSQL with connection pooling for optimal performance. Connection settings are managed through environment variables.

### Session Configuration
```python
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "lax"
app.config["SESSION_COOKIE_SECURE"] = False  # Set True in production
app.config["SESSION_TYPE"] = "filesystem"
```

---

## 📚 Documentation

### API Documentation
The ODR system provides a comprehensive REST API with detailed endpoints for both users and administrators. For complete API documentation, see [Documentation/API_DOCUMENTATION.md](Documentation/API_DOCUMENTATION.md).

### Admin Panel Documentation
Comprehensive documentation covering all administrative features and functionality:

#### 📊 [Admin Dashboard Documentation](Documentation/01_DASHBOARD_TAB.md)
Central command center providing statistical overview and real-time monitoring of system performance, request statistics, and administrative activities.

#### 🔐 [Admin Authentication Documentation](Documentation/02_AUTHENTICATION_TAB.md)
Security gateway managing administrator access through Google OAuth integration and comprehensive admin user management with role-based access control.

#### 📋 [Manage Request Documentation](Documentation/03_MANAGE_REQUEST_TAB.md)
Complete request lifecycle management system enabling administrators to view, assign, process, and track document requests from submission to completion.

#### 📄 [Document Management Documentation](Documentation/04_DOCUMENT_MANAGEMENT_TAB.md)
Administrative control center for defining, configuring, and maintaining document types, requirements, and the foundational data structure for document processing.

#### 📝 [Logging Documentation](Documentation/05_LOGGING_TAB.md)
Comprehensive audit and monitoring system providing complete visibility into all administrative activities, system events, and operational logging for security and compliance.

#### ⚙️ [Settings Documentation](Documentation/06_SETTINGS_TAB.md)
Central configuration management hub for system parameters, operational constraints, user access policies, and administrative configurations affecting all system users.

#### 💰 [Transactions Documentation](Documentation/07_TRANSACTIONS_TAB.md)
Comprehensive financial management and reporting center for transaction oversight, revenue tracking, payment processing, and financial analytics.

#### 📖 [Admin Documentation Index](Documentation/00_ADMIN_DOCUMENTATION_INDEX.md)
Master index and overview document providing cross-tab integration details and comprehensive guide to all administrative functionality.

### Complete Documentation Overview
All admin documentation covers the complete implementation flow from **Database Models → Backend Controllers → Frontend Interfaces**, explaining each feature in detail without code examples, focusing on plain language explanations of functionality, integration points, and system architecture.

### 🔗 Quick API Reference

#### Authentication Endpoints
- **User**: `POST /user/authentication/check-id` - Verify student ID
- **User**: `POST /user/authentication/verify-otp` - Verify OTP
- **Admin**: `POST /api/admin/google-login` - Google OAuth login

#### Core Functionality
- **Documents**: `GET /user/document_list/api/view-documents` - Get available documents
- **Requests**: `POST /user/request/api/complete-request` - Submit new request
- **Tracking**: `POST /user/tracking/api/track` - Track request status
- **Payments**: `POST /user/payment/mark-paid` - Mark payment

#### Admin Endpoints
- **Dashboard**: `GET /api/admin/dashboard` - Get admin statistics
- **Management**: `PUT /api/admin/requests/<id>/status` - Update request status
- **Settings**: `PUT /api/admin/settings` - Update system settings

### 📊 API Features
- **JWT Authentication** with HTTP-only cookies
- **Rate Limiting** (100 requests/minute for users, 1000 for admins)
- **Comprehensive Error Handling** with detailed responses
- **Request/Response Logging** for audit trails
- **Webhook Support** for payment notifications

---

## 📁 Project Structure

```
registrar-odr-1/
├── 📁 app/                          # Main Flask application
│   ├── 📁 admin/                    # Admin module
│   │   ├── 📁 authentication/       # Admin authentication (Google OAuth)
│   │   ├── 📁 dashboard/            # Admin dashboard
│   │   ├── 📁 document_manage/      # Document management
│   │   ├── 📁 logging/              # System logging
│   │   ├── 📁 manage_request/       # Request management
│   │   ├── 📁 settings/             # System settings
│   │   └── 📁 transactions/         # Financial transactions
│   ├── 📁 user/                     # User module
│   │   ├── 📁 authentication/       # User authentication (OTP)
│   │   ├── 📁 document_list/        # Document listing
│   │   ├── 📁 landing/              # Landing page
│   │   ├── 📁 payment/              # Payment processing
│   │   ├── 📁 request/              # Document requests
│   │   └── 📁 tracking/             # Request tracking
│   ├── 📁 whatsapp/                 # WhatsApp integration
│   ├── 📁 services/                 # External services
│   │   └── 📁 supabase_file_service.py
│   ├── 📁 utils/                    # Utility functions
│   │   ├── 📁 decorator.py          # Custom decorators
│   │   └── 📁 error_handlers.py     # Error handling
│   ├── 📁 templates/                # HTML templates
│   │   └── 📁 index.html            # Main template
│   ├── 📁 __init__.py               # Flask app factory
│   ├── 📁 db_init.py                # Database initialization
│   └── 📁 static/                   # Static files
│       └── 📁 react/                # Built React application
├── 📁 frontend/                     # React frontend application
│   ├── 📁 src/
│   │   ├── 📁 components/           # React components
│   │   │   ├── 📁 admin/            # Admin-specific components
│   │   │   ├── 📁 common/           # Shared components
│   │   │   ├── 📁 icons/            # Custom icons
│   │   │   └── 📁 user/             # User-specific components
│   │   ├── 📁 contexts/             # React contexts
│   │   │   └── 📁 AuthContext.jsx   # Authentication context
│   │   ├── 📁 hooks/                # Custom React hooks
│   │   ├── 📁 pages/                # Page components
│   │   ├── 📁 services/             # API services
│   │   └── 📁 utils/                # Frontend utilities
│   │       ├── 📁 csrf.js           # CSRF utilities
│   │       └── 📁 roleUtils.js      # Role utilities
│   ├── 📁 public/                   # Static assets
│   │   └── 📁 assets/               # Images and icons
│   ├── 📁 package.json              # Node.js dependencies
│   └── 📁 tailwind.config.js        # Tailwind CSS configuration
├── 📁 Documentation/                # Project documentation
│   ├── 📄 API_DOCUMENTATION.md      # Detailed API docs
│   ├── 📄 API_ENDPOINTS_CHECK.md    # Endpoint testing guide
│   ├── 📄 COMPREHENSIVE_TESTING_CHECKLIST.md
│   ├── 📄 DATE_TIME_RESTRICTION.md
│   ├── 📄 00_ADMIN_DOCUMENTATION_INDEX.md
│   ├── 📄 01_DASHBOARD_TAB.md
│   ├── 📄 02_AUTHENTICATION_TAB.md
│   ├── 📄 03_MANAGE_REQUEST_TAB.md
│   ├── 📄 04_DOCUMENT_MANAGEMENT_TAB.md
│   ├── 📄 05_LOGGING_TAB.md
│   ├── 📄 06_SETTINGS_TAB.md
│   └── 📄 07_TRANSACTIONS_TAB.md
├── 📁 migrate/                      # Database migration scripts
│   └── 📄 migrate_college_code.py
├── 📄 config.py                     # Configuration management
├── 📄 requirements.txt              # Python dependencies
├── 📄 Pipfile                       # Pipenv configuration
├── 📄 Pipfile.lock                  # Pipenv lock file
├── 📄 run.py                        # Application entry point
├── 📄 .gitignore                    # Git ignore rules
└── 📄 README.md                     # This file
```

### 🏗️ Architecture Overview

**Backend Architecture (Flask)**:
- **Modular Blueprint Structure**: Separate blueprints for user/admin functionality
- **Database Connection Management**: Environment-based PostgreSQL connections
- **JWT Authentication**: Stateless authentication with secure cookies
- **Error Handling**: Comprehensive error handling with custom handlers
- **Logging**: Structured logging for audit trails and debugging

**Frontend Architecture (React)**:
- **Component-Based Design**: Reusable React components
- **Context API**: Global state management for authentication
- **Custom Hooks**: Reusable logic for API calls and state management
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Routing**: Client-side routing with React Router

**Database Design**:
- **Normalized Schema**: Optimized for performance and data integrity
- **Connection Management**: Efficient database connection management
- **Indexes**: Strategic indexes for query optimization
- **Constraints**: Foreign key constraints and data validation

---

## 🧪 Testing

### Backend Testing

```bash
# Activate virtual environment
pipenv shell

# Run specific test files
python -m pytest tests/test_authentication.py -v

# Run all tests
python -m pytest tests/ -v

# Run with coverage
python -m pytest --cov=app tests/

# Run specific test categories
python -m pytest tests/test_api_endpoints.py -k "user_authentication"
```

### Frontend Testing

```bash
cd frontend

# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run tests in watch mode
npm test -- --watch

# Run specific test files
npm test -- src/components/admin/Dashboard.test.js
```

### API Testing

The system includes comprehensive API endpoint testing:

```bash
# Test all endpoints
python Documentation/API_ENDPOINTS_CHECK.md

# Test specific categories
python -m pytest tests/test_api_user.py -v
python -m pytest tests/test_api_admin.py -v
python -m pytest tests/test_api_authentication.py -v
```

### Manual Testing

#### User Flow Testing
1. **Student Registration**: Test with valid student IDs
2. **OTP Verification**: Verify WhatsApp integration
3. **Document Request**: Test complete request flow
4. **Payment Processing**: Test Maya integration
5. **Status Tracking**: Verify real-time updates

#### Admin Flow Testing
1. **Google OAuth**: Test with @g.msuiit.edu.ph accounts
2. **Request Management**: Test all status transitions
3. **Document Management**: Test CRUD operations
4. **Settings Configuration**: Test system settings
5. **Transaction Processing**: Test financial reporting

---

## 🚀 Deployment

### Production Deployment

#### Option 1: Docker Deployment

**Backend Dockerfile:**
```dockerfile
FROM python:3.13-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 8000

CMD ["gunicorn", "--bind", "0.0.0.0:8000", "run:app"]
```

**Frontend Dockerfile:**
```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY frontend/package*.json ./
RUN npm install

COPY frontend/ .
RUN npm run build

FROM nginx:alpine
COPY --from=0 /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**Docker Compose:**
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:13
    environment:
      POSTGRES_DB: odr_system
      POSTGRES_USER: odr_user
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  backend:
    build: .
    environment:
      DB_HOST: postgres
      DB_NAME: odr_system
      DB_USERNAME: odr_user
      DB_PASSWORD: password
      FLASK_ENV: production
    depends_on:
      - postgres
    ports:
      - "8000:8000"

  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    ports:
      - "80:80"
    depends_on:
      - backend

volumes:
  postgres_data:
```

#### Option 2: Traditional Server Deployment

**Backend Deployment:**
```bash
# Install dependencies
pipenv install --deploy

# Build frontend
cd frontend && npm run build && cd ..

# Run with Gunicorn
gunicorn --bind 0.0.0.0:8000 --workers 4 --timeout 120 run:app
```

**Nginx Configuration:**
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        root /path/to/registrar-odr-1/app/static/react;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket support for real-time features
    location /socket.io {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

### Environment Variables for Production

```bash
# Production .env file
FLASK_ENV=production
FLASK_SECRET_KEY="your-production-secret-key"
JWT_SECRET_KEY="your-production-jwt-secret"
DB_HOST=your-production-db-host
DB_NAME=odr_production
DB_USERNAME=odr_prod_user
DB_PASSWORD=your-secure-production-password

# Enable security features
SESSION_COOKIE_SECURE=true
JWT_COOKIE_SECURE=true

# Production URLs
SUPABASE_URL="https://your-prod-project.supabase.co"
GOOGLE_CLIENT_ID="your-production-google-client-id"
FRONTEND_URL="https://your-domain.com"
```

### SSL/TLS Configuration

**Nginx SSL Configuration:**
```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;

    # SSL security settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;

    # HSTS
    add_header Strict-Transport-Security "max-age=63072000" always;
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;

    # Frontend
    location / {
        root /path/to/registrar-odr-1/app/static/react;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

### Database Migration for Production

```bash
# Backup existing database
pg_dump -h localhost -U odr_user odr_system > backup.sql

# Run migrations
python -c "from app.db_init import initialize_and_populate; initialize_and_populate()"
```

### Monitoring and Logging

**Systemd Service (Linux):**
```ini
[Unit]
Description=ODR Backend
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/path/to/registrar-odr-1
Environment=PATH=/path/to/registrar-odr-1/.venv/bin
ExecStart=/path/to/registrar-odr-1/.venv/bin/gunicorn --bind 127.0.0.1:8000 run:app
Restart=always

[Install]
WantedBy=multi-user.target
```

**Log Rotation:**
```bash
# /etc/logrotate.d/odr
/path/to/registrar-odr-1/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
}
```

---

## 🔒 Security

### Authentication Security
- **JWT Tokens**: Secure, stateless authentication
- **HTTP-Only Cookies**: Prevent XSS attacks
- **CSRF Protection**: Built-in CSRF token validation
- **Domain Restrictions**: Google OAuth restricted to @g.msuiit.edu.ph

### Database Security
- **Connection Management**: Secure database connections
- **Parameterized Queries**: SQL injection prevention
- **Input Validation**: Comprehensive input sanitization
- **Access Controls**: Role-based access control

### API Security
- **Rate Limiting**: Prevent abuse and DoS attacks
- **Request Validation**: Comprehensive request validation
- **Error Handling**: Secure error responses
- **Audit Logging**: Complete audit trail

### Payment Security
- **Webhook Verification**: HMAC signature validation
- **Secure Communication**: HTTPS-only payment processing
- **Data Encryption**: Sensitive data encryption at rest

---

## 🤝 Contributing

We welcome contributions to the ODR system! Please follow these guidelines:

### Getting Started

1. **Fork the Repository**
   ```bash
   git clone https://your-username@bitbucket.org/registrar-online-document-request/registrar-odr.git
   ```

2. **Create a Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make Changes**
   - Follow coding standards
   - Add tests for new features
   - Update documentation

4. **Submit a Pull Request**
   - Describe changes clearly
   - Reference any related issues

### Development Guidelines

#### Code Style
- **Python**: Follow PEP 8 guidelines
- **JavaScript**: Use ESLint configuration
- **CSS**: Use Tailwind CSS classes
- **Documentation**: Update README and API docs

#### Commit Messages
```bash
# Good commit messages
git commit -m "feat: add document request validation"
git commit -m "fix: resolve payment webhook timeout issue"
git commit -m "docs: update API documentation for user endpoints"
```

#### Testing Requirements
- **Minimum 80% Code Coverage**
- **All New Features Must Be Tested**
- **API Endpoints Must Have Integration Tests**
- **Frontend Components Must Have Unit Tests**

### Reporting Issues

When reporting issues, please include:
- **Environment Details** (OS, Python version, Node version)
- **Steps to Reproduce**
- **Expected vs Actual Behavior**
- **Screenshots/Logs** (if applicable)

### Feature Requests

For feature requests, please:
- **Check Existing Issues** first
- **Provide Clear Use Case**
- **Suggest Implementation Approach**
- **Consider Security Implications**

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

### MIT License Summary
- **Commercial Use**: ✅ Allowed
- **Modification**: ✅ Allowed  
- **Distribution**: ✅ Allowed
- **Private Use**: ✅ Allowed
- **Liability**: ❌ Not covered
- **Warranty**: ❌ Not covered

---

## 📞 Support

### Documentation
- **API Documentation**: [Documentation/API_DOCUMENTATION.md](Documentation/API_DOCUMENTATION.md)
- **Setup Guide**: See [Quick Start](#-quick-start) section
- **Configuration**: See [Configuration](#-configuration) section

### Getting Help
- **GitHub Issues**: Report bugs and feature requests
- **Documentation**: Check comprehensive docs first
- **Community**: Reach out to maintainers

### Common Issues

#### Database Connection Issues
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Test database connection
psql -h localhost -U odr_user -d odr_system
```

#### Environment Variable Issues
```bash
# Verify environment variables
python -c "from dotenv import load_dotenv; load_dotenv('.env'); import os; print(dict(os.environ))"
```

#### Permission Issues
```bash
# Fix file permissions
chmod +x run.py
chown -R $USER:$USER .

# Fix PostgreSQL permissions
sudo chown -R postgres:postgres /var/lib/postgresql
```

---

## 🎯 Roadmap

### Version 2.0 (Planned)
- **Mobile Application**: Native iOS/Android apps
- **Advanced Analytics**: Business intelligence dashboard
- **Multi-Language Support**: Internationalization
- **Bulk Operations**: Bulk request processing
- **Advanced Search**: Elasticsearch integration

### Version 2.1 (Future)
- **API Rate Limiting**: Advanced rate limiting
- **Webhook Management**: Custom webhook endpoints
- **Document Templates**: Dynamic document generation
- **Integration APIs**: Third-party system integration

### Long-term Goals
- **AI Integration**: Automated document processing
- **Blockchain**: Immutable audit trails
- **Microservices**: Service-oriented architecture
- **Cloud-Native**: Kubernetes deployment support

---

## 🙏 Acknowledgments

- **MSU-IIT**: For the original requirements and testing
- **Flask Community**: For the excellent web framework
- **React Team**: For the powerful frontend library
- **PostgreSQL Community**: For the robust database system
- **Contributors**: All developers who have contributed to this project

---

<div align="center">

**Made with ❤️ for educational institutions**

[⬆️ Back to Top](#-registrar-online-document-request-odr-system)

</div>

