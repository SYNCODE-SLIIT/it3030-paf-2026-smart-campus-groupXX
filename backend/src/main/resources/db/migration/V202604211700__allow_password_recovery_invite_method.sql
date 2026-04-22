alter table users
    drop constraint if exists chk_users_last_invite_method;

alter table users
    add constraint chk_users_last_invite_method check (
        last_invite_method is null
        or last_invite_method in ('INVITE_EMAIL', 'LOGIN_LINK_EMAIL', 'PASSWORD_RECOVERY_EMAIL')
    );
