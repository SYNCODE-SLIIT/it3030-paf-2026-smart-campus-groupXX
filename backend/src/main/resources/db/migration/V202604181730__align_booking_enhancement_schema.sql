-- Align booking enhancement tables with the current JPA model.
-- This is a follow-up migration for databases that already applied V202604181600.

-- Recurring bookings
alter table if exists public.recurring_bookings
    add column if not exists requester_id uuid references public.users(id) on delete cascade,
    add column if not exists purpose varchar(255),
    add column if not exists created_at timestamptz default current_timestamp,
    add column if not exists updated_at timestamptz default current_timestamp;

update public.recurring_bookings
set requester_id = created_by
where requester_id is null
  and created_by is not null;

do $$
begin
    if exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'recurring_bookings'
          and column_name = 'start_date'
    ) then
        alter table public.recurring_bookings
            alter column start_date type timestamptz using start_date::timestamptz;
    end if;

    if exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'recurring_bookings'
          and column_name = 'end_date'
    ) then
        alter table public.recurring_bookings
            alter column end_date type timestamptz using end_date::timestamptz;
    end if;

    if exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'recurring_bookings'
          and column_name = 'created_at'
    ) then
        alter table public.recurring_bookings
            alter column created_at type timestamptz using created_at::timestamptz;
    end if;

    if exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'recurring_bookings'
          and column_name = 'updated_at'
    ) then
        alter table public.recurring_bookings
            alter column updated_at type timestamptz using updated_at::timestamptz;
    end if;

    if exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'recurring_bookings'
          and column_name = 'created_by'
    ) then
        alter table public.recurring_bookings alter column created_by drop not null;
    end if;

    if exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'recurring_bookings'
          and column_name = 'updated_by'
    ) then
        alter table public.recurring_bookings alter column updated_by drop not null;
    end if;
end $$;

create index if not exists idx_recurring_bookings_requester_id
    on public.recurring_bookings(requester_id);

-- Booking modifications
alter table if exists public.booking_modifications
    add column if not exists requested_by uuid references public.users(id) on delete cascade,
    add column if not exists decided_by_id uuid references public.users(id) on delete set null,
    add column if not exists decision_reason varchar(500),
    add column if not exists decided_at timestamptz;

update public.booking_modifications
set decided_by_id = approved_by
where decided_by_id is null
  and approved_by is not null;

update public.booking_modifications
set decided_at = approved_at::timestamptz
where decided_at is null
  and approved_at is not null;

update public.booking_modifications
set decision_reason = rejection_reason
where decision_reason is null
  and rejection_reason is not null;

do $$
begin
    if exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'booking_modifications'
          and column_name = 'requested_start_time'
    ) then
        alter table public.booking_modifications
            alter column requested_start_time type timestamptz using requested_start_time::timestamptz;
    end if;

    if exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'booking_modifications'
          and column_name = 'requested_end_time'
    ) then
        alter table public.booking_modifications
            alter column requested_end_time type timestamptz using requested_end_time::timestamptz;
    end if;

    if exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'booking_modifications'
          and column_name = 'created_at'
    ) then
        alter table public.booking_modifications
            alter column created_at type timestamptz using created_at::timestamptz;
    end if;

    if exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'booking_modifications'
          and column_name = 'updated_at'
    ) then
        alter table public.booking_modifications
            alter column updated_at type timestamptz using updated_at::timestamptz;
    end if;

    if exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'booking_modifications'
          and column_name = 'approved_at'
    ) then
        alter table public.booking_modifications
            alter column approved_at type timestamptz using approved_at::timestamptz;
    end if;

    if exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'booking_modifications'
          and column_name = 'decided_at'
    ) then
        alter table public.booking_modifications
            alter column decided_at type timestamptz using decided_at::timestamptz;
    end if;
end $$;

create index if not exists idx_booking_modifications_decided_by_id
    on public.booking_modifications(decided_by_id);

-- Booking notifications
alter table if exists public.booking_notifications
    add column if not exists updated_at timestamptz default current_timestamp,
    add column if not exists email_sent boolean not null default false,
    add column if not exists sms_sent boolean not null default false;

do $$
begin
    if exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'booking_notifications'
          and column_name = 'sent_at'
    ) then
        alter table public.booking_notifications
            alter column sent_at type timestamptz using sent_at::timestamptz;
    end if;

    if exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'booking_notifications'
          and column_name = 'read_at'
    ) then
        alter table public.booking_notifications
            alter column read_at type timestamptz using read_at::timestamptz;
    end if;

    if exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'booking_notifications'
          and column_name = 'created_at'
    ) then
        alter table public.booking_notifications
            alter column created_at type timestamptz using created_at::timestamptz;
    end if;

    if exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'booking_notifications'
          and column_name = 'updated_at'
    ) then
        alter table public.booking_notifications
            alter column updated_at type timestamptz using updated_at::timestamptz;
    end if;

    if exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'booking_notifications'
          and column_name = 'message'
    ) then
        alter table public.booking_notifications alter column message drop not null;
    end if;
end $$;

alter table if exists public.booking_notifications
    drop constraint if exists check_notification_type;

alter table public.booking_notifications
    add constraint check_notification_type check (
        notification_type in (
            'BOOKING_APPROVED',
            'BOOKING_REJECTED',
            'BOOKING_CANCELLED',
            'BOOKING_REMINDER_24H',
            'BOOKING_REMINDER_1H',
            'MODIFICATION_APPROVED',
            'MODIFICATION_REJECTED'
        )
    );

-- Bookings
do $$
begin
    if exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'bookings'
          and column_name = 'checked_in_at'
    ) then
        alter table public.bookings
            alter column checked_in_at type timestamptz using checked_in_at::timestamptz;
    end if;
end $$;

alter table if exists public.bookings
    drop constraint if exists chk_bookings_status;

alter table public.bookings
    add constraint chk_bookings_status check (
        status in (
            'PENDING',
            'APPROVED',
            'REJECTED',
            'CANCELLED',
            'CHECKED_IN',
            'COMPLETED',
            'NO_SHOW'
        )
    );
