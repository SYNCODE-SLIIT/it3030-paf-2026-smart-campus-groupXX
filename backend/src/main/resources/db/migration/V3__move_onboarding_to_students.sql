alter table students
    add column if not exists onboarding_completed boolean;

insert into students (
    user_id,
    onboarding_completed,
    created_at,
    updated_at
)
select
    users.id,
    coalesce(users.onboarding_completed, false),
    users.created_at,
    users.updated_at
from users
left join students on students.user_id = users.id
where users.user_type = 'STUDENT'
  and students.user_id is null;

update students
set onboarding_completed = false
where onboarding_completed is null;

update students
set onboarding_completed = users.onboarding_completed
from users
where students.user_id = users.id;

alter table students
    alter column onboarding_completed set default false,
    alter column onboarding_completed set not null;

alter table users
    drop constraint if exists chk_users_onboarding_completed;

alter table users
    drop column if exists onboarding_completed;
