create table if not exists public.portfolio_projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  role text not null default 'Video edit',
  category text not null,
  year text not null default to_char(now(), 'YYYY'),
  poster_url text not null,
  video_url text,
  youtube_url text,
  format text not null default 'landscape' check (format in ('landscape', 'portrait')),
  featured boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.portfolio_projects
  drop constraint if exists portfolio_projects_category_check;

alter table public.portfolio_projects
  add column if not exists format text not null default 'landscape'
  check (format in ('landscape', 'portrait'));

alter table public.portfolio_projects
  alter column video_url drop not null;

alter table public.portfolio_projects
  add column if not exists youtube_url text;

create table if not exists public.product_categories (
  name text primary key,
  description text,
  created_at timestamptz not null default now()
);

insert into public.product_categories (name) values
  ('LUTs'),
  ('Premiere Plugins'),
  ('Soundscapes'),
  ('Presets'),
  ('Premium Text Animations'),
  ('Free Motion Graphics'),
  ('Transitions'),
  ('Editor Essentials')
on conflict (name) do nothing;

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

alter table public.ai_scripts
  add column if not exists default_business_name text not null default '';

alter table public.ai_scripts
  add column if not exists language text not null default 'English';

create table if not exists public.digital_products (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null references public.product_categories(name),
  price numeric(10, 2) not null check (price >= 0),
  cover_url text not null,
  description text not null,
  features text[] not null default '{}',
  file_url text,
  preview_before_url text,
  preview_after_url text,
  is_free boolean not null default false,
  created_at timestamptz not null default now(),
  check ((is_free and price = 0) or (not is_free and price > 0))
);

create table if not exists public.product_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  product_id uuid references public.digital_products(id) not null,
  amount numeric(10, 2) not null check (amount >= 0),
  status text not null default 'completed',
  created_at timestamptz not null default now()
);

create table if not exists public.product_downloads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  product_id uuid references public.digital_products(id) not null,
  created_at timestamptz not null default now()
);

create table if not exists public.contact_submissions (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 120),
  email text not null check (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  phone text not null check (phone ~ '^[+0-9][0-9\s-]{6,20}$'),
  message text not null check (char_length(trim(message)) between 10 and 2000),
  created_at timestamptz not null default now()
);

create table if not exists public.newsletter_subscriptions (
  id uuid primary key default gen_random_uuid(),
  email text not null check (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  created_at timestamptz not null default now()
);

alter table public.newsletter_subscriptions enable row level security;

create policy "Public can submit newsletter subscriptions"
  on public.newsletter_subscriptions for insert
  with check (true);

alter table public.contact_submissions enable row level security;

create policy "Public can submit contact messages"
  on public.contact_submissions for insert
  with check (true);

create policy "Authenticated users can read contact submissions"
  on public.contact_submissions for select
  using (auth.role() = 'authenticated');

alter table public.portfolio_projects enable row level security;
alter table public.digital_products enable row level security;

create policy "Public can read portfolio projects"
  on public.portfolio_projects for select
  using (true);

create policy "Public can read digital products"
  on public.digital_products for select
  using (true);

alter table public.product_categories enable row level security;
alter table public.portfolio_categories enable row level security;
alter table public.ai_script_categories enable row level security;
alter table public.ai_scripts enable row level security;

create policy "Public can read product categories"
  on public.product_categories for select
  using (true);

create policy "Public can read portfolio categories"
  on public.portfolio_categories for select
  using (true);

create policy "Public can read AI script categories"
  on public.ai_script_categories for select
  using (true);

create policy "Authenticated admins can manage product categories"
  on public.product_categories for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Authenticated admins can manage portfolio categories"
  on public.portfolio_categories for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Authenticated admins can manage AI script categories"
  on public.ai_script_categories for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Public can read AI scripts"
  on public.ai_scripts for select
  using (true);

create policy "Authenticated admins can manage AI scripts"
  on public.ai_scripts for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

alter table public.product_purchases enable row level security;

create policy "Authenticated users can insert purchases"
  on public.product_purchases for insert
  with check (auth.role() = 'authenticated');

create policy "Authenticated users can read their purchases"
  on public.product_purchases for select
  using (auth.role() = 'authenticated');

alter table public.product_downloads enable row level security;

create policy "Authenticated users can record downloads"
  on public.product_downloads for insert
  with check (auth.role() = 'authenticated');

create policy "Authenticated users can read their downloads"
  on public.product_downloads for select
  using (auth.role() = 'authenticated');

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
