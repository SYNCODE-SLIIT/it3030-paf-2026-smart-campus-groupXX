# Smart Campus Management System

**Project by:** SYNCODE

A full-stack automated campus management system built with a layered architecture. The frontend (Next.js), backend (Spring Boot), and PostgreSQL database run together in Docker for development.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [File Hierarchy](#file-hierarchy)
3. [REST API Reference](#rest-api-reference)
4. [Frontend Routes](#frontend-routes)
5. [Getting Started](#getting-started)
6. [Database & Environment Setup](#database--environment-setup)
7. [Supabase Auth & Core Staff Bootstrap](#supabase-auth--core-staff-bootstrap)
8. [Assignment Compliance](#assignment-compliance)

---

## Tech Stack

| Layer     | Technology                                    |
|-----------|-----------------------------------------------|
| Frontend  | Next.js 16, React 19, TypeScript, Tailwind 4  |
| Backend   | Spring Boot 4.0, Java 21, Spring Security     |
| Database  | PostgreSQL (Docker local / Supabase hosted)   |
| Auth      | Supabase Auth (JWT / magic-link / password)   |
| Storage   | Supabase Storage (attachments, profile images)|
| Charting  | Recharts                                      |
| ORM       | Spring Data JPA + Hibernate + Flyway          |

---

## File Hierarchy

```
it3030-paf-2026-smart-campus-groupXX/
├── docker-compose.yml              # Orchestrates frontend + backend + postgres
├── .env                            # Root env vars (DB creds, backend config)
├── package.json                    # Root-level tooling scripts
│
├── backend/
│   ├── Dockerfile
│   ├── pom.xml
│   ├── scripts/
│   │   ├── provision-core-staff-auth.ps1   # Seeds Supabase Auth identities
│   │   ├── seed-admin-gmail.sql
│   │   ├── seed-admin-user.sql
│   │   └── smoke-user-management.ps1
│   └── src/main/java/com/university/smartcampus/
│       ├── SmartcampusApplication.java
│       ├── AppEnums.java
│       │
│       ├── auth/                           # Authentication domain
│       │   ├── controller/
│       │   │   └── AuthController.java
│       │   ├── dto/
│       │   │   └── AuthDtos.java
│       │   ├── identity/
│       │   │   ├── AuthIdentityClient.java
│       │   │   └── SupabaseAuthIdentityClient.java
│       │   ├── provider/
│       │   │   ├── AuthProviderClient.java
│       │   │   ├── StubAuthProviderClient.java
│       │   │   └── SupabaseAuthProviderClient.java
│       │   └── service/
│       │       ├── CurrentUserService.java
│       │       └── LoginLinkRateLimiter.java
│       │
│       ├── booking/                        # Booking domain
│       │   ├── BookingAnalyticsService.java
│       │   ├── BookingCheckInService.java
│       │   ├── BookingDecisionService.java
│       │   ├── BookingDtos.java
│       │   ├── BookingEntity.java
│       │   ├── BookingLifecycleScheduler.java
│       │   ├── BookingModificationEntity.java
│       │   ├── BookingModificationRepository.java
│       │   ├── BookingModificationService.java
│       │   ├── BookingReminderScheduler.java
│       │   ├── BookingRepository.java
│       │   ├── BookingResourceAvailabilityService.java
│       │   ├── BookingService.java
│       │   ├── BookingValidator.java
│       │   ├── RecurringBookingEntity.java
│       │   ├── RecurringBookingRepository.java
│       │   └── RecurringBookingService.java
│       │
│       ├── common/                         # Shared utilities
│       │   ├── controller/
│       │   │   └── HealthController.java
│       │   ├── dto/
│       │   │   └── ApiDtos.java
│       │   ├── entity/
│       │   │   └── TimestampedEntity.java
│       │   ├── enums/
│       │   │   └── AppEnums.java
│       │   └── exception/
│       │       ├── BadRequestException.java
│       │       ├── ConflictException.java
│       │       ├── ExternalServiceException.java
│       │       ├── ForbiddenException.java
│       │       ├── NotFoundException.java
│       │       ├── OnboardingRequiredException.java
│       │       └── UnauthorizedException.java
│       │
│       ├── config/                         # Spring configuration
│       │   ├── BootstrapAdminInitializer.java
│       │   ├── GlobalExceptionHandler.java
│       │   ├── SecurityConfig.java
│       │   └── SmartCampusProperties.java
│       │
│       ├── notification/                   # Notification domain
│       │   ├── AdminNotificationController.java
│       │   ├── NotificationController.java
│       │   ├── NotificationDeliveryAttemptEntity.java
│       │   ├── NotificationDeliveryAttemptRepository.java
│       │   ├── NotificationDeliveryService.java
│       │   ├── NotificationDtos.java
│       │   ├── NotificationEmailSender.java
│       │   ├── NotificationEnums.java
│       │   ├── NotificationEventEntity.java
│       │   ├── NotificationEventLinkEntity.java
│       │   ├── NotificationEventLinkRepository.java
│       │   ├── NotificationEventRepository.java
│       │   ├── NotificationPreferenceEntity.java
│       │   ├── NotificationPreferenceRepository.java
│       │   ├── NotificationRecipientEntity.java
│       │   ├── NotificationRecipientRepository.java
│       │   ├── NotificationService.java
│       │   ├── NoopNotificationEmailSender.java
│       │   └── SmtpNotificationEmailSender.java
│       │
│       ├── resource/                       # Resource/Campus asset domain
│       │   ├── Building.java
│       │   ├── BuildingDtos.java
│       │   ├── BuildingMapper.java
│       │   ├── BuildingRepository.java
│       │   ├── BuildingService.java
│       │   ├── Location.java
│       │   ├── LocationDtos.java
│       │   ├── LocationMapper.java
│       │   ├── LocationRepository.java
│       │   ├── LocationService.java
│       │   ├── ResourceAvailabilityWindow.java
│       │   ├── ResourceDtos.java
│       │   ├── ResourceEntity.java
│       │   ├── ResourceFeature.java
│       │   ├── ResourceFeatureRepository.java
│       │   ├── ResourceImage.java
│       │   ├── ResourceImageRepository.java
│       │   ├── ResourceMapper.java
│       │   ├── ResourceQrService.java
│       │   ├── ResourceRepository.java
│       │   ├── ResourceService.java
│       │   ├── ResourceType.java
│       │   ├── ResourceTypeDtos.java
│       │   ├── ResourceTypeMapper.java
│       │   ├── ResourceTypeRepository.java
│       │   └── ResourceTypeService.java
│       │
│       ├── ticket/                         # Support ticket domain
│       │   ├── assembler/
│       │   │   └── TicketModelAssembler.java
│       │   ├── controller/
│       │   │   └── TicketController.java
│       │   ├── dto/
│       │   │   └── TicketDtos.java
│       │   ├── entity/
│       │   │   ├── TicketAssignmentHistoryEntity.java
│       │   │   ├── TicketAttachmentEntity.java
│       │   │   ├── TicketCommentEntity.java
│       │   │   ├── TicketEntity.java
│       │   │   └── TicketStatusHistoryEntity.java
│       │   ├── repository/
│       │   │   ├── TicketAssignmentHistoryRepository.java
│       │   │   ├── TicketAttachmentRepository.java
│       │   │   ├── TicketCommentRepository.java
│       │   │   ├── TicketRepository.java
│       │   │   └── TicketStatusHistoryRepository.java
│       │   ├── service/
│       │   │   ├── BucketWindow.java
│       │   │   ├── SlaTargets.java
│       │   │   ├── TicketAnalyticsService.java
│       │   │   ├── TicketService.java
│       │   │   └── TicketSlaNotificationScheduler.java
│       │   └── storage/
│       │       ├── SupabaseTicketAttachmentStorageClient.java
│       │       └── TicketAttachmentStorageClient.java
│       │
│       └── user/                           # User management domain
│           ├── controller/
│           │   ├── AdminAuditLogController.java
│           │   ├── AdminBookingController.java
│           │   ├── AdminBuildingController.java
│           │   ├── AdminDashboardController.java
│           │   ├── AdminRecurringBookingController.java
│           │   ├── AdminUserController.java
│           │   ├── BookingCheckInController.java
│           │   ├── BookingController.java
│           │   ├── BookingModificationController.java
│           │   ├── CatalogueLocationController.java
│           │   ├── CatalogueResourceTypeController.java
│           │   ├── RecurringBookingController.java
│           │   ├── ResourceController.java
│           │   ├── StudentOnboardingController.java
│           │   └── StudentProfileImageController.java
│           ├── dto/
│           │   ├── AdminDtos.java
│           │   ├── AuditDtos.java
│           │   └── StudentDtos.java
│           └── entity/
│               ├── AdminEntity.java
│               ├── AuditLogEntity.java
│               ├── FacultyEntity.java
│               ├── ManagerEntity.java
│               └── StudentEntity.java
│
└── frontend/
    ├── next.config.ts
    ├── package.json
    ├── tsconfig.json
    ├── proxy.ts                        # Dev-time backend proxy config
    │
    ├── app/                            # Next.js App Router pages
    │   ├── layout.tsx                  # Root layout
    │   ├── globals.css
    │   ├── login/page.tsx
    │   ├── student/onboarding/page.tsx
    │   ├── students/onboarding/page.tsx
    │   ├── book/resource/[id]/page.tsx # Quick-book a specific resource
    │   ├── auth/
    │   │   ├── callback/page.tsx       # Supabase OAuth / magic-link callback
    │   │   ├── logout/route.ts
    │   │   └── welcome/page.tsx
    │   ├── (marketing)/                # Public marketing pages
    │   │   ├── page.tsx                # Landing
    │   │   ├── about/page.tsx
    │   │   ├── contact/page.tsx
    │   │   ├── features/page.tsx
    │   │   ├── resources/page.tsx
    │   │   └── components/page.tsx
    │   └── (protected)/                # Authenticated pages
    │       ├── portal/page.tsx         # Role-selector hub
    │       ├── account/security/page.tsx
    │       ├── students/               # Student portal
    │       │   ├── page.tsx            # Student dashboard
    │       │   ├── bookings/page.tsx
    │       │   └── tickets/
    │       │       ├── page.tsx
    │       │       └── [id]/page.tsx
    │       ├── faculty/                # Faculty portal
    │       │   ├── page.tsx
    │       │   └── bookings/page.tsx
    │       ├── admin/                  # Admin portal
    │       │   ├── page.tsx            # Admin dashboard
    │       │   ├── users/page.tsx
    │       │   ├── students/
    │       │   │   ├── page.tsx
    │       │   │   └── [id]/page.tsx
    │       │   ├── admins/
    │       │   │   ├── page.tsx
    │       │   │   └── [id]/page.tsx
    │       │   ├── managers/
    │       │   │   ├── page.tsx
    │       │   │   └── [id]/page.tsx
    │       │   ├── faculty/
    │       │   │   ├── page.tsx
    │       │   │   └── [id]/page.tsx
    │       │   ├── buildings/page.tsx
    │       │   ├── resources/
    │       │   │   ├── page.tsx
    │       │   │   └── [id]/page.tsx
    │       │   ├── bookings/page.tsx
    │       │   ├── tickets/
    │       │   │   ├── page.tsx
    │       │   │   └── [id]/page.tsx
    │       │   ├── analytics/page.tsx
    │       │   ├── audit-log/page.tsx
    │       │   ├── notifications/page.tsx
    │       │   └── reports/page.tsx
    │       └── (managers)/             # Manager portals
    │           ├── booking-managers/
    │           │   ├── page.tsx
    │           │   ├── bookings/page.tsx
    │           │   └── tickets/
    │           │       ├── page.tsx
    │           │       └── [id]/page.tsx
    │           ├── catalog-managers/
    │           │   ├── page.tsx
    │           │   └── catalog/page.tsx
    │           ├── ticket-managers/
    │           │   ├── page.tsx
    │           │   ├── analytics/page.tsx
    │           │   ├── completed/page.tsx
    │           │   ├── reported/
    │           │   │   ├── page.tsx
    │           │   │   └── [id]/page.tsx
    │           │   └── tickets/
    │           │       ├── page.tsx
    │           │       └── [id]/page.tsx
    │           └── managers/           # Shared manager catalog views
    │               ├── page.tsx
    │               ├── catalog/page.tsx
    │               ├── catalog/buildings/page.tsx
    │               ├── catalog/dashboard/page.tsx
    │               ├── catalog/resources/[id]/page.tsx
    │               └── catalog/tickets/
    │                   ├── page.tsx
    │                   └── [id]/page.tsx
    │
    ├── components/
    │   ├── charts/                 # BarChart, DonutChart, LineChart
    │   ├── layout/                 # Navbar, Sidebar, ProtectedShell, etc.
    │   ├── marketing/              # Landing-page components
    │   ├── notifications/          # NotificationBell, NotificationCenter
    │   ├── providers/              # AuthProvider, ToastProvider
    │   ├── screens/                # Full-page screen components per role
    │   │   ├── admin/              # Admin-specific screens and sub-components
    │   │   ├── catalogue/          # Catalog manager screens
    │   │   ├── manager/            # Manager dashboard screens
    │   │   └── login/
    │   ├── tickets/                # Ticket list and detail sub-components
    │   └── ui/                     # Design system primitives
    │       └── (Alert, Avatar, Badge, Button, Card, Checkbox, Chip,
    │           Dialog, Divider, DropdownMenu, GlassPill, IconButton,
    │           Input, Progress, Radio, Select, Skeleton, Table, Tabs,
    │           Textarea, Toast, Toggle, Tooltip)
    │
    └── lib/
        ├── api-client.ts           # Axios/fetch wrapper for backend calls
        ├── api-types.ts            # Shared TypeScript types mirroring DTOs
        ├── auth-routing.ts         # Post-login redirect logic
        ├── backend-url.ts          # Backend base URL helper
        ├── nav-rbac.ts             # Role-based navigation config
        ├── sla.ts                  # SLA display helpers
        ├── supabase/               # Supabase browser/server clients
        └── (building-display, location-display, resource-display,
            user-display, student-catalog, workspace, invite-flow,
            recovery-flow, route-progress)
```

---

## REST API Reference

Base URL: `http://localhost:8080`

All protected endpoints require a Bearer JWT in the `Authorization` header (issued by Supabase Auth).

### Role legend

| Symbol | Meaning |
|--------|---------|
| PUBLIC | No auth required |
| AUTH   | Any authenticated user |
| STUDENT | Student role required |
| ADMIN  | Admin role required |
| ADMIN \| BOOKING_MGR | Admin or Booking Manager |
| ADMIN \| CATALOG_MGR | Admin or Catalog Manager |

---

### Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | PUBLIC | Returns backend liveness string |

---

### Authentication — `/api/auth`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/login-link/request` | PUBLIC | Send magic-link email (rate-limited) |
| POST | `/api/auth/password-reset/request` | PUBLIC | Send password-reset email (rate-limited) |
| POST | `/api/auth/session/sync` | AUTH | Upsert user record from JWT claims after first login |
| GET  | `/api/auth/me` | AUTH | Return the currently authenticated user profile |

**Request bodies**

```json
// POST /api/auth/login-link/request
{ "email": "student@example.com" }

// POST /api/auth/password-reset/request
{ "email": "user@example.com" }
```

---

### Student Onboarding — `/api/students/me`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET  | `/api/students/me/onboarding` | STUDENT | Get current onboarding state |
| PUT  | `/api/students/me/onboarding` | STUDENT | Complete onboarding (name, student ID, etc.) |
| POST | `/api/students/me/profile-image` | STUDENT | Upload profile image (multipart/form-data, field: `file`) |

---

### Resources — `/api/resources`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET    | `/api/resources` | AUTH (onboarded) | List resources with optional filters |
| GET    | `/api/resources/options` | AUTH (onboarded) | Lightweight options list for dropdowns |
| GET    | `/api/resources/stats` | AUTH (onboarded) | Aggregate resource stats |
| GET    | `/api/resources/lookups` | AUTH | All lookup data (types, locations, features, roles) |
| GET    | `/api/resources/lookups/types` | AUTH | Resource type options |
| GET    | `/api/resources/lookups/locations` | AUTH | Location options |
| GET    | `/api/resources/lookups/features` | AUTH | Feature tag options |
| GET    | `/api/resources/lookups/managed-roles` | AUTH | Managed-by-role options |
| GET    | `/api/resources/{id}` | AUTH (onboarded) | Get single resource by UUID |
| POST   | `/api/resources` | ADMIN \| CATALOG_MGR | Create a new resource |
| PATCH  | `/api/resources/{id}` | ADMIN \| CATALOG_MGR | Partially update a resource |
| DELETE | `/api/resources/{id}` | ADMIN \| CATALOG_MGR | Soft-delete a resource |
| DELETE | `/api/resources/{id}/permanent` | ADMIN \| CATALOG_MGR | Hard-delete a resource |
| GET    | `/api/resources/{id}/qr` | ADMIN \| CATALOG_MGR | Download resource QR code (PNG) |

**Query params for `GET /api/resources`**

| Param | Type | Description |
|-------|------|-------------|
| `search` | string | Free-text search |
| `category` | enum | `ROOM`, `EQUIPMENT`, etc. |
| `status` | enum | `ACTIVE`, `INACTIVE`, `MAINTENANCE` |
| `location` | string | Location name filter |
| `page` | int (default 0) | Page number |
| `size` | int (default 50) | Page size |

---

### Bookings — `/api/bookings`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST   | `/api/bookings` | AUTH (onboarded) | Create a booking |
| GET    | `/api/bookings` | AUTH (onboarded) | List current user's bookings |
| GET    | `/api/bookings/{id}` | AUTH (onboarded) | Get a specific booking |
| GET    | `/api/bookings/resources/{resourceId}/remaining-ranges` | AUTH (onboarded) | Available time slots for a resource on a date |
| POST   | `/api/bookings/{id}/cancel` | AUTH (onboarded) | Cancel a booking |

**Query params for remaining-ranges**

| Param | Type | Description |
|-------|------|-------------|
| `date` | ISO date (`YYYY-MM-DD`) | The date to check |

---

### Booking Check-In — `/api/bookings/{bookingId}/check-in`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/bookings/{bookingId}/check-in` | AUTH | Check in to a booking |
| GET  | `/api/bookings/{bookingId}/check-in` | PUBLIC | Get check-in status |

---

### Booking Modifications — `/api/bookings/{bookingId}/modifications`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/bookings/{bookingId}/modifications` | AUTH | Request a modification to a booking |
| GET  | `/api/bookings/{bookingId}/modifications` | PUBLIC | List modifications for a booking |

---

### Recurring Bookings — `/api/recurring-bookings`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST   | `/api/recurring-bookings` | AUTH | Create a recurring booking series |
| GET    | `/api/recurring-bookings` | AUTH | List current user's recurring bookings |
| GET    | `/api/recurring-bookings/{id}` | AUTH | Get a specific recurring booking |
| DELETE | `/api/recurring-bookings/{id}` | AUTH | Deactivate (cancel) a recurring booking |

---

### Tickets — `/api/tickets`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST   | `/api/tickets` | AUTH (onboarded) | Submit a new support ticket |
| GET    | `/api/tickets` | AUTH (onboarded) | List tickets (filterable) |
| GET    | `/api/tickets/analytics` | AUTH (onboarded) | Ticket analytics |
| GET    | `/api/tickets/{ticketRef}` | AUTH (onboarded) | Get ticket by reference number |
| PATCH  | `/api/tickets/{ticketRef}` | AUTH (onboarded) | Update ticket fields |
| DELETE | `/api/tickets/{ticketRef}` | AUTH (onboarded) | Delete a ticket |
| PUT    | `/api/tickets/{ticketRef}/status` | AUTH (onboarded) | Update ticket status |
| PUT    | `/api/tickets/{ticketRef}/assign` | AUTH (onboarded) | Assign ticket to a user |

**Ticket query params**

| Param | Type | Description |
|-------|------|-------------|
| `status` | enum | `OPEN`, `IN_PROGRESS`, `RESOLVED`, `CLOSED` |
| `category` | enum | Ticket category |
| `priority` | enum | `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` |
| `scope` | enum | `MY_TICKETS`, `ALL` |

#### Ticket Comments

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET    | `/api/tickets/{ticketRef}/comments` | AUTH (onboarded) | List comments on a ticket |
| GET    | `/api/tickets/{ticketRef}/comments/{commentId}` | AUTH (onboarded) | Get a specific comment |
| POST   | `/api/tickets/{ticketRef}/comments` | AUTH (onboarded) | Add a comment |
| PATCH  | `/api/tickets/{ticketRef}/comments/{commentId}` | AUTH (onboarded) | Edit a comment |
| DELETE | `/api/tickets/{ticketRef}/comments/{commentId}` | AUTH (onboarded) | Delete a comment |

#### Ticket Attachments

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET    | `/api/tickets/{ticketRef}/attachments` | AUTH (onboarded) | List attachments |
| GET    | `/api/tickets/{ticketRef}/attachments/{attachmentId}` | AUTH (onboarded) | Get attachment metadata |
| POST   | `/api/tickets/{ticketRef}/attachments` (JSON) | AUTH (onboarded) | Add attachment by URL |
| POST   | `/api/tickets/{ticketRef}/attachments` (multipart) | AUTH (onboarded) | Upload a file attachment |
| DELETE | `/api/tickets/{ticketRef}/attachments/{attachmentId}` | AUTH (onboarded) | Delete an attachment |

#### Ticket Status History

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/tickets/{ticketRef}/history` | AUTH (onboarded) | Full status-change history |
| GET | `/api/tickets/{ticketRef}/history/{historyId}` | AUTH (onboarded) | Single history entry |

---

### Notifications — `/api/notifications`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET    | `/api/notifications` | AUTH (onboarded) | List notifications (filterable by status/domain/limit) |
| GET    | `/api/notifications/unread-count` | AUTH (onboarded) | Unread notification count |
| POST   | `/api/notifications/{notificationId}/read` | AUTH (onboarded) | Mark a notification as read |
| POST   | `/api/notifications/read-all` | AUTH (onboarded) | Mark all notifications as read |
| GET    | `/api/notifications/preferences` | AUTH (onboarded) | Get notification preferences |
| PATCH  | `/api/notifications/preferences` | AUTH (onboarded) | Update notification preferences |

**Query params for `GET /api/notifications`**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `status` | string | `all` | `all`, `unread`, `read` |
| `domain` | enum | — | Filter by domain (e.g. `BOOKING`, `TICKET`) |
| `limit` | int | — | Max notifications to return |

---

### Catalogue Management — `/api/catalog`

> Requires ADMIN or CATALOG_MANAGER role.

#### Buildings (read-only via catalog)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/catalog/buildings` | ADMIN \| CATALOG_MGR | List all buildings |

#### Locations

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET    | `/api/catalog/locations` | ADMIN \| CATALOG_MGR | List all locations |
| POST   | `/api/catalog/locations` | ADMIN \| CATALOG_MGR | Create a location |
| PATCH  | `/api/catalog/locations/{id}` | ADMIN \| CATALOG_MGR | Update a location |
| DELETE | `/api/catalog/locations/{id}` | ADMIN \| CATALOG_MGR | Delete a location |

#### Resource Types

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET    | `/api/catalog/resource-types` | ADMIN \| CATALOG_MGR | List resource types |
| POST   | `/api/catalog/resource-types` | ADMIN \| CATALOG_MGR | Create a resource type |
| PATCH  | `/api/catalog/resource-types/{id}` | ADMIN \| CATALOG_MGR | Update a resource type |
| DELETE | `/api/catalog/resource-types/{id}` | ADMIN \| CATALOG_MGR | Delete a resource type |

---

### Admin — Users `/api/admin/users`

> Requires ADMIN role.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST   | `/api/admin/users` | ADMIN | Create a single user |
| POST   | `/api/admin/users/bulk-students/preview` | ADMIN | Preview bulk student import (dry-run) |
| POST   | `/api/admin/users/bulk-students` | ADMIN | Execute bulk student import |
| GET    | `/api/admin/users` | ADMIN | List/search users |
| GET    | `/api/admin/users/{id}` | ADMIN | Get user by ID |
| PATCH  | `/api/admin/users/{id}` | ADMIN | Update user fields |
| PUT    | `/api/admin/users/{id}/manager-role` | ADMIN | Replace manager role |
| POST   | `/api/admin/users/{id}/invite` | ADMIN | Resend invite email |
| DELETE | `/api/admin/users/{id}` | ADMIN | Delete a user |

**Query params for `GET /api/admin/users`**

| Param | Type | Description |
|-------|------|-------------|
| `email` | string | Filter by email |
| `userType` | enum | `STUDENT`, `FACULTY`, `MANAGER`, `ADMIN` |
| `accountStatus` | enum | `ACTIVE`, `INACTIVE`, `PENDING` |
| `managerRole` | enum | `BOOKING_MANAGER`, `TICKET_MANAGER`, `CATALOG_MANAGER` |

---

### Admin — Dashboard `/api/admin/dashboard`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/admin/dashboard` | ADMIN | Aggregated admin dashboard stats |

---

### Admin — Buildings `/api/admin/buildings`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET    | `/api/admin/buildings` | ADMIN | List all buildings |
| POST   | `/api/admin/buildings` | ADMIN | Create a building |
| PATCH  | `/api/admin/buildings/{id}` | ADMIN | Update a building |
| DELETE | `/api/admin/buildings/{id}` | ADMIN | Deactivate a building |

---

### Admin — Bookings `/api/admin/bookings`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET    | `/api/admin/bookings` | ADMIN \| BOOKING_MGR | List all bookings |
| GET    | `/api/admin/bookings/analytics` | ADMIN \| BOOKING_MGR | Booking analytics |
| POST   | `/api/admin/bookings/{id}/approve` | ADMIN \| BOOKING_MGR | Approve a booking |
| POST   | `/api/admin/bookings/{id}/reject` | ADMIN \| BOOKING_MGR | Reject a booking |
| POST   | `/api/admin/bookings/{id}/cancel` | ADMIN \| BOOKING_MGR | Cancel an approved booking |
| POST   | `/api/admin/bookings/{bookingId}/mark-no-show` | ADMIN \| BOOKING_MGR | Mark booking as no-show |
| POST   | `/api/admin/bookings/{bookingId}/complete` | ADMIN \| BOOKING_MGR | Mark booking as completed |

**Analytics query params**

| Param | Type | Description |
|-------|------|-------------|
| `from` | ISO datetime | Range start |
| `to` | ISO datetime | Range end |
| `bucket` | enum | `DAY`, `WEEK`, `MONTH` |
| `category` | enum | Resource category filter |
| `resourceId` | UUID | Filter by specific resource |

---

### Admin — Booking Modifications `/api/admin/modifications`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET  | `/api/admin/modifications/pending` | ADMIN \| BOOKING_MGR | List pending modification requests |
| POST | `/api/admin/modifications/{modificationId}/approve` | ADMIN \| BOOKING_MGR | Approve a modification |
| POST | `/api/admin/modifications/{modificationId}/reject` | ADMIN \| BOOKING_MGR | Reject a modification |

---

### Admin — Recurring Bookings `/api/admin/recurring-bookings`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/admin/recurring-bookings/{id}/approve-pending` | ADMIN \| BOOKING_MGR | Approve pending occurrences |
| POST | `/api/admin/recurring-bookings/{id}/cancel-future` | ADMIN \| BOOKING_MGR | Cancel future occurrences |

---

### Admin — Notifications `/api/admin/notifications`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/admin/notifications/deliveries` | ADMIN | List email delivery attempts |

**Query params**

| Param | Type | Description |
|-------|------|-------------|
| `status` | enum | Delivery status filter |
| `limit` | int | Max results |

---

### Admin — Audit Logs `/api/admin/audit-logs`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/admin/audit-logs` | ADMIN | Paginated audit log |
| GET | `/api/admin/audit-logs/user/{userId}` | ADMIN | Audit log filtered by target user |

**Query params for `GET /api/admin/audit-logs`**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `action` | enum | — | Filter by admin action type |
| `performedById` | UUID | — | Filter by actor |
| `from` | ISO datetime | — | Range start |
| `to` | ISO datetime | — | Range end |
| `page` | int | 0 | Page number |
| `size` | int | 20 (max 100) | Page size |

---

## Frontend Routes

| Path | Role | Screen |
|------|------|--------|
| `/` | PUBLIC | Marketing landing page |
| `/about` | PUBLIC | About page |
| `/features` | PUBLIC | Features page |
| `/contact` | PUBLIC | Contact page |
| `/login` | PUBLIC | Login (magic-link / password) |
| `/auth/callback` | PUBLIC | Supabase auth callback handler |
| `/auth/welcome` | PUBLIC | Post-invite welcome page |
| `/portal` | AUTH | Role selector hub |
| `/account/security` | AUTH | Account security settings |
| `/student/onboarding` | STUDENT | Onboarding wizard |
| `/book/resource/[id]` | AUTH | Quick-book a specific resource |
| **Students** | | |
| `/students` | STUDENT | Student dashboard |
| `/students/bookings` | STUDENT | My bookings |
| `/students/tickets` | STUDENT | My tickets |
| `/students/tickets/[id]` | STUDENT | Ticket detail |
| **Faculty** | | |
| `/faculty` | FACULTY | Faculty dashboard |
| `/faculty/bookings` | FACULTY | Faculty bookings |
| **Admin** | | |
| `/admin` | ADMIN | Admin dashboard |
| `/admin/users` | ADMIN | All users |
| `/admin/students` | ADMIN | Students list |
| `/admin/students/[id]` | ADMIN | Student detail |
| `/admin/admins` | ADMIN | Admins list |
| `/admin/managers` | ADMIN | Managers list |
| `/admin/faculty` | ADMIN | Faculty list |
| `/admin/buildings` | ADMIN | Buildings management |
| `/admin/resources` | ADMIN | Resources management |
| `/admin/resources/[id]` | ADMIN | Resource detail |
| `/admin/bookings` | ADMIN | All bookings |
| `/admin/tickets` | ADMIN | All tickets |
| `/admin/tickets/[id]` | ADMIN | Ticket detail |
| `/admin/analytics` | ADMIN | Analytics dashboard |
| `/admin/audit-log` | ADMIN | Audit log |
| `/admin/notifications` | ADMIN | Notification delivery log |
| `/admin/reports` | ADMIN | Reports |
| **Booking Manager** | | |
| `/booking-managers` | BOOKING_MGR | Booking manager dashboard |
| `/booking-managers/bookings` | BOOKING_MGR | Manage bookings |
| `/booking-managers/tickets` | BOOKING_MGR | Manage tickets |
| `/booking-managers/tickets/[id]` | BOOKING_MGR | Ticket detail |
| **Catalog Manager** | | |
| `/catalog-managers` | CATALOG_MGR | Catalog manager dashboard |
| `/catalog-managers/catalog` | CATALOG_MGR | Catalog management |
| `/managers/catalog` | CATALOG_MGR | Catalog overview |
| `/managers/catalog/buildings` | CATALOG_MGR | Buildings |
| `/managers/catalog/dashboard` | CATALOG_MGR | Catalog dashboard |
| `/managers/catalog/resources/[id]` | CATALOG_MGR | Resource detail |
| **Ticket Manager** | | |
| `/ticket-managers` | TICKET_MGR | Ticket manager dashboard |
| `/ticket-managers/tickets` | TICKET_MGR | All tickets |
| `/ticket-managers/tickets/[id]` | TICKET_MGR | Ticket detail |
| `/ticket-managers/reported` | TICKET_MGR | Reported issues |
| `/ticket-managers/reported/[id]` | TICKET_MGR | Reported issue detail |
| `/ticket-managers/completed` | TICKET_MGR | Completed tickets |
| `/ticket-managers/analytics` | TICKET_MGR | Ticket analytics |

---

## Getting Started

### Prerequisites

- **Docker Desktop** (required to run the entire stack)
- **VS Code** + **Extension Pack for Java** (recommended for backend development)

### Clone and Setup

```bash
git clone https://github.com/SYNCODE-SLIIT/it3030-paf-2026-smart-campus-groupXX.git
cd it3030-paf-2026-smart-campus-groupXX
```

### Running the System

```bash
# Start frontend, backend, and local postgres
docker compose up --build
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8080/api/health |
| PostgreSQL | localhost:5432 |

```bash
# Stop the stack
docker compose down
```

### Hot-Reloading

- **Backend**: Restart the backend container after Java changes.
- **Frontend**: Next.js dev mode hot-reloads on `.tsx` file save.

---

## Database & Environment Setup

### Local Docker (default)

`docker compose up --build` starts a local Postgres container and wires the backend automatically:

```dotenv
SPRING_DATASOURCE_URL=jdbc:postgresql://postgres:5432/smartcampus
SPRING_DATASOURCE_USERNAME=smartcampus
SPRING_DATASOURCE_PASSWORD=smartcampus
```

### Supabase (hosted)

Create a root `.env` file with Supabase session-pooler values from the Supabase "Connect" panel:

```dotenv
SPRING_DATASOURCE_URL=jdbc:postgresql://aws-0-<region>.pooler.supabase.com:5432/postgres?sslmode=require
SPRING_DATASOURCE_USERNAME=postgres.<project-ref>
SPRING_DATASOURCE_PASSWORD='<your-db-password>'
```

Frontend-only Supabase values go in `frontend/.env.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

Do not put the database `DATABASE_URL` in `frontend/.env.local`. Database access belongs to the Spring Boot backend.

---

## Supabase Auth & Core Staff Bootstrap

### 1) Configure Supabase Custom SMTP

In **Supabase Dashboard → Authentication → Email → SMTP settings**:

- Sender email: `support@teamsyncode.com`
- Host: `smtp.resend.com` / Port: `465`
- Username: `resend` / Password: your Resend API key
- Min interval per user: `60` seconds

### 2) Seed Core Staff Accounts

Flyway migration `V202604211430__seed_core_staff_accounts.sql` creates these ACTIVE accounts:

| Email | Role |
|-------|------|
| `admin@teamsyncode.com` | ADMIN |
| `catalog@teamsyncode.com` | MANAGER, CATALOG_MANAGER |
| `technician@teamsyncode.com` | MANAGER, TICKET_MANAGER |
| `booking@teamsyncode.com` | MANAGER, BOOKING_MANAGER |

### 3) Provision Supabase Auth Identities

```powershell
pwsh ./backend/scripts/provision-core-staff-auth.ps1 `
  -SupabaseUrl "https://<project-ref>.supabase.co" `
  -SupabaseServiceRoleKey "<service-role-key>" `
  -InitialPassword (ConvertTo-SecureString "User@123" -AsPlainText -Force)
```

### 4) Rate Limiting (login-link endpoint)

Tune with these environment variables:

| Variable | Description |
|----------|-------------|
| `APP_AUTH_LOGIN_LINK_RATE_LIMIT_ENABLED` | Enable/disable rate limiting |
| `APP_AUTH_LOGIN_LINK_RATE_LIMIT_PER_IP_MAX_REQUESTS` | Max requests per IP |
| `APP_AUTH_LOGIN_LINK_RATE_LIMIT_PER_IP_WINDOW_SECONDS` | IP window in seconds |
| `APP_AUTH_LOGIN_LINK_RATE_LIMIT_PER_EMAIL_MAX_REQUESTS` | Max requests per email |
| `APP_AUTH_LOGIN_LINK_RATE_LIMIT_PER_EMAIL_WINDOW_SECONDS` | Email window in seconds |
| `APP_AUTH_LOGIN_LINK_RATE_LIMIT_PER_EMAIL_MIN_INTERVAL_SECONDS` | Minimum interval between emails |

---

## Assignment Compliance

- **Demonstrable Locally**: Yes (via Docker Compose)
- **Layered Architecture**: Yes (Controller → Service → Repository)
- **Persistence**: PostgreSQL via Spring Data JPA + Flyway migrations
- **Auth**: Supabase JWT with Spring Security OAuth2 resource server
- **CI/CD**: Not yet configured (no GitHub Actions workflow)
