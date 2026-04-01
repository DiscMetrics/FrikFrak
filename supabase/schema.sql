create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  username_lower text not null unique,
  password_hash text not null,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  category_type text not null default 'school' check (category_type in ('general', 'school', 'tournament', 'region', 'tag')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete restrict,
  author_user_id uuid not null references public.users(id) on delete cascade,
  body text,
  score integer not null default 0,
  comment_count integer not null default 0,
  report_count integer not null default 0,
  hashtag_list text[] not null default '{}',
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  moderation_status text not null default 'active' check (moderation_status in ('active', 'removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists posts_category_created_idx on public.posts(category_id, created_at desc);
create index if not exists posts_hashtag_idx on public.posts using gin(hashtag_list);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  parent_comment_id uuid references public.comments(id) on delete set null,
  author_user_id uuid not null references public.users(id) on delete cascade,
  body text,
  score integer not null default 0,
  hashtag_list text[] not null default '{}',
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  moderation_status text not null default 'active' check (moderation_status in ('active', 'removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists comments_post_created_idx on public.comments(post_id, created_at asc);

create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  target_type text not null check (target_type in ('post', 'comment')),
  target_id uuid not null,
  vote_value smallint not null check (vote_value in (-1, 1)),
  created_at timestamptz not null default now(),
  unique (user_id, target_type, target_id)
);

create index if not exists votes_target_idx on public.votes(target_type, target_id);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_user_id uuid not null references public.users(id) on delete cascade,
  target_type text not null check (target_type in ('post', 'comment')),
  target_id uuid not null,
  reason text not null check (reason in ('harassment', 'spam', 'hate_speech', 'explicit_content', 'other')),
  status text not null default 'open' check (status in ('open', 'resolved')),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.thread_participants (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  participant_number integer not null check (participant_number > 0),
  created_at timestamptz not null default now(),
  unique (post_id, user_id),
  unique (post_id, participant_number)
);

create table if not exists public.hashtags (
  id uuid primary key default gen_random_uuid(),
  tag text not null unique,
  usage_count integer not null default 0,
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_users_updated_at on public.users;
create trigger touch_users_updated_at
before update on public.users
for each row execute procedure public.touch_updated_at();

drop trigger if exists touch_categories_updated_at on public.categories;
create trigger touch_categories_updated_at
before update on public.categories
for each row execute procedure public.touch_updated_at();

drop trigger if exists touch_posts_updated_at on public.posts;
create trigger touch_posts_updated_at
before update on public.posts
for each row execute procedure public.touch_updated_at();

drop trigger if exists touch_comments_updated_at on public.comments;
create trigger touch_comments_updated_at
before update on public.comments
for each row execute procedure public.touch_updated_at();
