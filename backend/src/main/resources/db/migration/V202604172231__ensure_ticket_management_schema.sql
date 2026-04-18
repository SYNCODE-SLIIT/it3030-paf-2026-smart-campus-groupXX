do $$
begin
    if not exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'ticket_category_enum') then
        create type public.ticket_category_enum as enum (
            'ELECTRICAL',
            'NETWORK',
            'EQUIPMENT',
            'FURNITURE',
            'CLEANLINESS',
            'FACILITY_DAMAGE',
            'ACCESS_SECURITY',
            'OTHER'
        );
    end if;

    if not exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'ticket_priority_enum') then
        create type public.ticket_priority_enum as enum ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
    end if;

    if not exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'ticket_status_enum') then
        create type public.ticket_status_enum as enum ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REJECTED');
    end if;
end $$;

do $$
begin
    if not exists (
        select 1
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public'
          and c.relname = 'ticket_code_seq'
          and c.relkind = 'S'
    ) then
        create sequence public.ticket_code_seq start 1;
    end if;
end $$;

do $$
begin
    if not exists (
        select 1
        from information_schema.tables
        where table_schema = 'public'
          and table_name = 'tickets'
    ) then
        create table public.tickets (
            id               uuid primary key,
            ticket_code      varchar(20) unique not null,
            title            varchar(255) not null,
            description      text not null,
            category         public.ticket_category_enum not null,
            priority         public.ticket_priority_enum not null,
            status           public.ticket_status_enum not null default 'OPEN',
            reported_by      uuid not null references public.users(id),
            assigned_to      uuid references public.users(id),
            resource_id      uuid,
            location_id      uuid,
            resolution_notes text,
            rejection_reason text,
            contact_note     text,
            resolved_at      timestamptz,
            closed_at        timestamptz,
            created_at       timestamptz not null,
            updated_at       timestamptz not null
        );
    end if;
end $$;

do $$
begin
    if not exists (
        select 1
        from information_schema.tables
        where table_schema = 'public'
          and table_name = 'ticket_attachments'
    ) then
        create table public.ticket_attachments (
            id          uuid primary key,
            ticket_id   uuid not null references public.tickets(id) on delete cascade,
            file_name   varchar(255) not null,
            file_url    varchar(1000) not null,
            file_type   varchar(100) not null,
            uploaded_at timestamptz not null
        );
    end if;
end $$;

do $$
begin
    if not exists (
        select 1
        from information_schema.tables
        where table_schema = 'public'
          and table_name = 'ticket_comments'
    ) then
        create table public.ticket_comments (
            id           uuid primary key,
            ticket_id    uuid not null references public.tickets(id) on delete cascade,
            user_id      uuid not null references public.users(id),
            comment_text text not null,
            is_edited    boolean not null default false,
            created_at   timestamptz not null,
            updated_at   timestamptz not null
        );
    end if;
end $$;

do $$
begin
    if not exists (
        select 1
        from information_schema.tables
        where table_schema = 'public'
          and table_name = 'ticket_status_history'
    ) then
        create table public.ticket_status_history (
            id         uuid primary key,
            ticket_id  uuid not null references public.tickets(id) on delete cascade,
            old_status public.ticket_status_enum,
            new_status public.ticket_status_enum not null,
            changed_by uuid not null references public.users(id),
            note       text,
            changed_at timestamptz not null
        );
    end if;
end $$;
