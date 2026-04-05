alter table public.posts
  add column if not exists post_type text not null default 'text'
    check (post_type in ('text', 'link')),
  add column if not exists title text,
  add column if not exists external_url text,
  add column if not exists tag_list text[] not null default '{}';

update public.posts
set
  title = coalesce(nullif(trim(body), ''), 'Untitled post'),
  body = null,
  post_type = 'text',
  tag_list = coalesce(hashtag_list, '{}')
where title is null;

alter table public.posts
  alter column title set not null;

create index if not exists posts_tag_idx on public.posts using gin(tag_list);
