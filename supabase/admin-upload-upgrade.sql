-- Run this once in the Supabase SQL editor for projects created before
-- custom admin uploads and portfolio formats were added.

alter table public.portfolio_projects
  drop constraint if exists portfolio_projects_category_check;

alter table public.portfolio_projects
  add column if not exists format text not null default 'landscape';

alter table public.portfolio_projects
  alter column video_url drop not null;

alter table public.portfolio_projects
  add column if not exists youtube_url text;

alter table public.portfolio_projects
  drop constraint if exists portfolio_projects_format_check;

alter table public.portfolio_projects
  add constraint portfolio_projects_format_check
  check (format in ('landscape', 'portrait'));

alter table public.digital_products
  add column if not exists preview_before_url text;

alter table public.digital_products
  add column if not exists preview_after_url text;

create table if not exists public.portfolio_categories (
  name text primary key,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_script_categories (
  name text primary key,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_scripts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null references public.ai_script_categories(name),
  default_business_name text not null default '',
  language text not null default 'English',
  summary text not null,
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.ai_script_categories enable row level security;
alter table public.ai_scripts enable row level security;
alter table public.ai_scripts
  add column if not exists default_business_name text not null default '';

alter table public.ai_scripts
  add column if not exists language text not null default 'English';

insert into public.portfolio_categories (name) values
  ('documentary-style'),
  ('motion-graphics'),
  ('cinematic'),
  ('ugc-ad'),
  ('ai-videos')
on conflict (name) do nothing;

insert into public.ai_script_categories (name) values
  ('Sales Scripts'),
  ('Brand Story'),
  ('UGC Ads'),
  ('Reels Hooks'),
  ('Testimonial Ads'),
  ('Voiceover Scripts'),
  ('Product Explainers'),
  ('Appointment Booking')
on conflict (name) do nothing;

insert into storage.buckets (id, name, public)
values ('portfolio', 'portfolio', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('products', 'products', true)
on conflict (id) do nothing;

drop policy if exists "Authenticated admins can manage product categories"
  on public.product_categories;

create policy "Authenticated admins can manage product categories"
  on public.product_categories for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "Public can read portfolio categories"
  on public.portfolio_categories;

create policy "Public can read portfolio categories"
  on public.portfolio_categories for select
  using (true);

drop policy if exists "Authenticated admins can manage portfolio categories"
  on public.portfolio_categories;

create policy "Authenticated admins can manage portfolio categories"
  on public.portfolio_categories for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "Public can read AI script categories"
  on public.ai_script_categories;

create policy "Public can read AI script categories"
  on public.ai_script_categories for select
  using (true);

drop policy if exists "Authenticated admins can manage AI script categories"
  on public.ai_script_categories;

create policy "Authenticated admins can manage AI script categories"
  on public.ai_script_categories for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "Public can read AI scripts"
  on public.ai_scripts;

create policy "Public can read AI scripts"
  on public.ai_scripts for select
  using (true);

drop policy if exists "Authenticated admins can manage AI scripts"
  on public.ai_scripts;

create policy "Authenticated admins can manage AI scripts"
  on public.ai_scripts for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "Authenticated admins can manage portfolio projects"
  on public.portfolio_projects;

create policy "Authenticated admins can manage portfolio projects"
  on public.portfolio_projects for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "Authenticated admins can manage digital products"
  on public.digital_products;

create policy "Authenticated admins can manage digital products"
  on public.digital_products for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "Public can read portfolio files"
  on storage.objects;

create policy "Public can read portfolio files"
  on storage.objects for select
  using (bucket_id = 'portfolio');

drop policy if exists "Public can read product files"
  on storage.objects;

create policy "Public can read product files"
  on storage.objects for select
  using (bucket_id = 'products');

drop policy if exists "Authenticated admins can upload portfolio files"
  on storage.objects;

create policy "Authenticated admins can upload portfolio files"
  on storage.objects for insert
  with check (bucket_id = 'portfolio' and auth.role() = 'authenticated');

drop policy if exists "Authenticated admins can upload product files"
  on storage.objects;

create policy "Authenticated admins can upload product files"
  on storage.objects for insert
  with check (bucket_id = 'products' and auth.role() = 'authenticated');
