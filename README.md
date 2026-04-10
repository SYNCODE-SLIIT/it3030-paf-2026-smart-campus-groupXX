# 🎓 Smart Campus Management System

**Project by:** SYNCODE

A full-stack automated campus management system built with a microservice-inspired layered architecture. The frontend and backend run in Docker, and database integration is deferred for now.

## 🏗️ Project Structure

The repository is split into three main components (plus a Docker Compose orchestrator):

- **`frontend/`**: Next.js 16 (React) application for the user interface.
- **`backend/`**: Spring Boot (Java 21) REST API handling business logic.
- **Database**: Not wired yet.
- **`docker-compose.yml`**: Runs the frontend and backend locally.

## 📂 Where the "Actual Code" Happens

If you are developing features, you will spend most of your time in these folders (create the packages/folders as needed as the project grows).

### Backend (Java)

```text
backend/
├── src/main/java/com/university/smartcampus/
│   ├── config/         # Security, CORS, and Global Beans
│   ├── controller/     # REST Endpoints (e.g., ResourceController.java)
│   ├── dto/            # Data Transfer Objects (Requests/Responses)
│   ├── service/        # THE BRAIN: Complex business logic happens here
│   └── SmartCampusApplication.java
└── src/main/resources/
    ├── application.properties  # App settings
    └── data.sql                # (Optional) Initial test data
```

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

You do not need to install Java or Maven locally. Docker Compose runs the frontend and backend.

```bash
# Start the frontend and backend
docker compose up --build
```

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8080/api/health
- **Database**: Not connected yet

To stop the stack:

```bash
docker compose down
```

## 🛠️ Developer Workflow

### Hot-Reloading

- **Backend**: Source code is bind-mounted into the container, and Spring Boot DevTools is included; saving a `.java` file triggers an automatic restart.
- **Frontend**: Saving a `.tsx` file in Next.js dev mode refreshes the browser.

### Database Integration

Persistence is intentionally not configured in the current repository. When you later add Supabase or another database, introduce the required entity/repository packages and the matching backend configuration in the same change.

## 📋 Assignment Compliance Checklist

- ✅ **Demonstrable Locally**: Yes (via Docker Compose).
- ✅ **Layered Architecture**: Yes (Controller → Service, with room to add persistence later).
- ⚠️ **Persistence**: Not implemented yet.
- ⚠️ **CI/CD**: Not included yet (no GitHub Actions workflow found in this repository).
