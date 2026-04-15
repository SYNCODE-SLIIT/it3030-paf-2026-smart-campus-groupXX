create table if not exists resources (
    id uuid primary key,
    code varchar(100) not null,
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
    updated_at timestamptz not null,
    constraint uq_resources_code unique (code),
    constraint chk_resources_category check (
        category in (
            'SPACES',
            'TECHNICAL_EQUIPMENT',
            'MAINTENANCE_AND_CLEANING',
            'SPORTS',
            'EVENT_AND_DECORATION',
            'GENERAL_UTILITY',
            'TRANSPORT_AND_LOGISTICS'
        )
    ),
    constraint chk_resources_status check (
        status in ('ACTIVE', 'OUT_OF_SERVICE', 'MAINTENANCE', 'INACTIVE')
    ),
    constraint chk_resources_capacity_non_negative check (
        capacity is null or capacity >= 0
    ),
    constraint chk_resources_quantity_non_negative check (
        quantity is null or quantity >= 0
    ),
    constraint chk_resources_availability_window check (
        available_from is null or available_to is null or available_from < available_to
    )
);

create index if not exists idx_resources_category on resources (category);
create index if not exists idx_resources_status on resources (status);
create index if not exists idx_resources_location on resources (location);
