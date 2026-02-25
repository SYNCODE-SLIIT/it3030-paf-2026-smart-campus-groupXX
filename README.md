# 🎓 Smart Campus Management System

**Project by:** SYNCODE

A full-stack automated campus management system built with a microservice-inspired layered architecture. The entire stack is containerized with Docker so it "works on everyone’s machine".

## 🏗️ Project Structure

The repository is split into three main components (plus a Docker Compose orchestrator):

- **`frontend/`**: Next.js 16 (React) application for the user interface.
- **`backend/`**: Spring Boot (Java 21) REST API handling business logic.
- **Database**: MySQL 8.0 container (Docker Compose service: `db`).
- **`docker-compose.yml`**: Runs the full stack (frontend + backend + db).

## 📂 Where the "Actual Code" Happens

If you are developing features, you will spend most of your time in these folders (create the packages/folders as needed as the project grows).

### Backend (Java)

```text
backend/
├── src/main/java/com/university/smartcampus/
│   ├── config/         # Security, CORS, and Global Beans
│   ├── controller/     # REST Endpoints (e.g., ResourceController.java)
│   ├── dto/            # Data Transfer Objects (Requests/Responses)
│   ├── entity/         # Database Models (e.g., Resource.java)
│   ├── repository/     # JPA Interfaces for database queries
│   ├── service/        # THE BRAIN: Complex business logic happens here
│   └── SmartCampusApplication.java
└── src/main/resources/
    ├── application.properties  # Database and App settings
    └── data.sql                # (Optional) Initial test data
```

- `backend/src/main/java/com/university/smartcampus/entity`:
  Define database tables (JPA entities / POJOs).
- `backend/src/main/java/com/university/smartcampus/repository`:
  Interfaces for database queries (Spring Data JPA).
- `backend/src/main/java/com/university/smartcampus/service`:
  Business logic, calculations, and rules.
- `backend/src/main/java/com/university/smartcampus/controller`:
  API endpoints (URL mappings like `/api/...`).

### Frontend (TypeScript / React)

```text
frontend/
├── app/
│   ├── layout.tsx      # Persistent UI like the Sidebar/Navbar
│   ├── page.tsx        # Homepage (Dashboard)
│   ├── login/          # Login page (Folder-based routing)
│   └── resources/      # Facilities & Assets page
├── components/         # Reusable UI (Buttons, Tables, Cards)
├── lib/                # API utility functions (fetch, axios)
├── public/             # Static assets (logos, icons)
└── tailwind.config.ts  # Styling configurations
```

- `frontend/app/`: Main pages and routing (App Router).
- `frontend/components/`: Reusable UI elements (buttons, navbar, modals, etc.) — create this folder if it doesn’t exist yet.

## 🚀 Getting Started

### 1) Prerequisites

- **Docker Desktop** (required to run the entire stack)
- **VS Code** + **Extension Pack for Java** (recommended for backend development)

### 2) Clone and Setup

```bash
# Clone the repository
git clone https://github.com/SYNCODE-SLIIT/it3030-paf-2026-smart-campus-groupXX.git

# Enter the directory
cd it3030-paf-2026-smart-campus-groupXX
```

### 3) Running the System

You do not need to install Java, Maven, or MySQL locally. Docker Compose runs everything.

```bash
# Start the entire system (build images if needed)
docker-compose up --build
```

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8080/api/health
- **Database**: `localhost:3306` (User: `root`, Pass: `rootpassword`, DB: `smart_campus_db`)

To stop the stack:

```bash
docker-compose down
```

## 🛠️ Developer Workflow

### Hot-Reloading

- **Backend**: Source code is bind-mounted into the container, and Spring Boot DevTools is included; saving a `.java` file triggers an automatic restart.
- **Frontend**: Saving a `.tsx` file in Next.js dev mode refreshes the browser.

### Adding New Database Tables

1. Create a new file in `backend/src/main/java/com/university/smartcampus/entity/`.
2. Add your JPA annotations (e.g., `@Entity`, `@Table`, `@Id`).
3. With `spring.jpa.hibernate.ddl-auto=update`, Spring Boot will update the MySQL schema on restart.

## 📋 Assignment Compliance Checklist

- ✅ **Demonstrable Locally**: Yes (via Docker Compose).
- ✅ **Layered Architecture**: Yes (Controller → Service → Repository).
- ✅ **Persistence**: Yes (MySQL 8.0 + named volume `db_data`).
- ⚠️ **CI/CD**: Not included yet (no GitHub Actions workflow found in this repository).
