do $$
declare
    fk record;
begin
    for fk in
        select rel.relname as table_name, con.conname as constraint_name
        from pg_constraint con
        join pg_class rel on rel.oid = con.conrelid
        join pg_namespace nsp on nsp.oid = rel.relnamespace
        where nsp.nspname = 'public'
          and con.contype = 'f'
          and (
                (rel.relname = 'tickets' and pg_get_constraintdef(con.oid) ~* '^FOREIGN KEY \(reported_by\) REFERENCES (public\.)?users\(id\)')
             or (rel.relname = 'tickets' and pg_get_constraintdef(con.oid) ~* '^FOREIGN KEY \(assigned_to\) REFERENCES (public\.)?users\(id\)')
             or (rel.relname = 'ticket_comments' and pg_get_constraintdef(con.oid) ~* '^FOREIGN KEY \(user_id\) REFERENCES (public\.)?users\(id\)')
             or (rel.relname = 'ticket_status_history' and pg_get_constraintdef(con.oid) ~* '^FOREIGN KEY \(changed_by\) REFERENCES (public\.)?users\(id\)')
          )
    loop
        execute format('alter table public.%I drop constraint %I', fk.table_name, fk.constraint_name);
    end loop;
end $$;

do $$
begin
    if exists (
        select 1 from information_schema.tables
        where table_schema = 'public' and table_name = 'tickets'
    ) then
        alter table public.tickets
            add constraint tickets_reported_by_fkey
            foreign key (reported_by)
            references public.users(id)
            on delete cascade;

        alter table public.tickets
            add constraint tickets_assigned_to_fkey
            foreign key (assigned_to)
            references public.users(id)
            on delete set null;
    end if;

    if exists (
        select 1 from information_schema.tables
        where table_schema = 'public' and table_name = 'ticket_comments'
    ) then
        alter table public.ticket_comments
            add constraint ticket_comments_user_id_fkey
            foreign key (user_id)
            references public.users(id)
            on delete cascade;
    end if;

    if exists (
        select 1 from information_schema.tables
        where table_schema = 'public' and table_name = 'ticket_status_history'
    ) then
        alter table public.ticket_status_history
            add constraint ticket_status_history_changed_by_fkey
            foreign key (changed_by)
            references public.users(id)
            on delete cascade;
    end if;
end $$;
