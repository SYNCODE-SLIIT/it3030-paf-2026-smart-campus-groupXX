create table if not exists public.resource_images (
    id uuid primary key default gen_random_uuid(),
    resource_id uuid not null,
    image_url text not null,
    is_primary boolean default false,
    display_order integer default 0,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname = 'resource_images_resource_id_fkey'
          and connamespace = 'public'::regnamespace
    ) then
        alter table public.resource_images
            add constraint resource_images_resource_id_fkey
            foreign key (resource_id)
            references public.resources(id)
            on delete cascade;
    end if;
end $$;

create index if not exists idx_resource_images_resource_id
    on public.resource_images (resource_id);

create unique index if not exists uq_resource_images_primary_per_resource
    on public.resource_images (resource_id)
    where is_primary = true;
