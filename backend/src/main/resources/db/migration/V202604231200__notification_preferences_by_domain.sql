alter table if exists public.notification_preferences
    rename to notification_preferences_legacy;

create table if not exists public.notification_preferences (
    user_id uuid not null references public.users(id) on delete cascade,
    domain varchar(30) not null,
    in_app_enabled boolean not null default true,
    email_enabled boolean not null default true,
    created_at timestamptz not null,
    updated_at timestamptz not null,
    constraint pk_notification_preferences primary key (user_id, domain),
    constraint chk_notification_preferences_domain check (
        domain in ('TICKET', 'BOOKING', 'CATALOG', 'SYSTEM')
    )
);

insert into public.notification_preferences (
    user_id,
    domain,
    in_app_enabled,
    email_enabled,
    created_at,
    updated_at
)
select
    legacy.user_id,
    domain_values.domain,
    legacy.in_app_enabled,
    legacy.email_enabled,
    legacy.created_at,
    legacy.updated_at
from public.notification_preferences_legacy legacy
cross join (
    values ('TICKET'), ('BOOKING'), ('CATALOG'), ('SYSTEM')
) as domain_values(domain)
on conflict (user_id, domain) do nothing;

drop table if exists public.notification_preferences_legacy;
