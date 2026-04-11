drop table if exists manager_role_assignments cascade;
drop table if exists user_invites cascade;

create table if not exists users (
    id uuid primary key,
    auth_user_id uuid unique,
    email varchar(255) not null,
    user_type varchar(20) not null,
    account_status varchar(20) not null default 'INVITED',
    onboarding_completed boolean not null,
    last_login_at timestamptz,
    invited_at timestamptz not null,
    activated_at timestamptz,
    last_invite_sent_at timestamptz,
    invite_send_count integer not null default 0,
    last_invite_method varchar(30),
    last_invite_reference varchar(255),
    last_invite_redirect_uri varchar(500),
    created_at timestamptz not null,
    updated_at timestamptz not null,
    constraint chk_users_user_type check (user_type in ('STUDENT', 'FACULTY', 'ADMIN', 'MANAGER')),
    constraint chk_users_account_status check (account_status in ('INVITED', 'ACTIVE', 'SUSPENDED')),
    constraint chk_users_onboarding_completed check (user_type = 'STUDENT' or onboarding_completed = true),
    constraint chk_users_invite_send_count check (invite_send_count >= 0),
    constraint chk_users_last_invite_method check (
        last_invite_method is null or last_invite_method in ('INVITE_EMAIL', 'LOGIN_LINK_EMAIL')
    )
);

create unique index if not exists uq_users_email_lower on users (lower(email));

create table if not exists students (
    user_id uuid primary key references users(id) on delete cascade,
    first_name varchar(100),
    last_name varchar(100),
    preferred_name varchar(100),
    phone_number varchar(30),
    registration_number varchar(100),
    faculty_name varchar(150),
    program_name varchar(150),
    academic_year integer,
    semester varchar(50),
    profile_image_url varchar(500),
    email_notifications_enabled boolean,
    sms_notifications_enabled boolean,
    created_at timestamptz not null,
    updated_at timestamptz not null
);

create table if not exists faculty (
    user_id uuid primary key references users(id) on delete cascade,
    first_name varchar(100) not null,
    last_name varchar(100) not null,
    preferred_name varchar(100),
    phone_number varchar(30),
    employee_number varchar(100) not null,
    department varchar(150) not null,
    designation varchar(150) not null,
    office_location varchar(150),
    office_phone varchar(30),
    created_at timestamptz not null,
    updated_at timestamptz not null
);

create table if not exists admins (
    user_id uuid primary key references users(id) on delete cascade,
    first_name varchar(100) not null,
    last_name varchar(100) not null,
    preferred_name varchar(100),
    phone_number varchar(30),
    employee_number varchar(100) not null,
    department varchar(150) not null,
    job_title varchar(150) not null,
    office_phone varchar(30),
    created_at timestamptz not null,
    updated_at timestamptz not null
);

create table if not exists managers (
    user_id uuid primary key references users(id) on delete cascade,
    first_name varchar(100) not null,
    last_name varchar(100) not null,
    preferred_name varchar(100),
    phone_number varchar(30),
    employee_number varchar(100) not null,
    department varchar(150) not null,
    job_title varchar(150) not null,
    office_location varchar(150),
    manager_roles varchar(30)[] not null,
    created_at timestamptz not null,
    updated_at timestamptz not null,
    constraint chk_managers_roles_not_empty check (cardinality(manager_roles) >= 1),
    constraint chk_managers_roles_allowed check (
        manager_roles <@ array['CATALOG_MANAGER', 'BOOKING_MANAGER', 'TICKET_MANAGER']::varchar(30)[]
    )
);
