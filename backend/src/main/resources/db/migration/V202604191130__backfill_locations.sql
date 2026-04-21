insert into public.locations (
    id,
    building_name,
    floor,
    room_code,
    location_name,
    location_type,
    description
)
select
    (
        substr(md5('location:' || resource_location.location_name), 1, 8) || '-' ||
        substr(md5('location:' || resource_location.location_name), 9, 4) || '-' ||
        substr(md5('location:' || resource_location.location_name), 13, 4) || '-' ||
        substr(md5('location:' || resource_location.location_name), 17, 4) || '-' ||
        substr(md5('location:' || resource_location.location_name), 21, 12)
    )::uuid,
    null,
    null,
    null,
    resource_location.location_name,
    'OTHER',
    null
from (
    select distinct location as location_name
    from public.resources
    where location is not null
) resource_location
on conflict do nothing;

insert into public.locations (
    id,
    building_name,
    floor,
    room_code,
    location_name,
    location_type,
    description
)
values (
    (
        substr(md5('location:UNKNOWN_LOCATION'), 1, 8) || '-' ||
        substr(md5('location:UNKNOWN_LOCATION'), 9, 4) || '-' ||
        substr(md5('location:UNKNOWN_LOCATION'), 13, 4) || '-' ||
        substr(md5('location:UNKNOWN_LOCATION'), 17, 4) || '-' ||
        substr(md5('location:UNKNOWN_LOCATION'), 21, 12)
    )::uuid,
    null,
    null,
    null,
    'UNKNOWN_LOCATION',
    'OTHER',
    null
)
on conflict do nothing;

update public.resources resource
set location_id = (
    (
        substr(md5('location:' || resource.location), 1, 8) || '-' ||
        substr(md5('location:' || resource.location), 9, 4) || '-' ||
        substr(md5('location:' || resource.location), 13, 4) || '-' ||
        substr(md5('location:' || resource.location), 17, 4) || '-' ||
        substr(md5('location:' || resource.location), 21, 12)
    )::uuid
)
where resource.location is not null
  and resource.location_id is null;

update public.resources
set location_id = (
    (
        substr(md5('location:UNKNOWN_LOCATION'), 1, 8) || '-' ||
        substr(md5('location:UNKNOWN_LOCATION'), 9, 4) || '-' ||
        substr(md5('location:UNKNOWN_LOCATION'), 13, 4) || '-' ||
        substr(md5('location:UNKNOWN_LOCATION'), 17, 4) || '-' ||
        substr(md5('location:UNKNOWN_LOCATION'), 21, 12)
    )::uuid
)
where location is null
  and location_id is null;
