create table if not exists public.ticket_assignment_history (
    id           uuid primary key,
    ticket_id    uuid not null references public.tickets(id) on delete cascade,
    old_assignee uuid references public.users(id),
    new_assignee uuid references public.users(id),
    changed_by   uuid not null references public.users(id),
    note         text,
    changed_at   timestamptz not null
);

create index if not exists idx_ticket_assignment_history_ticket_changed_at
    on public.ticket_assignment_history(ticket_id, changed_at);

create index if not exists idx_ticket_assignment_history_new_assignee_changed_at
    on public.ticket_assignment_history(new_assignee, changed_at);
