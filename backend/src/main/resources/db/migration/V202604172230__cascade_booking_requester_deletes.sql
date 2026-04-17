alter table bookings drop constraint if exists bookings_requester_id_fkey;

alter table bookings
    add constraint bookings_requester_id_fkey
    foreign key (requester_id)
    references users(id)
    on delete cascade;
