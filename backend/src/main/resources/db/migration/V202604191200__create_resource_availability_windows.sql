create table if not exists public.resource_availability_windows (
    id uuid primary key default gen_random_uuid(),
    resource_id uuid not null,
    day_of_week varchar(10) not null,
    start_time time not null,
    end_time time not null,
    is_active boolean default true,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    constraint chk_resource_availability_windows_day_of_week check (
        day_of_week in (
            'MONDAY',
            'TUESDAY',
            'WEDNESDAY',
            'THURSDAY',
            'FRIDAY',
            'SATURDAY',
            'SUNDAY'
        )
    ),
    constraint chk_resource_availability_windows_time_range check (
        start_time < end_time
    )
);

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname = 'resource_availability_windows_resource_id_fkey'
          and connamespace = 'public'::regnamespace
    ) then
        alter table public.resource_availability_windows
            add constraint resource_availability_windows_resource_id_fkey
            foreign key (resource_id)
            references public.resources(id);
    end if;
end $$;

create index if not exists idx_resource_availability_resource_id
    on public.resource_availability_windows (resource_id);

insert into public.resource_availability_windows (
    id,
    resource_id,
    day_of_week,
    start_time,
    end_time,
    is_active,
    created_at,
    updated_at
)
select
    (
        substr(md5('resource-availability:' || resource.id::text || ':' || day_window.day_of_week || ':' || resource.available_from::text || ':' || resource.available_to::text), 1, 8) || '-' ||
        substr(md5('resource-availability:' || resource.id::text || ':' || day_window.day_of_week || ':' || resource.available_from::text || ':' || resource.available_to::text), 9, 4) || '-' ||
        substr(md5('resource-availability:' || resource.id::text || ':' || day_window.day_of_week || ':' || resource.available_from::text || ':' || resource.available_to::text), 13, 4) || '-' ||
        substr(md5('resource-availability:' || resource.id::text || ':' || day_window.day_of_week || ':' || resource.available_from::text || ':' || resource.available_to::text), 17, 4) || '-' ||
        substr(md5('resource-availability:' || resource.id::text || ':' || day_window.day_of_week || ':' || resource.available_from::text || ':' || resource.available_to::text), 21, 12)
    )::uuid,
    resource.id,
    day_window.day_of_week,
    resource.available_from,
    resource.available_to,
    true,
    now(),
    now()
from public.resources resource
cross join (
    values
        ('MONDAY'),
        ('TUESDAY'),
        ('WEDNESDAY'),
        ('THURSDAY'),
        ('FRIDAY'),
        ('SATURDAY'),
        ('SUNDAY')
) as day_window(day_of_week)
where resource.available_from is not null
  and resource.available_to is not null
on conflict do nothing;
