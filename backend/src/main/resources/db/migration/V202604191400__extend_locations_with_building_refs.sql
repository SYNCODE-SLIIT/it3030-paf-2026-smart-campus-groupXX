alter table public.locations
    add column if not exists building_id uuid,
    add column if not exists wing varchar(30);

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname = 'locations_building_id_fkey'
          and connamespace = 'public'::regnamespace
    ) then
        alter table public.locations
            add constraint locations_building_id_fkey
            foreign key (building_id)
            references public.buildings(id);
    end if;

    if not exists (
        select 1
        from pg_constraint
        where conname = 'chk_locations_wing'
          and connamespace = 'public'::regnamespace
    ) then
        alter table public.locations
            add constraint chk_locations_wing check (
                wing is null or wing in (
                    'LEFT_WING',
                    'RIGHT_WING',
                    'NONE'
                )
            );
    end if;
end $$;

create index if not exists idx_locations_building_id
    on public.locations (building_id);

create index if not exists idx_locations_wing
    on public.locations (wing);
