# 🎓 Registrar: Online-Doc-Req System (ODR)

## 🎯 Overview

The **Registrar: Online Document Request (ODR)** system is a web-based application designed to streamline the process of requesting academic documents.  
By digitizing this process, the system reduces manual workload for registrar staff, improves efficiency, and provides a more transparent and convenient experience for students.

Students can submit requests for academic documents, track their status, and receive notifications when their documents are processed and ready.

---

## ✨ Key Features

### 👩‍🎓 User Capabilities (Students)
- **Request Documents:** Easily submit requests for various academic records (e.g., transcripts, certifications) through a guided online form.  
- **Track Requests:** View real-time status updates (e.g., *Pending, Processing, Ready for Pickup/Delivery*) for all submitted requests.  
- **Payment Integration:** Securely handle any associated fees directly within the system.  

### 🧑‍💼 Admin Capabilities (Registrar Staff)
- **Manage Requests:** Review, approve, reject, or update the status of student requests.  
- **Manage Documents:** Maintain and categorize document types, fees, and processing times.  
- **Logging:** Track administrative actions and system usage for auditing and security purposes.  

---

## 🛠️ Technology Stack

| Component | Technology |
|------------|-------------|
| **Backend** | Python (Flask) |
| **Frontend** | HTML, CSS, JavaScript |
| **Database** | PostgreSQL (PSQL) |
| **Environment Management** | Pipenv |

---

## 🚀 Deployment & Local Setup

### 1️⃣ Prerequisites
Ensure you have the following installed:
- **Python 3.13**
- **Pipenv**
- **PostgreSQL** (running instance)

---

### 2️⃣ Environment Setup

#### Clone the repository and set up the virtual environment:

```bash
git clone https://online-doc-req-admin@bitbucket.org/registrar-online-document-request/registrar-odr.git
```
```bash
cd registrar-odr
```


Activate virtual environment
```bash
pipenv shell
```

Install dependencies
```bash
pipenv install
```

### 3️⃣ Database and Configuration

#### 🧩 Create Database

Make sure your PostgreSQL server is running, then open your PostgreSQL terminal (e.g., `psql`) and create a new database for the ODR system:


-- Connect to PostgreSQL (optional if already connected)
```bash
psql -U postgres
```

-- Create the database
```bash
CREATE DATABASE odr_system;
```

Note: Replace "odr_system" with your preferred database Name 

#### ⚙️ Create `.env` File

In the project root directory, create a new file named **`.env`** and add the following environment variables:

```bash
REACT_APP_GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""


FLASK_APP=run.py
FLASK_ENV=development
FLASK_RUN_HOST=0.0.0.0
FLASK_RUN_PORT=8000


SECRET_KEY="YOUR_SECRET_KEY_HERE"
JWT_SECRET_KEY="YOUR_JWT_SECRET_KEY_HERE"


DB_NAME=""
DB_USERNAME=""
DB_PASSWORD=""
DB_HOST=""
DB_PORT=""


```

### 4️⃣ Run the Application

#### With your environment activated:

```bash
flask --app run.py run
```
