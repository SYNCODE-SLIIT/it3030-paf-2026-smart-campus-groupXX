alter table resources alter column code type varchar(100);
alter table resources alter column name type varchar(255);
alter table resources alter column category type varchar(40);
alter table resources alter column subcategory type varchar(150);
alter table resources alter column location type varchar(255);
alter table resources alter column status type varchar(30);

alter table resources add column if not exists description text;
alter table resources add column if not exists quantity integer;
alter table resources add column if not exists bookable boolean;
alter table resources add column if not exists movable boolean;
alter table resources add column if not exists available_from time;
alter table resources add column if not exists available_to time;

update resources
set bookable = false
where bookable is null;

update resources
set movable = false
where movable is null;

alter table resources alter column bookable set default false;
alter table resources alter column bookable set not null;
alter table resources alter column movable set default false;
alter table resources alter column movable set not null;

alter table resources drop constraint if exists chk_resources_category;
alter table resources drop constraint if exists chk_resources_status;
alter table resources drop constraint if exists chk_resources_capacity_non_negative;
alter table resources drop constraint if exists chk_resources_quantity_non_negative;
alter table resources drop constraint if exists chk_resources_availability_window;

-- Migrate existing resource categories to new categories
update resources set category = 'SPACES' where category = 'ROOM';
update resources set category = 'TECHNICAL_EQUIPMENT' where category = 'LAB';
update resources set category = 'TRANSPORT_AND_LOGISTICS' where category = 'VEHICLE';
update resources set category = 'TECHNICAL_EQUIPMENT' where category = 'EQUIPMENT';
update resources set category = 'GENERAL_UTILITY' where category = 'OTHER';

alter table resources add constraint chk_resources_category check (
    category in (
        'SPACES',
        'TECHNICAL_EQUIPMENT',
        'MAINTENANCE_AND_CLEANING',
        'SPORTS',
        'EVENT_AND_DECORATION',
        'GENERAL_UTILITY',
        'TRANSPORT_AND_LOGISTICS'
    )
);

alter table resources add constraint chk_resources_status check (
    status in ('ACTIVE', 'OUT_OF_SERVICE', 'MAINTENANCE', 'INACTIVE')
);

alter table resources add constraint chk_resources_capacity_non_negative check (
    capacity is null or capacity >= 0
);

alter table resources add constraint chk_resources_quantity_non_negative check (
    quantity is null or quantity >= 0
);

alter table resources add constraint chk_resources_availability_window check (
    available_from is null or available_to is null or available_from < available_to
);

create index if not exists idx_resources_category on resources (category);
create index if not exists idx_resources_status on resources (status);
create index if not exists idx_resources_location on resources (location);