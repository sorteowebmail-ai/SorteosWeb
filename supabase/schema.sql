-- ============================================
-- SorteoWeb Database Schema
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- 1. PROFILES (extiende auth.users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text,
  full_name text,
  avatar_url text,
  instagram_user_id text,
  instagram_username text,
  instagram_access_token text,
  instagram_token_expires_at timestamptz,
  plan text not null default 'free' check (plan in ('free', 'pro', 'enterprise')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-crear perfil cuando se registra un usuario
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Auto-actualizar updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger on_profile_updated
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();


-- 2. GIVEAWAYS
create table public.giveaways (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  post_url text not null,
  instagram_media_id text,
  settings jsonb not null default '{}',
  total_participants int not null default 0,
  filtered_participants int not null default 0,
  status text not null default 'draft' check (status in ('draft', 'loading_comments', 'ready', 'completed')),
  payment_status text not null default 'pending' check (payment_status in ('pending', 'approved', 'free')),
  payment_id text,
  created_at timestamptz not null default now()
);


-- 3. PARTICIPANTS (cache de comentarios de Instagram)
create table public.participants (
  id uuid default gen_random_uuid() primary key,
  giveaway_id uuid references public.giveaways(id) on delete cascade not null,
  instagram_comment_id text,
  username text not null,
  comment_text text,
  profile_pic_url text,
  commented_at timestamptz,
  unique (giveaway_id, instagram_comment_id)
);

create index idx_participants_giveaway on public.participants(giveaway_id);
create index idx_participants_username on public.participants(giveaway_id, username);


-- 4. WINNERS
create table public.winners (
  id uuid default gen_random_uuid() primary key,
  giveaway_id uuid references public.giveaways(id) on delete cascade not null,
  participant_id uuid references public.participants(id) on delete cascade not null,
  position int not null,
  selected_at timestamptz not null default now()
);

create index idx_winners_giveaway on public.winners(giveaway_id);


-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.giveaways enable row level security;
alter table public.participants enable row level security;
alter table public.winners enable row level security;

-- PROFILES: users can only read/update their own profile
create policy "Users can view own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id);

-- GIVEAWAYS: users can CRUD their own giveaways
create policy "Users can view own giveaways"
  on giveaways for select
  using (auth.uid() = user_id);

create policy "Users can create giveaways"
  on giveaways for insert
  with check (auth.uid() = user_id);

create policy "Users can update own giveaways"
  on giveaways for update
  using (auth.uid() = user_id);

create policy "Users can delete own giveaways"
  on giveaways for delete
  using (auth.uid() = user_id);

-- PARTICIPANTS: access through giveaway ownership
create policy "Users can view participants of own giveaways"
  on participants for select
  using (
    exists (
      select 1 from giveaways
      where giveaways.id = participants.giveaway_id
      and giveaways.user_id = auth.uid()
    )
  );

create policy "Users can insert participants to own giveaways"
  on participants for insert
  with check (
    exists (
      select 1 from giveaways
      where giveaways.id = participants.giveaway_id
      and giveaways.user_id = auth.uid()
    )
  );

-- WINNERS: access through giveaway ownership
create policy "Users can view winners of own giveaways"
  on winners for select
  using (
    exists (
      select 1 from giveaways
      where giveaways.id = winners.giveaway_id
      and giveaways.user_id = auth.uid()
    )
  );

create policy "Users can insert winners to own giveaways"
  on winners for insert
  with check (
    exists (
      select 1 from giveaways
      where giveaways.id = winners.giveaway_id
      and giveaways.user_id = auth.uid()
    )
  );
