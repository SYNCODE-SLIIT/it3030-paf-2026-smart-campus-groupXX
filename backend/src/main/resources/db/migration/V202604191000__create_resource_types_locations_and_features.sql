create table if not exists public.resource_types (
    id uuid not null default gen_random_uuid(),
    code varchar(50) not null,
    name varchar(100) not null,
    category varchar(50) not null,
    description text,
    is_bookable_default boolean not null default false,
    is_movable_default boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint resource_types_pkey primary key (id),
    constraint uq_resource_types_code unique (code),
    constraint uq_resource_types_name unique (name),
    constraint chk_resource_types_category check (
        category in (
            'SPACES',
            'TECHNICAL_EQUIPMENT',
            'MAINTENANCE_AND_CLEANING',
            'SPORTS',
            'EVENT_AND_DECORATION',
            'GENERAL_UTILITY',
            'TRANSPORT_AND_LOGISTICS'
        )
    )
);

create table if not exists public.locations (
    id uuid not null default gen_random_uuid(),
    building_name varchar(150),
    floor varchar(50),
    room_code varchar(50),
    location_name varchar(150) not null,
    location_type varchar(50) not null,
    description text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint locations_pkey primary key (id),
    constraint chk_locations_location_type check (
        location_type in (
            'BUILDING',
            'ROOM',
            'LAB',
            'HALL',
            'LIBRARY_SPACE',
            'EVENT_SPACE',
            'SPORTS_AREA',
            'OUTDOOR_AREA',
            'STORAGE',
            'OTHER'
        )
    )
);

create table if not exists public.resource_features (
    id uuid not null default gen_random_uuid(),
    code varchar(50) not null,
    name varchar(100) not null,
    description text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint resource_features_pkey primary key (id),
    constraint uq_resource_features_code unique (code),
    constraint uq_resource_features_name unique (name)
);

create index if not exists idx_resource_types_category
    on public.resource_types (category);

create index if not exists idx_locations_location_type
    on public.locations (location_type);

create index if not exists idx_locations_building_name
    on public.locations (building_name);

create index if not exists idx_locations_room_code
    on public.locations (room_code);

create index if not exists idx_locations_building_floor_room_code
    on public.locations (building_name, floor, room_code);
