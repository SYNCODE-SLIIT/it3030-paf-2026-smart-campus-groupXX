do $$
declare
    v_user_id uuid;
    v_now timestamptz := now();
begin
    select id
      into v_user_id
      from users
     where lower(email) = lower('admin@gmail.com')
     limit 1;

    if v_user_id is null then
        v_user_id := gen_random_uuid();

        insert into users (
            id,
            auth_user_id,
            email,
            user_type,
            account_status,
            last_login_at,
            invited_at,
            activated_at,
            last_invite_sent_at,
            invite_send_count,
            last_invite_method,
            last_invite_reference,
            last_invite_redirect_uri,
            created_at,
            updated_at
        )
        values (
            v_user_id,
            null,
            'admin@gmail.com',
            'ADMIN',
            'ACTIVE',
            null,
            v_now,
            v_now,
            null,
            0,
            null,
            null,
            null,
            v_now,
            v_now
        );
    else
        update users
           set email = 'admin@gmail.com',
               user_type = 'ADMIN',
               account_status = 'ACTIVE',
               activated_at = coalesce(activated_at, v_now),
               updated_at = v_now
         where id = v_user_id;
    end if;

    insert into admins (
        user_id,
        full_name,
        phone_number,
        employee_number,
        created_at,
        updated_at
    )
    values (
        v_user_id,
        'System Admin',
        null,
        'ADM-GMAIL-001',
        v_now,
        v_now
    )
    on conflict (user_id) do update
       set full_name = excluded.full_name,
           phone_number = excluded.phone_number,
           employee_number = excluded.employee_number,
           updated_at = excluded.updated_at;
end $$;
