-- ── Channels ──────────────────────────────────────────────────────────────────
create table if not exists public.chat_channels (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  title text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index if not exists uq_chat_channels_project
  on public.chat_channels(project_id) where project_id is not null;

create table if not exists public.chat_channel_members (
  channel_id uuid not null references public.chat_channels(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (channel_id, user_id)
);

alter table public.chat_channels enable row level security;
alter table public.chat_channel_members enable row level security;

-- Access predicate: project channels → project membership; standalone → explicit member.
create or replace function public.can_access_channel(_channel_id uuid)
 returns boolean language sql stable security definer set search_path to 'public'
as $$
  select coalesce((
    select case
      when c.project_id is not null then public.is_project_member(c.project_id)
      else exists (select 1 from public.chat_channel_members m
                   where m.channel_id = c.id and m.user_id = auth.uid())
    end
    from public.chat_channels c where c.id = _channel_id), false)
$$;

create policy chan_select on public.chat_channels for select to authenticated
  using (can_access_channel(id));
create policy chan_insert on public.chat_channels for insert to authenticated
  with check (created_by = auth.uid());
create policy chan_update on public.chat_channels for update to authenticated
  using (created_by = auth.uid()
    or (project_id is not null and can_manage_members(project_id)));

create policy chanmem_select on public.chat_channel_members for select to authenticated
  using (can_access_channel(channel_id));
-- writes to membership go through SECURITY DEFINER RPCs

-- ── Migrate chat_messages onto channels ──────────────────────────────────────
insert into public.chat_channels (project_id, title)
select p.id, p.name from public.projects p
where not exists (select 1 from public.chat_channels c where c.project_id = p.id);

alter table public.chat_messages add column if not exists channel_id uuid
  references public.chat_channels(id) on delete cascade;
update public.chat_messages m set channel_id = c.id
  from public.chat_channels c where c.project_id = m.project_id and m.channel_id is null;
alter table public.chat_messages alter column channel_id set not null;
alter table public.chat_messages alter column project_id drop not null;
create index if not exists idx_chat_messages_channel
  on public.chat_messages (channel_id, created_at);

drop policy if exists chat_select on public.chat_messages;
drop policy if exists chat_insert on public.chat_messages;
drop policy if exists chat_update on public.chat_messages;
create policy chat_select on public.chat_messages for select to authenticated
  using (can_access_channel(channel_id));
create policy chat_insert on public.chat_messages for insert to authenticated
  with check (can_access_channel(channel_id) and author_id = auth.uid());
create policy chat_update on public.chat_messages for update to authenticated
  using (
    author_id = auth.uid()
    or exists (select 1 from public.chat_channels c where c.id = channel_id
      and ((c.project_id is not null and can_manage_members(c.project_id))
           or c.created_by = auth.uid())));

-- ── Storage policies keyed by channel id (path: {channel_id}/{uuid}.ext) ──────
drop policy if exists chat_attach_insert on storage.objects;
create policy chat_attach_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'chat-attachments'
    and public.can_access_channel(((storage.foldername(name))[1])::uuid));
drop policy if exists chat_attach_select on storage.objects;
create policy chat_attach_select on storage.objects for select to authenticated
  using (bucket_id = 'chat-attachments'
    and public.can_access_channel(((storage.foldername(name))[1])::uuid));
drop policy if exists chat_attach_delete on storage.objects;
create policy chat_attach_delete on storage.objects for delete to authenticated
  using (bucket_id = 'chat-attachments'
    and public.can_access_channel(((storage.foldername(name))[1])::uuid));

-- ── RPCs ─────────────────────────────────────────────────────────────────────
create or replace function public.ensure_project_channel(_project_id uuid)
 returns uuid language plpgsql security definer set search_path to 'public'
as $$
declare _id uuid;
begin
  if not public.is_project_member(_project_id) then raise exception 'Forbidden'; end if;
  select id into _id from public.chat_channels where project_id = _project_id;
  if _id is null then
    insert into public.chat_channels (project_id, title, created_by)
    values (_project_id, (select name from public.projects where id = _project_id), auth.uid())
    returning id into _id;
  end if;
  return _id;
end; $$;

create or replace function public.create_chat_channel(_title text, _member_emails text[] default '{}')
 returns uuid language plpgsql security definer set search_path to 'public', 'auth'
as $$
declare _id uuid; _email text; _uid uuid;
begin
  if coalesce(btrim(_title), '') = '' then raise exception 'Название чата обязательно'; end if;
  insert into public.chat_channels (project_id, title, created_by)
  values (null, btrim(_title), auth.uid()) returning id into _id;
  insert into public.chat_channel_members (channel_id, user_id) values (_id, auth.uid())
  on conflict do nothing;
  foreach _email in array coalesce(_member_emails, '{}') loop
    if btrim(_email) = '' then continue; end if;
    select u.id into _uid from auth.users u where lower(u.email) = lower(btrim(_email));
    if _uid is not null then
      insert into public.chat_channel_members (channel_id, user_id) values (_id, _uid)
      on conflict do nothing;
    end if;
  end loop;
  return _id;
end; $$;

create or replace function public.list_my_channels()
 returns table(channel_id uuid, project_id uuid, title text, is_project boolean,
               last_message_at timestamptz, member_count integer)
 language sql stable security definer set search_path to 'public'
as $$
  select c.id, c.project_id, coalesce(c.title, p.name) as title,
    (c.project_id is not null) as is_project,
    (select max(created_at) from public.chat_messages m where m.channel_id = c.id) as last_message_at,
    case when c.project_id is not null
      then (select count(*)::int from public.project_members pm where pm.project_id = c.project_id)
      else (select count(*)::int from public.chat_channel_members cm where cm.channel_id = c.id) end
  from public.chat_channels c
  left join public.projects p on p.id = c.project_id
  where (c.project_id is not null and public.is_project_member(c.project_id))
     or exists (select 1 from public.chat_channel_members cm
                where cm.channel_id = c.id and cm.user_id = auth.uid())
  order by last_message_at desc nulls last, title
$$;

create or replace function public.add_channel_member(_channel_id uuid, _email text)
 returns void language plpgsql security definer set search_path to 'public', 'auth'
as $$
declare _uid uuid;
begin
  if not public.can_access_channel(_channel_id) then raise exception 'Forbidden'; end if;
  if exists (select 1 from public.chat_channels c where c.id = _channel_id and c.project_id is not null)
    then raise exception 'Участники канала проекта управляются через роли проекта'; end if;
  select u.id into _uid from auth.users u where lower(u.email) = lower(btrim(_email));
  if _uid is null then raise exception 'Пользователь с email % не найден', _email; end if;
  insert into public.chat_channel_members (channel_id, user_id) values (_channel_id, _uid)
  on conflict do nothing;
end; $$;

create or replace function public.remove_channel_member(_channel_id uuid, _user_id uuid)
 returns void language plpgsql security definer set search_path to 'public'
as $$
begin
  if not public.can_access_channel(_channel_id) then raise exception 'Forbidden'; end if;
  delete from public.chat_channel_members where channel_id = _channel_id and user_id = _user_id;
end; $$;

create or replace function public.list_channel_members(_channel_id uuid)
 returns table(user_id uuid, email text)
 language sql stable security definer set search_path to 'public', 'auth'
as $$
  select cm.user_id, u.email::text from public.chat_channel_members cm
  join auth.users u on u.id = cm.user_id
  where cm.channel_id = _channel_id and public.can_access_channel(_channel_id)
  order by u.email
$$;
