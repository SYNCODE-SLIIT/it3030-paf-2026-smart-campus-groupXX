update public.tickets ticket
set resource_id = null
where resource_id is not null
  and not exists (
      select 1
      from public.resources resource
      where resource.id = ticket.resource_id
  );

update public.tickets ticket
set location_id = null
where location_id is not null
  and not exists (
      select 1
      from public.locations location
      where location.id = ticket.location_id
  );

create index if not exists idx_tickets_resource_id
    on public.tickets (resource_id);

create index if not exists idx_tickets_location_id
    on public.tickets (location_id);

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname = 'tickets_resource_id_fkey'
          and connamespace = 'public'::regnamespace
    ) then
        alter table public.tickets
            add constraint tickets_resource_id_fkey
            foreign key (resource_id)
            references public.resources(id)
            on delete set null;
    end if;

    if not exists (
        select 1
        from pg_constraint
        where conname = 'tickets_location_id_fkey'
          and connamespace = 'public'::regnamespace
    ) then
        alter table public.tickets
            add constraint tickets_location_id_fkey
            foreign key (location_id)
            references public.locations(id)
            on delete set null;
    end if;
end $$;
