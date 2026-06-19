-- Chat attachments: screenshots + links to schedule tasks.
alter table public.chat_messages add column if not exists image_url text;
alter table public.chat_messages add column if not exists task_ref_id uuid;
alter table public.chat_messages add column if not exists task_ref_label text;

-- Body may now be empty when an image or task link carries the content.
alter table public.chat_messages drop constraint if exists chat_messages_body_check;
alter table public.chat_messages add constraint chat_messages_body_check
  check (char_length(body) <= 4000
    and (char_length(body) >= 1 or image_url is not null or task_ref_id is not null));

-- Storage bucket for chat screenshots (public read; uploads gated by RLS).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('chat-attachments', 'chat-attachments', true, 10485760,
        array['image/png','image/jpeg','image/gif','image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Path convention: {project_id}/{uuid}.{ext} — first folder = project id.
drop policy if exists chat_attach_insert on storage.objects;
create policy chat_attach_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'chat-attachments'
    and public.is_project_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists chat_attach_select on storage.objects;
create policy chat_attach_select on storage.objects for select to authenticated
  using (
    bucket_id = 'chat-attachments'
    and public.is_project_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists chat_attach_delete on storage.objects;
create policy chat_attach_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'chat-attachments'
    and public.is_project_member(((storage.foldername(name))[1])::uuid)
  );
