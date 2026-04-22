create table if not exists public.notification_events (
    id uuid primary key,
    domain varchar(30) not null,
    type varchar(80) not null,
    severity varchar(30) not null,
    title varchar(180) not null,
    body text,
    actor_user_id uuid references public.users(id) on delete set null,
    dedupe_key varchar(255) unique,
    created_at timestamptz not null,
    updated_at timestamptz not null,
    constraint chk_notification_events_domain check (
        domain in ('TICKET', 'BOOKING', 'CATALOG', 'SYSTEM')
    ),
    constraint chk_notification_events_severity check (
        severity in ('INFO', 'SUCCESS', 'WARNING', 'ACTION_REQUIRED', 'CRITICAL')
    )
);

create index if not exists idx_notification_events_domain_created_at
    on public.notification_events (domain, created_at desc);

create index if not exists idx_notification_events_actor_created_at
    on public.notification_events (actor_user_id, created_at desc);

create table if not exists public.notification_recipients (
    id uuid primary key,
    event_id uuid not null references public.notification_events(id) on delete cascade,
    recipient_user_id uuid not null references public.users(id) on delete cascade,
    action_url varchar(600),
    read_at timestamptz,
    archived_at timestamptz,
    created_at timestamptz not null,
    updated_at timestamptz not null,
    constraint uq_notification_recipients_event_user unique (event_id, recipient_user_id)
);

create index if not exists idx_notification_recipients_user_created_at
    on public.notification_recipients (recipient_user_id, created_at desc);

create index if not exists idx_notification_recipients_user_unread
    on public.notification_recipients (recipient_user_id, read_at)
    where archived_at is null;

create table if not exists public.notification_event_links (
    id uuid primary key,
    event_id uuid not null references public.notification_events(id) on delete cascade,
    ticket_id uuid references public.tickets(id) on delete cascade,
    ticket_comment_id uuid references public.ticket_comments(id) on delete cascade,
    booking_id uuid references public.bookings(id) on delete cascade,
    booking_modification_id uuid references public.booking_modifications(id) on delete cascade,
    resource_id uuid references public.resources(id) on delete cascade,
    location_id uuid references public.locations(id) on delete cascade,
    building_id uuid references public.buildings(id) on delete cascade,
    resource_type_id uuid references public.resource_types(id) on delete cascade,
    user_id uuid references public.users(id) on delete cascade,
    created_at timestamptz not null,
    updated_at timestamptz not null,
    constraint chk_notification_event_links_one_target check (
        num_nonnulls(
            ticket_id,
            ticket_comment_id,
            booking_id,
            booking_modification_id,
            resource_id,
            location_id,
            building_id,
            resource_type_id,
            user_id
        ) = 1
    )
);

create index if not exists idx_notification_event_links_event
    on public.notification_event_links (event_id);

create index if not exists idx_notification_event_links_ticket
    on public.notification_event_links (ticket_id)
    where ticket_id is not null;

create index if not exists idx_notification_event_links_booking
    on public.notification_event_links (booking_id)
    where booking_id is not null;

create index if not exists idx_notification_event_links_resource
    on public.notification_event_links (resource_id)
    where resource_id is not null;

create table if not exists public.notification_preferences (
    user_id uuid primary key references public.users(id) on delete cascade,
    in_app_enabled boolean not null default true,
    email_enabled boolean not null default true,
    created_at timestamptz not null,
    updated_at timestamptz not null
);

insert into public.notification_preferences (
    user_id,
    in_app_enabled,
    email_enabled,
    created_at,
    updated_at
)
select
    users.id,
    true,
    case
        when users.user_type = 'STUDENT'::public.user_type_enum
            then coalesce(students.email_notifications_enabled, true)
        else users.account_status = 'ACTIVE'::public.account_status_enum
    end,
    now(),
    now()
from public.users
left join public.students on students.user_id = users.id
on conflict (user_id) do nothing;

create table if not exists public.notification_delivery_attempts (
    id uuid primary key,
    recipient_id uuid not null references public.notification_recipients(id) on delete cascade,
    channel varchar(20) not null,
    status varchar(20) not null,
    attempt_count integer not null default 0,
    next_attempt_at timestamptz,
    sent_at timestamptz,
    failed_at timestamptz,
    failure_reason text,
    created_at timestamptz not null,
    updated_at timestamptz not null,
    constraint chk_notification_delivery_channel check (channel in ('IN_APP', 'EMAIL')),
    constraint chk_notification_delivery_status check (status in ('PENDING', 'SENT', 'FAILED', 'SKIPPED')),
    constraint chk_notification_delivery_attempt_count check (attempt_count >= 0)
);

create index if not exists idx_notification_delivery_status_next_attempt
    on public.notification_delivery_attempts (status, next_attempt_at, created_at);

create index if not exists idx_notification_delivery_recipient
    on public.notification_delivery_attempts (recipient_id);

insert into public.notification_events (
    id,
    domain,
    type,
    severity,
    title,
    body,
    actor_user_id,
    dedupe_key,
    created_at,
    updated_at
)
select
    booking_notifications.id,
    'BOOKING',
    booking_notifications.notification_type,
    case booking_notifications.notification_type
        when 'BOOKING_APPROVED' then 'SUCCESS'
        when 'MODIFICATION_APPROVED' then 'SUCCESS'
        when 'BOOKING_REJECTED' then 'WARNING'
        when 'MODIFICATION_REJECTED' then 'WARNING'
        when 'BOOKING_CANCELLED' then 'WARNING'
        else 'INFO'
    end,
    case booking_notifications.notification_type
        when 'BOOKING_APPROVED' then 'Booking approved'
        when 'BOOKING_REJECTED' then 'Booking rejected'
        when 'BOOKING_CANCELLED' then 'Booking cancelled'
        when 'BOOKING_REMINDER_24H' then 'Booking starts in 24 hours'
        when 'BOOKING_REMINDER_1H' then 'Booking starts in 1 hour'
        when 'MODIFICATION_APPROVED' then 'Booking change approved'
        when 'MODIFICATION_REJECTED' then 'Booking change rejected'
        else 'Booking notification'
    end,
    null,
    null,
    'legacy-booking:' || booking_notifications.id::text,
    coalesce(booking_notifications.created_at, booking_notifications.sent_at, now()),
    coalesce(booking_notifications.updated_at, booking_notifications.created_at, booking_notifications.sent_at, now())
from public.booking_notifications
where exists (
    select 1
    from public.bookings
    where bookings.id = booking_notifications.booking_id
)
on conflict (id) do nothing;

insert into public.notification_recipients (
    id,
    event_id,
    recipient_user_id,
    action_url,
    read_at,
    archived_at,
    created_at,
    updated_at
)
select
    booking_notifications.id,
    booking_notifications.id,
    booking_notifications.user_id,
    case users.user_type
        when 'FACULTY'::public.user_type_enum then '/faculty/bookings'
        when 'MANAGER'::public.user_type_enum then '/booking-managers/bookings'
        when 'ADMIN'::public.user_type_enum then '/admin/bookings'
        else '/students/bookings'
    end,
    booking_notifications.read_at,
    null,
    coalesce(booking_notifications.created_at, booking_notifications.sent_at, now()),
    coalesce(booking_notifications.updated_at, booking_notifications.created_at, booking_notifications.sent_at, now())
from public.booking_notifications
join public.users on users.id = booking_notifications.user_id
where exists (
    select 1
    from public.notification_events
    where notification_events.id = booking_notifications.id
)
on conflict (id) do nothing;

insert into public.notification_event_links (
    id,
    event_id,
    booking_id,
    created_at,
    updated_at
)
select
    gen_random_uuid(),
    booking_notifications.id,
    booking_notifications.booking_id,
    coalesce(booking_notifications.created_at, booking_notifications.sent_at, now()),
    coalesce(booking_notifications.updated_at, booking_notifications.created_at, booking_notifications.sent_at, now())
from public.booking_notifications
where exists (
    select 1
    from public.notification_events
    where notification_events.id = booking_notifications.id
)
  and not exists (
    select 1
    from public.notification_event_links
    where notification_event_links.event_id = booking_notifications.id
      and notification_event_links.booking_id = booking_notifications.booking_id
);

insert into public.notification_delivery_attempts (
    id,
    recipient_id,
    channel,
    status,
    attempt_count,
    next_attempt_at,
    sent_at,
    failed_at,
    failure_reason,
    created_at,
    updated_at
)
select
    gen_random_uuid(),
    booking_notifications.id,
    'EMAIL',
    case when booking_notifications.email_sent then 'SENT' else 'SKIPPED' end,
    case when booking_notifications.email_sent then 1 else 0 end,
    null,
    case when booking_notifications.email_sent then coalesce(booking_notifications.sent_at, booking_notifications.created_at, now()) else null end,
    null,
    case when booking_notifications.email_sent then null else 'Migrated from booking_notifications without email delivery.' end,
    coalesce(booking_notifications.created_at, booking_notifications.sent_at, now()),
    coalesce(booking_notifications.updated_at, booking_notifications.created_at, booking_notifications.sent_at, now())
from public.booking_notifications
where exists (
    select 1
    from public.notification_recipients
    where notification_recipients.id = booking_notifications.id
)
  and not exists (
    select 1
    from public.notification_delivery_attempts
    where notification_delivery_attempts.recipient_id = booking_notifications.id
      and notification_delivery_attempts.channel = 'EMAIL'
);

drop function if exists public.mark_notifications_as_read(uuid[]);
drop function if exists public.get_unread_notification_count(uuid);
drop table if exists public.booking_notifications;
