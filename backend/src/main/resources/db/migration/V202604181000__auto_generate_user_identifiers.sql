create table if not exists public.identifier_counters (
    counter_key varchar(120) primary key,
    last_value bigint not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint chk_identifier_counters_last_value_non_negative check (last_value >= 0)
);

with admin_candidates as (
    select
        a.user_id,
        'ADM' || lpad(cast(mod(cast(extract(year from timezone('utc', coalesce(u.invited_at, u.created_at, now()))) as integer), 100) as text), 2, '0') as prefix_year
    from public.admins a
    join public.users u on u.id = a.user_id
    where a.employee_number is null
),
admin_numbered as (
    select
        c.user_id,
        c.prefix_year,
        row_number() over (partition by c.prefix_year order by c.user_id) as seq
    from admin_candidates c
),
admin_seed as (
    select
        n.user_id,
        n.prefix_year,
        n.seq,
        coalesce((
            select max(cast(right(existing.employee_number, 6) as integer))
            from public.admins existing
            where existing.employee_number like (n.prefix_year || '%')
              and length(existing.employee_number) = length(n.prefix_year) + 6
              and translate(right(existing.employee_number, 6), '0123456789', '') = ''
        ), 0) as base
    from admin_numbered n
)
update public.admins a
set employee_number = s.prefix_year || lpad(cast((s.base + s.seq) as text), 6, '0')
from admin_seed s
where a.user_id = s.user_id;

with faculty_candidates as (
    select
        f.user_id,
        'FAC' || lpad(cast(mod(cast(extract(year from timezone('utc', coalesce(u.invited_at, u.created_at, now()))) as integer), 100) as text), 2, '0') as prefix_year
    from public.faculty f
    join public.users u on u.id = f.user_id
    where f.employee_number is null
),
faculty_numbered as (
    select
        c.user_id,
        c.prefix_year,
        row_number() over (partition by c.prefix_year order by c.user_id) as seq
    from faculty_candidates c
),
faculty_seed as (
    select
        n.user_id,
        n.prefix_year,
        n.seq,
        coalesce((
            select max(cast(right(existing.employee_number, 6) as integer))
            from public.faculty existing
            where existing.employee_number like (n.prefix_year || '%')
              and length(existing.employee_number) = length(n.prefix_year) + 6
              and translate(right(existing.employee_number, 6), '0123456789', '') = ''
        ), 0) as base
    from faculty_numbered n
)
update public.faculty f
set employee_number = s.prefix_year || lpad(cast((s.base + s.seq) as text), 6, '0')
from faculty_seed s
where f.user_id = s.user_id;

with manager_candidates as (
    select
        m.user_id,
        'MGR' || lpad(cast(mod(cast(extract(year from timezone('utc', coalesce(u.invited_at, u.created_at, now()))) as integer), 100) as text), 2, '0') as prefix_year
    from public.managers m
    join public.users u on u.id = m.user_id
    where m.employee_number is null
),
manager_numbered as (
    select
        c.user_id,
        c.prefix_year,
        row_number() over (partition by c.prefix_year order by c.user_id) as seq
    from manager_candidates c
),
manager_seed as (
    select
        n.user_id,
        n.prefix_year,
        n.seq,
        coalesce((
            select max(cast(right(existing.employee_number, 6) as integer))
            from public.managers existing
            where existing.employee_number like (n.prefix_year || '%')
              and length(existing.employee_number) = length(n.prefix_year) + 6
              and translate(right(existing.employee_number, 6), '0123456789', '') = ''
        ), 0) as base
    from manager_numbered n
)
update public.managers m
set employee_number = s.prefix_year || lpad(cast((s.base + s.seq) as text), 6, '0')
from manager_seed s
where m.user_id = s.user_id;

with student_candidates as (
    select
        s.user_id,
        case cast(s.program_name as text)
            when 'BSC_HONS_INFORMATION_TECHNOLOGY' then 'IT'
            when 'BSC_HONS_COMPUTER_SCIENCE' then 'IT'
            when 'BSC_HONS_COMPUTER_SYSTEMS_ENGINEERING' then 'IT'
            when 'BSC_HONS_IT_ARTIFICIAL_INTELLIGENCE' then 'IT'
            when 'BSC_HONS_IT_SOFTWARE_ENGINEERING' then 'IT'
            when 'BSC_HONS_IT_COMPUTER_SYSTEMS_NETWORK_ENGINEERING' then 'IT'
            when 'BSC_HONS_IT_INFORMATION_SYSTEMS_ENGINEERING' then 'IT'
            when 'BSC_HONS_IT_CYBER_SECURITY' then 'IT'
            when 'BSC_HONS_IT_INTERACTIVE_MEDIA' then 'IT'
            when 'BSC_HONS_IT_DATA_SCIENCE' then 'IT'

            when 'BSC_ENG_HONS_CIVIL_ENGINEERING' then 'EN'
            when 'BSC_ENG_HONS_ELECTRICAL_ELECTRONIC_ENGINEERING' then 'EN'
            when 'BSC_ENG_HONS_MECHANICAL_ENGINEERING' then 'EN'
            when 'BSC_ENG_HONS_MECHANICAL_ENGINEERING_MECHATRONICS' then 'EN'
            when 'BSC_ENG_HONS_MATERIALS_ENGINEERING' then 'EN'

            when 'BBA_HONS_ACCOUNTING_FINANCE' then 'BM'
            when 'BBA_HONS_BUSINESS_ANALYTICS' then 'BM'
            when 'BBA_HONS_HUMAN_CAPITAL_MANAGEMENT' then 'BM'
            when 'BBA_HONS_MARKETING_MANAGEMENT' then 'BM'
            when 'BBA_HONS_LOGISTICS_SUPPLY_CHAIN_MANAGEMENT' then 'BM'
            when 'BBA_HONS_BUSINESS_MANAGEMENT' then 'BM'
            when 'BBA_HONS_MANAGEMENT_INFORMATION_SYSTEMS' then 'BM'
            when 'BBA_HONS_QUALITY_MANAGEMENT' then 'BM'

            when 'BSC_HONS_FINANCIAL_MATHS_APPLIED_STATISTICS' then 'SH'
            when 'BSC_HONS_BIOTECHNOLOGY' then 'SH'
            when 'BA_HONS_ENGLISH_STUDIES' then 'SH'
            when 'BSC_HONS_NURSING' then 'NU'
            when 'BSC_HONS_PSYCHOLOGY' then 'PS'
            when 'BED_HONS_SCIENCES_ENGLISH_SOCIAL_SCIENCES_IT' then 'ED'

            when 'BSC_HONS_ARCHITECTURE' then 'AR'
            when 'MSC_ARCHITECTURE' then 'AR'
            when 'BA_HONS_INTERIOR_DESIGN' then 'ID'

            when 'ADVANCED_DIPLOMA_HOSPITALITY_MANAGEMENT' then 'WA'
            when 'ADVANCED_DIPLOMA_TRAVEL_TOURISM_MANAGEMENT' then 'WA'
            when 'DIPLOMA_EVENT_MANAGEMENT' then 'WA'
            when 'CERTIFICATE_IV_PATISSERIE' then 'WA'
            when 'COMMERCIAL_COOKERY' then 'WA'

            when 'POSTGRADUATE_DIPLOMA_EDUCATION' then 'PG'
            when 'MASTER_OF_EDUCATION' then 'MS'
            when 'MASTER_BUSINESS_ADMINISTRATION' then 'MS'
            when 'MSC_INFORMATION_TECHNOLOGY' then 'MS'
            when 'MSC_INFORMATION_MANAGEMENT' then 'MS'
            when 'MSC_INFORMATION_SYSTEMS' then 'MS'
            when 'MSC_NETWORK_ENGINEERING' then 'MS'
            when 'MSC_ARTIFICIAL_INTELLIGENCE' then 'MS'
            else null
        end as prefix,
        cast(extract(year from timezone('utc', now())) as integer)
            - case cast(s.academic_year as text)
                when 'YEAR_1' then 0
                when 'YEAR_2' then 1
                when 'YEAR_3' then 2
                when 'YEAR_4' then 3
                else 0
              end as intake_year
    from public.students s
    where s.registration_number is null
      and s.program_name is not null
      and s.academic_year is not null
),
student_numbered as (
    select
        c.user_id,
        c.prefix || lpad(cast(mod(c.intake_year, 100) as text), 2, '0') as prefix_year,
        row_number() over (partition by c.prefix, c.intake_year order by c.user_id) as seq
    from student_candidates c
    where c.prefix is not null
),
student_seed as (
    select
        n.user_id,
        n.prefix_year,
        n.seq,
        coalesce((
            select max(cast(right(existing.registration_number, 6) as integer))
            from public.students existing
            where existing.registration_number like (n.prefix_year || '%')
              and length(existing.registration_number) = length(n.prefix_year) + 6
              and translate(right(existing.registration_number, 6), '0123456789', '') = ''
        ), 0) as base
    from student_numbered n
)
update public.students s
set registration_number = seed.prefix_year || lpad(cast((seed.base + seed.seq) as text), 6, '0')
from student_seed seed
where s.user_id = seed.user_id;

create unique index if not exists uq_admins_employee_number
    on public.admins (employee_number)
    where employee_number is not null;

create unique index if not exists uq_faculty_employee_number
    on public.faculty (employee_number)
    where employee_number is not null;

create unique index if not exists uq_managers_employee_number
    on public.managers (employee_number)
    where employee_number is not null;

create unique index if not exists uq_students_registration_number
    on public.students (registration_number)
    where registration_number is not null;

create or replace function public.prevent_employee_number_change()
returns trigger
language plpgsql
as $$
begin
    if old.employee_number is not null and new.employee_number is distinct from old.employee_number then
        raise exception 'employee_number is immutable once assigned';
    end if;
    return new;
end;
$$;

create or replace function public.prevent_registration_number_change()
returns trigger
language plpgsql
as $$
begin
    if old.registration_number is not null and new.registration_number is distinct from old.registration_number then
        raise exception 'registration_number is immutable once assigned';
    end if;
    return new;
end;
$$;

drop trigger if exists trg_admins_employee_number_immutable on public.admins;
create trigger trg_admins_employee_number_immutable
before update of employee_number on public.admins
for each row
execute function public.prevent_employee_number_change();

drop trigger if exists trg_faculty_employee_number_immutable on public.faculty;
create trigger trg_faculty_employee_number_immutable
before update of employee_number on public.faculty
for each row
execute function public.prevent_employee_number_change();

drop trigger if exists trg_managers_employee_number_immutable on public.managers;
create trigger trg_managers_employee_number_immutable
before update of employee_number on public.managers
for each row
execute function public.prevent_employee_number_change();

drop trigger if exists trg_students_registration_number_immutable on public.students;
create trigger trg_students_registration_number_immutable
before update of registration_number on public.students
for each row
execute function public.prevent_registration_number_change();
