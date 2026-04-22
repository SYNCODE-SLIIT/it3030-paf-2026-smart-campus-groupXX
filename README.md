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

If you are using Supabase now, put the database connection in the backend container, not in the frontend app.

For Supabase session pooler, use these values from the Supabase "Connect" panel:

- Host: `aws-0-<region>.pooler.supabase.com`
- Port: `5432`
- Database: `postgres`
- Username: `postgres.<project-ref>`
- Password: your database password

Create a root `.env` file from `.env.example` and fill in:

```dotenv
SPRING_DATASOURCE_URL=jdbc:postgresql://aws-0-<region>.pooler.supabase.com:5432/postgres?sslmode=require
SPRING_DATASOURCE_USERNAME=postgres.<project-ref>
SPRING_DATASOURCE_PASSWORD='<your-db-password>'
```

`docker-compose.yml` passes those variables to the `backend` service.

Only use `frontend/.env.local` for frontend Supabase values:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key> # server-side only
```

Do not put your pooled Postgres `DATABASE_URL` in `frontend/.env.local` for this project. This repo's database access belongs in the Spring Boot backend.

Note: the current backend still does not include PostgreSQL/JDBC/JPA dependencies, so these environment values set the correct secret locations first. You still need to add the actual persistence layer in the backend before it can query Supabase.

## Supabase Auth Email and Core Staff Bootstrap

The backend sends invite, reinvite, and login emails through Supabase Auth APIs. To ensure those emails are delivered from your organization mailbox, configure custom SMTP directly in Supabase Auth.

### 1) Configure Supabase Custom SMTP

In **Supabase Dashboard -> Authentication -> Email -> SMTP settings**:

- Sender email: `support@teamsyncode.com`
- Sender name: `Team Syncode`
- Host: `smtp.resend.com`
- Port: `465`
- Username: `resend`
- Password: your Resend SMTP password/API key
- Minimum interval per user: `60` seconds

Before enabling in production, verify SPF/DKIM/DMARC for your sender domain in Resend.

### 2) Seed Core Staff Accounts (Application DB)

Flyway migration `V202604211430__seed_core_staff_accounts.sql` seeds these ACTIVE accounts:

- `admin@teamsyncode.com` (ADMIN)
- `catalog@teamsyncode.com` (MANAGER, CATALOG_MANAGER)
- `technician@teamsyncode.com` (MANAGER, TICKET_MANAGER)
- `booking@teamsyncode.com` (MANAGER, BOOKING_MANAGER)

Flyway runs automatically when the backend starts.

### 3) Provision Supabase Password Identities

SQL user records alone are not enough for sign-in. After migrations are applied, provision/update Supabase Auth identities for the same emails:

```powershell
pwsh ./backend/scripts/provision-core-staff-auth.ps1 \
  -SupabaseUrl "https://<project-ref>.supabase.co" \
  -SupabaseServiceRoleKey "<service-role-key>" \
  -InitialPassword (ConvertTo-SecureString "User@123" -AsPlainText -Force)
```

### 4) Post-Provision Security Step

Rotate the bootstrap password immediately after first successful access in each environment.

The public endpoint `/api/auth/login-link/request` now applies backend rate-limiting controls. Keep limits enabled in production and tune them with these environment variables if needed:

- `APP_AUTH_LOGIN_LINK_RATE_LIMIT_ENABLED`
- `APP_AUTH_LOGIN_LINK_RATE_LIMIT_PER_IP_MAX_REQUESTS`
- `APP_AUTH_LOGIN_LINK_RATE_LIMIT_PER_IP_WINDOW_SECONDS`
- `APP_AUTH_LOGIN_LINK_RATE_LIMIT_PER_EMAIL_MAX_REQUESTS`
- `APP_AUTH_LOGIN_LINK_RATE_LIMIT_PER_EMAIL_WINDOW_SECONDS`
- `APP_AUTH_LOGIN_LINK_RATE_LIMIT_PER_EMAIL_MIN_INTERVAL_SECONDS`

## 📋 Assignment Compliance Checklist

- ✅ **Demonstrable Locally**: Yes (via Docker Compose).
- ✅ **Layered Architecture**: Yes (Controller → Service, with room to add persistence later).
- ⚠️ **Persistence**: Not implemented yet.
- ⚠️ **CI/CD**: Not included yet (no GitHub Actions workflow found in this repository).
