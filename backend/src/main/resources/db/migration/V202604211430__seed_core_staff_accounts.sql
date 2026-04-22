do $$
declare
    v_now timestamptz := now();
    v_user_id uuid;
begin
    -- Core admin account
    select id
      into v_user_id
      from public.users
     where lower(email) = lower('admin@teamsyncode.com')
     limit 1;

    if v_user_id is null then
        v_user_id := gen_random_uuid();

        insert into public.users (
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
        ) values (
            v_user_id,
            null,
            'admin@teamsyncode.com',
            'ADMIN'::public.user_type_enum,
            'ACTIVE'::public.account_status_enum,
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
        update public.users
           set email = 'admin@teamsyncode.com',
               user_type = 'ADMIN'::public.user_type_enum,
               account_status = 'ACTIVE'::public.account_status_enum,
               invited_at = coalesce(invited_at, v_now),
               activated_at = coalesce(activated_at, v_now),
               last_invite_sent_at = null,
               invite_send_count = 0,
               last_invite_method = null,
               last_invite_reference = null,
               last_invite_redirect_uri = null,
               updated_at = v_now
         where id = v_user_id;
    end if;

    delete from public.students where user_id = v_user_id;
    delete from public.faculty where user_id = v_user_id;
    delete from public.managers where user_id = v_user_id;

    insert into public.admins (
        user_id,
        full_name,
        phone_number,
        employee_number,
        created_at,
        updated_at
    ) values (
        v_user_id,
        'Praveen Liyanage',
        null,
        'ADM-CORE-001',
        v_now,
        v_now
    )
    on conflict (user_id) do update
       set full_name = excluded.full_name,
           phone_number = excluded.phone_number,
           employee_number = coalesce(public.admins.employee_number, excluded.employee_number),
           updated_at = excluded.updated_at;

    -- Catalog manager account
    select id
      into v_user_id
      from public.users
     where lower(email) = lower('catalog@teamsyncode.com')
     limit 1;

    if v_user_id is null then
        v_user_id := gen_random_uuid();

        insert into public.users (
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
        ) values (
            v_user_id,
            null,
            'catalog@teamsyncode.com',
            'MANAGER'::public.user_type_enum,
            'ACTIVE'::public.account_status_enum,
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
        update public.users
           set email = 'catalog@teamsyncode.com',
               user_type = 'MANAGER'::public.user_type_enum,
               account_status = 'ACTIVE'::public.account_status_enum,
               invited_at = coalesce(invited_at, v_now),
               activated_at = coalesce(activated_at, v_now),
               last_invite_sent_at = null,
               invite_send_count = 0,
               last_invite_method = null,
               last_invite_reference = null,
               last_invite_redirect_uri = null,
               updated_at = v_now
         where id = v_user_id;
    end if;

    delete from public.students where user_id = v_user_id;
    delete from public.faculty where user_id = v_user_id;
    delete from public.admins where user_id = v_user_id;

    insert into public.managers (
        user_id,
        first_name,
        last_name,
        preferred_name,
        phone_number,
        employee_number,
        manager_role,
        created_at,
        updated_at
    ) values (
        v_user_id,
        'Vishwa',
        'Perera',
        null,
        null,
        'MGR-CORE-CAT-001',
        'CATALOG_MANAGER'::public.manager_role_enum,
        v_now,
        v_now
    )
    on conflict (user_id) do update
       set first_name = excluded.first_name,
           last_name = excluded.last_name,
           preferred_name = excluded.preferred_name,
           phone_number = excluded.phone_number,
           employee_number = coalesce(public.managers.employee_number, excluded.employee_number),
           manager_role = excluded.manager_role,
           updated_at = excluded.updated_at;

    -- Ticket manager account
    select id
      into v_user_id
      from public.users
     where lower(email) = lower('technician@teamsyncode.com')
     limit 1;

    if v_user_id is null then
        v_user_id := gen_random_uuid();

        insert into public.users (
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
        ) values (
            v_user_id,
            null,
            'technician@teamsyncode.com',
            'MANAGER'::public.user_type_enum,
            'ACTIVE'::public.account_status_enum,
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
        update public.users
           set email = 'technician@teamsyncode.com',
               user_type = 'MANAGER'::public.user_type_enum,
               account_status = 'ACTIVE'::public.account_status_enum,
               invited_at = coalesce(invited_at, v_now),
               activated_at = coalesce(activated_at, v_now),
               last_invite_sent_at = null,
               invite_send_count = 0,
               last_invite_method = null,
               last_invite_reference = null,
               last_invite_redirect_uri = null,
               updated_at = v_now
         where id = v_user_id;
    end if;

    delete from public.students where user_id = v_user_id;
    delete from public.faculty where user_id = v_user_id;
    delete from public.admins where user_id = v_user_id;

    insert into public.managers (
        user_id,
        first_name,
        last_name,
        preferred_name,
        phone_number,
        employee_number,
        manager_role,
        created_at,
        updated_at
    ) values (
        v_user_id,
        'Pasan',
        'Perera',
        null,
        null,
        'MGR-CORE-TKT-001',
        'TICKET_MANAGER'::public.manager_role_enum,
        v_now,
        v_now
    )
    on conflict (user_id) do update
       set first_name = excluded.first_name,
           last_name = excluded.last_name,
           preferred_name = excluded.preferred_name,
           phone_number = excluded.phone_number,
           employee_number = coalesce(public.managers.employee_number, excluded.employee_number),
           manager_role = excluded.manager_role,
           updated_at = excluded.updated_at;

    -- Booking manager account
    select id
      into v_user_id
      from public.users
     where lower(email) = lower('booking@teamsyncode.com')
     limit 1;

    if v_user_id is null then
        v_user_id := gen_random_uuid();

        insert into public.users (
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
        ) values (
            v_user_id,
            null,
            'booking@teamsyncode.com',
            'MANAGER'::public.user_type_enum,
            'ACTIVE'::public.account_status_enum,
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
        update public.users
           set email = 'booking@teamsyncode.com',
               user_type = 'MANAGER'::public.user_type_enum,
               account_status = 'ACTIVE'::public.account_status_enum,
               invited_at = coalesce(invited_at, v_now),
               activated_at = coalesce(activated_at, v_now),
               last_invite_sent_at = null,
               invite_send_count = 0,
               last_invite_method = null,
               last_invite_reference = null,
               last_invite_redirect_uri = null,
               updated_at = v_now
         where id = v_user_id;
    end if;

    delete from public.students where user_id = v_user_id;
    delete from public.faculty where user_id = v_user_id;
    delete from public.admins where user_id = v_user_id;

    insert into public.managers (
        user_id,
        first_name,
        last_name,
        preferred_name,
        phone_number,
        employee_number,
        manager_role,
        created_at,
        updated_at
    ) values (
        v_user_id,
        'Rahul',
        'Jayakody',
        null,
        null,
        'MGR-CORE-BKG-001',
        'BOOKING_MANAGER'::public.manager_role_enum,
        v_now,
        v_now
    )
    on conflict (user_id) do update
       set first_name = excluded.first_name,
           last_name = excluded.last_name,
           preferred_name = excluded.preferred_name,
           phone_number = excluded.phone_number,
           employee_number = coalesce(public.managers.employee_number, excluded.employee_number),
           manager_role = excluded.manager_role,
           updated_at = excluded.updated_at;
end $$;
