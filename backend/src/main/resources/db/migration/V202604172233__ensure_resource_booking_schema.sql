create table if not exists public.resources (
    id uuid primary key,
    code varchar(100) not null unique,
    name varchar(255) not null,
    category varchar(40) not null,
    subcategory varchar(150),
    description text,
    location varchar(255),
    capacity integer,
    quantity integer,
    status varchar(30) not null,
    bookable boolean not null default false,
    movable boolean not null default false,
    available_from time,
    available_to time,
    created_at timestamptz not null,
    updated_at timestamptz not null
);

alter table public.resources alter column code type varchar(100);
alter table public.resources alter column name type varchar(255);
alter table public.resources alter column category type varchar(40);
alter table public.resources alter column subcategory type varchar(150);
alter table public.resources alter column location type varchar(255);
alter table public.resources alter column status type varchar(30);

alter table public.resources add column if not exists description text;
alter table public.resources add column if not exists quantity integer;
alter table public.resources add column if not exists bookable boolean;
alter table public.resources add column if not exists movable boolean;
alter table public.resources add column if not exists available_from time;
alter table public.resources add column if not exists available_to time;

update public.resources
set bookable = false
where bookable is null;

update public.resources
set movable = false
where movable is null;

alter table public.resources alter column bookable set default false;
alter table public.resources alter column bookable set not null;
alter table public.resources alter column movable set default false;
alter table public.resources alter column movable set not null;

alter table public.resources drop constraint if exists chk_resources_category;
alter table public.resources drop constraint if exists chk_resources_status;
alter table public.resources drop constraint if exists chk_resources_capacity_non_negative;
alter table public.resources drop constraint if exists chk_resources_quantity_non_negative;
alter table public.resources drop constraint if exists chk_resources_availability_window;

update public.resources set category = 'SPACES' where category = 'ROOM';
update public.resources set category = 'TECHNICAL_EQUIPMENT' where category = 'LAB';
update public.resources set category = 'TRANSPORT_AND_LOGISTICS' where category = 'VEHICLE';
update public.resources set category = 'TECHNICAL_EQUIPMENT' where category = 'EQUIPMENT';
update public.resources set category = 'GENERAL_UTILITY' where category = 'OTHER';

alter table public.resources add constraint chk_resources_category check (
    category in (
        'SPACES',
        'TECHNICAL_EQUIPMENT',
        'MAINTENANCE_AND_CLEANING',
        'SPORTS',
        'EVENT_AND_DECORATION',
        'GENERAL_UTILITY',
        'TRANSPORT_AND_LOGISTICS'
    )
);

alter table public.resources add constraint chk_resources_status check (
    status in ('ACTIVE', 'OUT_OF_SERVICE', 'MAINTENANCE', 'INACTIVE')
);

alter table public.resources add constraint chk_resources_capacity_non_negative check (
    capacity is null or capacity >= 0
);

alter table public.resources add constraint chk_resources_quantity_non_negative check (
    quantity is null or quantity >= 0
);

alter table public.resources add constraint chk_resources_availability_window check (
    available_from is null or available_to is null or available_from < available_to
);

create table if not exists public.bookings (
    id uuid primary key,
    resource_id uuid not null references public.resources(id),
    requester_id uuid not null references public.users(id) on delete cascade,
    approved_by_id uuid references public.users(id) on delete set null,
    start_time timestamptz not null,
    end_time timestamptz not null,
    status varchar(20) not null,
    purpose varchar(255),
    rejection_reason varchar(500),
    cancellation_reason varchar(500),
    decided_at timestamptz,
    cancelled_at timestamptz,
    created_at timestamptz not null,
    updated_at timestamptz not null
);

alter table public.bookings add column if not exists approved_by_id uuid;
alter table public.bookings add column if not exists cancellation_reason varchar(500);
alter table public.bookings add column if not exists decided_at timestamptz;
alter table public.bookings add column if not exists cancelled_at timestamptz;

alter table public.bookings drop constraint if exists bookings_resource_id_fkey;
alter table public.bookings drop constraint if exists bookings_requester_id_fkey;
alter table public.bookings drop constraint if exists bookings_approved_by_id_fkey;
alter table public.bookings drop constraint if exists chk_bookings_time_range;
alter table public.bookings drop constraint if exists chk_bookings_status;

insert into public.resources (
    id,
    code,
    name,
    category,
    status,
    bookable,
    movable,
    created_at,
    updated_at
)
select
    orphaned.resource_id,
    left('RECOVERED-' || replace(orphaned.resource_id::text, '-', ''), 100),
    'Recovered Resource ' || left(orphaned.resource_id::text, 8),
    'GENERAL_UTILITY',
    'INACTIVE',
    false,
    false,
    now(),
    now()
from (
    select distinct resource_id
    from public.bookings
    where resource_id is not null
) orphaned
where not exists (
    select 1
    from public.resources resource
    where resource.id = orphaned.resource_id
);

alter table public.bookings
    add constraint bookings_resource_id_fkey
    foreign key (resource_id)
    references public.resources(id);

alter table public.bookings
    add constraint bookings_requester_id_fkey
    foreign key (requester_id)
    references public.users(id)
    on delete cascade;

alter table public.bookings
    add constraint bookings_approved_by_id_fkey
    foreign key (approved_by_id)
    references public.users(id)
    on delete set null;

alter table public.bookings add constraint chk_bookings_time_range check (start_time < end_time);
alter table public.bookings add constraint chk_bookings_status check (
    status in ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')
);

create index if not exists idx_bookings_requester_start_time
    on public.bookings (requester_id, start_time desc);

create index if not exists idx_bookings_resource_status_time
    on public.bookings (resource_id, status, start_time, end_time);

create index if not exists idx_resources_category on public.resources (category);
create index if not exists idx_resources_status on public.resources (status);
create index if not exists idx_resources_location on public.resources (location);
