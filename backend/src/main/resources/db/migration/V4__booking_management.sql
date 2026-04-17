
create table if not exists resources (
    id uuid primary key,
    code varchar(100) not null unique,
    name varchar(150) not null,
    category varchar(50) not null,
    subcategory varchar(100),
    location varchar(150),
    capacity integer,
    status varchar(20) not null,
    created_at timestamptz not null,
    updated_at timestamptz not null,
    constraint chk_resources_category check (
        category in ('ROOM', 'LAB', 'VEHICLE', 'EQUIPMENT', 'OTHER')
    ),
    constraint chk_resources_status check (
        status in ('ACTIVE', 'INACTIVE')
    )
);

create table if not exists bookings (
    id uuid primary key,
    resource_id uuid not null references resources(id),
    requester_id uuid not null references users(id),
    approved_by_id uuid references users(id) on delete set null,
    start_time timestamptz not null,
    end_time timestamptz not null,
    status varchar(20) not null,
    purpose varchar(255),
    rejection_reason varchar(500),
    cancellation_reason varchar(500),
    decided_at timestamptz,
    cancelled_at timestamptz,
    created_at timestamptz not null,
    updated_at timestamptz not null,
    constraint chk_bookings_time_range check (start_time < end_time),
    constraint chk_bookings_status check (
        status in ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')
    )
);

create index if not exists idx_bookings_requester_start_time
    on bookings (requester_id, start_time desc);

create index if not exists idx_bookings_resource_status_time
    on bookings (resource_id, status, start_time, end_time);

create index if not exists idx_resources_status
    on resources (status);


