create table if not exists public.portfolio_projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  role text not null default 'Video edit',
  category text not null check (category in ('documentary-style', 'motion-graphics', 'cinematic', 'ugc-ad', 'ai-videos')),
  year text not null default to_char(now(), 'YYYY'),
  poster_url text not null,
  video_url text not null,
  featured boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.digital_products (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null check (category in ('LUTs', 'Premiere Plugins', 'Soundscapes', 'Presets')),
  price numeric(10, 2) not null check (price > 0),
  cover_url text not null,
  description text not null,
  features text[] not null default '{}',
  file_url text,
  created_at timestamptz not null default now()
);

alter table public.portfolio_projects enable row level security;
alter table public.digital_products enable row level security;

create policy "Public can read portfolio projects"
  on public.portfolio_projects for select
  using (true);

create policy "Public can read digital products"
  on public.digital_products for select
  using (true);

create policy "Authenticated admins can manage portfolio projects"
  on public.portfolio_projects for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Authenticated admins can manage digital products"
  on public.digital_products for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

insert into storage.buckets (id, name, public)
values ('portfolio', 'portfolio', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('products', 'products', true)
on conflict (id) do nothing;

create policy "Public can read portfolio files"
  on storage.objects for select
  using (bucket_id = 'portfolio');

create policy "Public can read product files"
  on storage.objects for select
  using (bucket_id = 'products');

create policy "Authenticated admins can upload portfolio files"
  on storage.objects for insert
  with check (bucket_id = 'portfolio' and auth.role() = 'authenticated');

create policy "Authenticated admins can upload product files"
  on storage.objects for insert
  with check (bucket_id = 'products' and auth.role() = 'authenticated');
