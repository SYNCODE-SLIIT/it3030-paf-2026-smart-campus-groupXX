alter table if exists public.resource_types
    add column if not exists location_required boolean not null default false,
    add column if not exists capacity_enabled boolean not null default false,
    add column if not exists capacity_required boolean not null default false,
    add column if not exists quantity_enabled boolean not null default true,
    add column if not exists availability_enabled boolean not null default true,
    add column if not exists features_enabled boolean not null default false,
    add column if not exists allow_manual_bookable_override boolean not null default true,
    add column if not exists allow_manual_movable_override boolean not null default true;
