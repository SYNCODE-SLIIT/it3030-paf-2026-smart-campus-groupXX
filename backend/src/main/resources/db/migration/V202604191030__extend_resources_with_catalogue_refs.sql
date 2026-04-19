alter table public.resources
    add column if not exists resource_type_id uuid,
    add column if not exists location_id uuid,
    add column if not exists managed_by_role varchar(50);

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname = 'resources_resource_type_id_fkey'
          and connamespace = 'public'::regnamespace
    ) then
        alter table public.resources
            add constraint resources_resource_type_id_fkey
            foreign key (resource_type_id)
            references public.resource_types(id);
    end if;

    if not exists (
        select 1
        from pg_constraint
        where conname = 'resources_location_id_fkey'
          and connamespace = 'public'::regnamespace
    ) then
        alter table public.resources
            add constraint resources_location_id_fkey
            foreign key (location_id)
            references public.locations(id);
    end if;

    if not exists (
        select 1
        from pg_constraint
        where conname = 'chk_resources_managed_by_role'
          and connamespace = 'public'::regnamespace
    ) then
        alter table public.resources
            add constraint chk_resources_managed_by_role check (
                managed_by_role is null or managed_by_role in (
                    'CATALOG_MANAGER',
                    'LIBRARY_MANAGER',
                    'TECHNICAL_MANAGER',
                    'FACILITIES_MANAGER',
                    'MAINTENANCE_MANAGER',
                    'SPORTS_MANAGER',
                    'EVENTS_MANAGER',
                    'TRANSPORT_MANAGER'
                )
            );
    end if;
end $$;

create index if not exists idx_resources_resource_type_id
    on public.resources (resource_type_id);

create index if not exists idx_resources_location_id
    on public.resources (location_id);

create index if not exists idx_resources_managed_by_role
    on public.resources (managed_by_role);
