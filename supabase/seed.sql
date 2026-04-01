insert into public.categories (slug, name, description, category_type)
values (
  'general',
  'General',
  'Default feed for anything the broader FrikFrak crowd should see.',
  'general'
)
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  category_type = excluded.category_type,
  is_active = true;
