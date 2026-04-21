insert into public.resource_types (
    code,
    name,
    category,
    description,
    is_bookable_default,
    is_movable_default
)
values
    (
        'GENERAL_RESOURCE',
        'General Resource',
        'GENERAL_UTILITY',
        'Default fallback resource type for existing catalogue entries.',
        false,
        false
    ),
    (
        'LECTURE_HALL',
        'Lecture Hall',
        'SPACES',
        'Lecture halls and teaching spaces intended for scheduled academic use.',
        true,
        false
    ),
    (
        'LAB',
        'Lab',
        'SPACES',
        'Laboratories and practical learning spaces.',
        true,
        false
    ),
    (
        'LIBRARY_ROOM',
        'Library Room',
        'SPACES',
        'Library rooms, study rooms, and reservable library spaces.',
        true,
        false
    ),
    (
        'TECH_EQUIPMENT',
        'Technical Equipment',
        'TECHNICAL_EQUIPMENT',
        'Technical equipment such as devices, AV kits, and computing accessories.',
        true,
        true
    ),
    (
        'CLEANING_EQUIPMENT',
        'Cleaning Equipment',
        'MAINTENANCE_AND_CLEANING',
        'Cleaning and janitorial equipment used for campus operations.',
        false,
        true
    ),
    (
        'SPORTS_EQUIPMENT',
        'Sports Equipment',
        'SPORTS',
        'Sports gear and related athletic equipment.',
        true,
        true
    ),
    (
        'EVENT_EQUIPMENT',
        'Event Equipment',
        'EVENT_AND_DECORATION',
        'Equipment and setup assets used for events and decorations.',
        true,
        true
    )
on conflict do nothing;

update public.resources resource
set resource_type_id = resource_type.id
from public.resource_types resource_type
where resource.resource_type_id is null
  and resource_type.code = 'GENERAL_RESOURCE';
