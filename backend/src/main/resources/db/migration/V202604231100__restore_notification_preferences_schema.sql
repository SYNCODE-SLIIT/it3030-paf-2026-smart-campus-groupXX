do $$
begin
	if exists (
		select 1
		from information_schema.tables
		where table_schema = 'public'
		  and table_name = 'notification_preferences'
	) and exists (
		select 1
		from information_schema.columns
		where table_schema = 'public'
		  and table_name = 'notification_preferences'
		  and column_name = 'domain'
	) and not exists (
		select 1
		from information_schema.tables
		where table_schema = 'public'
		  and table_name = 'notification_preferences_domain_backup'
	) then
		alter table public.notification_preferences
			rename to notification_preferences_domain_backup;
	end if;
end $$;

do $$
begin
	if not exists (
		select 1
		from information_schema.tables
		where table_schema = 'public'
		  and table_name = 'notification_preferences'
	) and exists (
		select 1
		from information_schema.tables
		where table_schema = 'public'
		  and table_name = 'notification_preferences_legacy'
	) then
		alter table public.notification_preferences_legacy
			rename to notification_preferences;
	end if;
end $$;

create table if not exists public.notification_preferences (
	user_id uuid primary key references public.users(id) on delete cascade,
	in_app_enabled boolean not null default true,
	email_enabled boolean not null default true,
	created_at timestamptz not null,
	updated_at timestamptz not null
);

do $$
begin
	if exists (
		select 1
		from information_schema.tables
		where table_schema = 'public'
		  and table_name = 'notification_preferences_domain_backup'
	) then
		insert into public.notification_preferences (
			user_id,
			in_app_enabled,
			email_enabled,
			created_at,
			updated_at
		)
		select
			domain_preferences.user_id,
			bool_and(domain_preferences.in_app_enabled),
			bool_and(domain_preferences.email_enabled),
			min(domain_preferences.created_at),
			max(domain_preferences.updated_at)
		from public.notification_preferences_domain_backup domain_preferences
		group by domain_preferences.user_id
		on conflict (user_id) do update
		set in_app_enabled = excluded.in_app_enabled,
			email_enabled = excluded.email_enabled,
			created_at = excluded.created_at,
			updated_at = excluded.updated_at;
	end if;
end $$;

drop table if exists public.notification_preferences_domain_backup;
drop table if exists public.notification_preferences_legacy;
