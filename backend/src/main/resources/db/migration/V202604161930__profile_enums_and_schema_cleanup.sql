do $$
begin
    if not exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'user_type_enum') then
        create type public.user_type_enum as enum ('STUDENT', 'FACULTY', 'ADMIN', 'MANAGER');
    end if;

    if not exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'account_status_enum') then
        create type public.account_status_enum as enum ('INVITED', 'ACTIVE', 'SUSPENDED');
    end if;

    if not exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'manager_role_enum') then
        create type public.manager_role_enum as enum ('CATALOG_MANAGER', 'BOOKING_MANAGER', 'TICKET_MANAGER');
    end if;

    if not exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'student_faculty_enum') then
        create type public.student_faculty_enum as enum (
            'FACULTY_OF_COMPUTING',
            'FACULTY_OF_ENGINEERING',
            'SLIIT_BUSINESS_SCHOOL',
            'FACULTY_OF_HUMANITIES_AND_SCIENCES',
            'SCHOOL_OF_ARCHITECTURE',
            'WILLIAM_ANGLISS_AT_SLIIT',
            'FACULTY_OF_GRADUATE_STUDIES_AND_RESEARCH'
        );
    end if;

    if not exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'student_program_enum') then
        create type public.student_program_enum as enum (
            'BSC_HONS_INFORMATION_TECHNOLOGY',
            'BSC_HONS_COMPUTER_SCIENCE',
            'BSC_HONS_COMPUTER_SYSTEMS_ENGINEERING',
            'BSC_HONS_IT_ARTIFICIAL_INTELLIGENCE',
            'BSC_HONS_IT_SOFTWARE_ENGINEERING',
            'BSC_HONS_IT_COMPUTER_SYSTEMS_NETWORK_ENGINEERING',
            'BSC_HONS_IT_INFORMATION_SYSTEMS_ENGINEERING',
            'BSC_HONS_IT_CYBER_SECURITY',
            'BSC_HONS_IT_INTERACTIVE_MEDIA',
            'BSC_HONS_IT_DATA_SCIENCE',
            'BSC_ENG_HONS_CIVIL_ENGINEERING',
            'BSC_ENG_HONS_ELECTRICAL_ELECTRONIC_ENGINEERING',
            'BSC_ENG_HONS_MECHANICAL_ENGINEERING',
            'BSC_ENG_HONS_MECHANICAL_ENGINEERING_MECHATRONICS',
            'BSC_ENG_HONS_MATERIALS_ENGINEERING',
            'BBA_HONS_ACCOUNTING_FINANCE',
            'BBA_HONS_BUSINESS_ANALYTICS',
            'BBA_HONS_HUMAN_CAPITAL_MANAGEMENT',
            'BBA_HONS_MARKETING_MANAGEMENT',
            'BBA_HONS_LOGISTICS_SUPPLY_CHAIN_MANAGEMENT',
            'BBA_HONS_BUSINESS_MANAGEMENT',
            'BBA_HONS_MANAGEMENT_INFORMATION_SYSTEMS',
            'BBA_HONS_QUALITY_MANAGEMENT',
            'BSC_HONS_FINANCIAL_MATHS_APPLIED_STATISTICS',
            'BSC_HONS_BIOTECHNOLOGY',
            'BSC_HONS_PSYCHOLOGY',
            'BSC_HONS_NURSING',
            'BA_HONS_ENGLISH_STUDIES',
            'BED_HONS_SCIENCES_ENGLISH_SOCIAL_SCIENCES_IT',
            'BSC_HONS_ARCHITECTURE',
            'BA_HONS_INTERIOR_DESIGN',
            'MSC_ARCHITECTURE',
            'ADVANCED_DIPLOMA_HOSPITALITY_MANAGEMENT',
            'ADVANCED_DIPLOMA_TRAVEL_TOURISM_MANAGEMENT',
            'DIPLOMA_EVENT_MANAGEMENT',
            'CERTIFICATE_IV_PATISSERIE',
            'COMMERCIAL_COOKERY',
            'POSTGRADUATE_DIPLOMA_EDUCATION',
            'MASTER_OF_EDUCATION',
            'MASTER_BUSINESS_ADMINISTRATION',
            'MSC_INFORMATION_TECHNOLOGY',
            'MSC_INFORMATION_MANAGEMENT',
            'MSC_INFORMATION_SYSTEMS',
            'MSC_NETWORK_ENGINEERING',
            'MSC_ARTIFICIAL_INTELLIGENCE'
        );
    end if;

    if not exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'student_academic_year_enum') then
        create type public.student_academic_year_enum as enum ('YEAR_1', 'YEAR_2', 'YEAR_3', 'YEAR_4');
    end if;

    if not exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'student_semester_enum') then
        create type public.student_semester_enum as enum ('SEMESTER_1', 'SEMESTER_2');
    end if;
end $$;

alter table public.users
    drop constraint if exists chk_users_user_type,
    drop constraint if exists chk_users_account_status;

alter table public.users
    alter column account_status drop default;

do $$
begin
    if exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'users'
          and column_name = 'user_type'
          and udt_name <> 'user_type_enum'
    ) then
        alter table public.users
            alter column user_type type public.user_type_enum using user_type::text::public.user_type_enum;
    end if;

    if exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'users'
          and column_name = 'account_status'
          and udt_name <> 'account_status_enum'
    ) then
        alter table public.users
            alter column account_status type public.account_status_enum using account_status::text::public.account_status_enum;
    end if;
end $$;

alter table public.users
    alter column account_status set default 'INVITED'::public.account_status_enum;

alter table public.admins
    add column if not exists full_name varchar(200);

do $$
begin
    if exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'admins'
          and column_name = 'first_name'
    ) and exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'admins'
          and column_name = 'last_name'
    ) then
        execute $admin_update$
            update public.admins
            set full_name = coalesce(
                nullif(btrim(full_name), ''),
                nullif(btrim(concat_ws(' ', nullif(btrim(first_name), ''), nullif(btrim(last_name), ''))), ''),
                (select public.users.email from public.users where public.users.id = public.admins.user_id)
            )
        $admin_update$;
    else
        update public.admins
        set full_name = coalesce(
            nullif(btrim(full_name), ''),
            (select public.users.email from public.users where public.users.id = public.admins.user_id)
        );
    end if;
end $$;

alter table public.admins
    drop column if exists first_name,
    drop column if exists last_name,
    drop column if exists preferred_name,
    drop column if exists department,
    drop column if exists job_title,
    drop column if exists office_phone;

do $$
declare
    students_missing boolean;
    students_legacy boolean;
begin
    select not exists (
        select 1
        from information_schema.tables
        where table_schema = 'public'
          and table_name = 'students'
    ) into students_missing;

    select exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'students'
          and (
            (column_name = 'faculty_name' and udt_name <> 'student_faculty_enum')
            or (column_name = 'program_name' and udt_name <> 'student_program_enum')
            or (column_name = 'academic_year' and udt_name <> 'student_academic_year_enum')
            or (column_name = 'semester' and udt_name <> 'student_semester_enum')
          )
    ) into students_legacy;

    if students_missing or students_legacy then
        if not students_missing then
            drop table public.students cascade;
        end if;

        create table public.students (
            user_id uuid primary key references public.users(id) on delete cascade,
            onboarding_completed boolean not null default false,
            first_name varchar(100),
            last_name varchar(100),
            preferred_name varchar(100),
            phone_number varchar(30),
            registration_number varchar(100),
            faculty_name public.student_faculty_enum,
            program_name public.student_program_enum,
            academic_year public.student_academic_year_enum,
            semester public.student_semester_enum,
            profile_image_url varchar(500),
            email_notifications_enabled boolean,
            sms_notifications_enabled boolean,
            created_at timestamptz not null,
            updated_at timestamptz not null
        );

        insert into public.students (user_id, onboarding_completed, created_at, updated_at)
        select id, false, created_at, updated_at
        from public.users
        where user_type = 'STUDENT'::public.user_type_enum;
    end if;
end $$;

do $$
declare
    faculty_missing boolean;
    faculty_legacy boolean;
begin
    select not exists (
        select 1
        from information_schema.tables
        where table_schema = 'public'
          and table_name = 'faculty'
    ) into faculty_missing;

    select exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'faculty'
          and column_name in ('office_location', 'office_phone')
    ) into faculty_legacy;

    if faculty_missing or faculty_legacy then
        if not faculty_missing then
            drop table public.faculty cascade;
        end if;

        create table public.faculty (
            user_id uuid primary key references public.users(id) on delete cascade,
            first_name varchar(100),
            last_name varchar(100),
            preferred_name varchar(100),
            phone_number varchar(30),
            employee_number varchar(100),
            department varchar(150),
            designation varchar(150),
            created_at timestamptz not null,
            updated_at timestamptz not null
        );

        insert into public.faculty (user_id, created_at, updated_at)
        select id, created_at, updated_at
        from public.users
        where user_type = 'FACULTY'::public.user_type_enum;
    end if;
end $$;

do $$
declare
    managers_missing boolean;
    managers_legacy boolean;
begin
    select not exists (
        select 1
        from information_schema.tables
        where table_schema = 'public'
          and table_name = 'managers'
    ) into managers_missing;

    select exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'managers'
          and column_name = 'manager_roles'
    ) into managers_legacy;

    if managers_legacy then
        create temporary table tmp_single_manager_roles on commit drop as
        select
            user_id,
            manager_roles[1]::text as manager_role
        from public.managers
        where manager_roles is not null
          and cardinality(manager_roles) = 1
          and manager_roles[1]::text in ('CATALOG_MANAGER', 'BOOKING_MANAGER', 'TICKET_MANAGER');

        drop table public.managers cascade;

        create table public.managers (
            user_id uuid primary key references public.users(id) on delete cascade,
            first_name varchar(100),
            last_name varchar(100),
            preferred_name varchar(100),
            phone_number varchar(30),
            employee_number varchar(100),
            manager_role public.manager_role_enum not null,
            created_at timestamptz not null,
            updated_at timestamptz not null
        );

        insert into public.managers (user_id, manager_role, created_at, updated_at)
        select
            public.users.id,
            tmp_single_manager_roles.manager_role::public.manager_role_enum,
            public.users.created_at,
            public.users.updated_at
        from public.users
        join tmp_single_manager_roles on tmp_single_manager_roles.user_id = public.users.id
        where public.users.user_type = 'MANAGER'::public.user_type_enum;
    elsif managers_missing then
        create table public.managers (
            user_id uuid primary key references public.users(id) on delete cascade,
            first_name varchar(100),
            last_name varchar(100),
            preferred_name varchar(100),
            phone_number varchar(30),
            employee_number varchar(100),
            manager_role public.manager_role_enum not null,
            created_at timestamptz not null,
            updated_at timestamptz not null
        );
    end if;
end $$;
