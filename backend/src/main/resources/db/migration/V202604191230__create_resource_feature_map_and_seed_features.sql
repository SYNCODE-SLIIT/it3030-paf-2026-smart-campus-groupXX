create table if not exists public.resource_feature_map (
    resource_id uuid not null,
    feature_id uuid not null,
    created_at timestamptz not null default now(),
    constraint resource_feature_map_pkey primary key (resource_id, feature_id),
    constraint resource_feature_map_resource_id_fkey
        foreign key (resource_id)
        references public.resources(id)
        on delete cascade,
    constraint resource_feature_map_feature_id_fkey
        foreign key (feature_id)
        references public.resource_features(id)
        on delete cascade
);

create index if not exists idx_resource_feature_map_feature_id
    on public.resource_feature_map (feature_id);

insert into public.resource_features (
    code,
    name,
    description
)
values
    (
        'PROJECTOR',
        'Projector',
        'Display projector suitable for lectures, meetings, and presentations.'
    ),
    (
        'AIR_CONDITIONING',
        'Air Conditioning',
        'Climate control available within the room or resource space.'
    ),
    (
        'WHITEBOARD',
        'Whiteboard',
        'Writable whiteboard surface for teaching, planning, or collaboration.'
    ),
    (
        'WIFI',
        'Wi-Fi',
        'Wireless network connectivity available for users of the resource.'
    ),
    (
        'VIDEO_CONFERENCING',
        'Video Conferencing',
        'Supports video conferencing with suitable camera, display, or conferencing equipment.'
    ),
    (
        'PORTABLE',
        'Portable',
        'Can be moved and used across different locations when required.'
    ),
    (
        'POWER_SUPPLY',
        'Power Supply',
        'Provides power access or integrated electrical supply for equipment use.'
    ),
    (
        'MICROPHONE',
        'Microphone',
        'Audio input equipment available for speaking, recording, or events.'
    )
on conflict do nothing;
