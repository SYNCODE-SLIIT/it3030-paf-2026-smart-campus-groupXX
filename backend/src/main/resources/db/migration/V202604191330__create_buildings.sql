create table if not exists public.buildings (
    id uuid not null default gen_random_uuid(),
    building_name varchar(150) not null,
    building_code varchar(50) not null,
    building_type varchar(50) not null,
    has_wings boolean not null default false,
    left_wing_prefix varchar(20),
    right_wing_prefix varchar(20),
    default_prefix varchar(20),
    description text,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint buildings_pkey primary key (id),
    constraint uq_buildings_building_name unique (building_name),
    constraint uq_buildings_building_code unique (building_code),
    constraint chk_buildings_building_type check (
        building_type in (
            'ACADEMIC',
            'LIBRARY',
            'ADMINISTRATIVE',
            'SPORTS',
            'OUTDOOR',
            'OTHER'
        )
    )
);

create index if not exists idx_buildings_building_code
    on public.buildings (building_code);

create index if not exists idx_buildings_building_type
    on public.buildings (building_type);

create index if not exists idx_buildings_is_active
    on public.buildings (is_active);

insert into public.buildings (
    building_name,
    building_code,
    building_type,
    has_wings,
    left_wing_prefix,
    right_wing_prefix,
    default_prefix,
    description,
    is_active
)
values
    (
        'Main Building',
        'MAIN',
        'ACADEMIC',
        true,
        'A',
        'B',
        null,
        'Primary academic building with left and right wings.',
        true
    ),
    (
        'New Building',
        'NEW',
        'ACADEMIC',
        true,
        'G',
        'F',
        null,
        'Academic building with wing-based room prefixes.',
        true
    ),
    (
        'Engineering Building',
        'ENG',
        'ACADEMIC',
        false,
        null,
        null,
        'E',
        'Engineering faculty building.',
        true
    ),
    (
        'Business Building',
        'BUS',
        'ACADEMIC',
        false,
        null,
        null,
        'BM',
        'Business school building.',
        true
    ),
    (
        'Outdoor Campus',
        'OUTDOOR',
        'OUTDOOR',
        false,
        null,
        null,
        null,
        'Pseudo-building used for outdoor spaces across campus.',
        true
    )
on conflict (building_code) do nothing;
