do $$
begin
    if not exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'admin_action_enum') then
        create type public.admin_action_enum as enum (
            'USER_CREATED',
            'USER_UPDATED',
            'USER_SUSPENDED',
            'USER_ACTIVATED',
            'USER_DELETED',
            'INVITE_RESENT',
            'MANAGER_ROLE_CHANGED'
        );
    end if;
end $$;

create table if not exists public.admin_audit_logs (
    id uuid primary key,
    action public.admin_action_enum not null,
    performed_by_id uuid references public.users(id) on delete set null,
    performed_by_email varchar(255) not null,
    target_user_id uuid references public.users(id) on delete set null,
    target_user_email varchar(255) not null,
    details text,
    created_at timestamptz not null
);

create index if not exists idx_admin_audit_logs_created_at_desc
    on public.admin_audit_logs (created_at desc);

create index if not exists idx_admin_audit_logs_action_created_at_desc
    on public.admin_audit_logs (action, created_at desc);

create index if not exists idx_admin_audit_logs_performed_by_created_at_desc
    on public.admin_audit_logs (performed_by_id, created_at desc);

create index if not exists idx_admin_audit_logs_target_user_created_at_desc
    on public.admin_audit_logs (target_user_id, created_at desc);