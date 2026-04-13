alter table users
    alter column last_invite_reference type text;

alter table faculty
    alter column first_name drop not null,
    alter column last_name drop not null,
    alter column employee_number drop not null,
    alter column department drop not null,
    alter column designation drop not null;

alter table admins
    alter column first_name drop not null,
    alter column last_name drop not null,
    alter column employee_number drop not null,
    alter column department drop not null,
    alter column job_title drop not null;

alter table managers
    alter column first_name drop not null,
    alter column last_name drop not null,
    alter column employee_number drop not null,
    alter column department drop not null,
    alter column job_title drop not null;
