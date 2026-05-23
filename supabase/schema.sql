-- ==============================================
-- CHEZ LES GIROS — Schéma de base de données
-- À exécuter dans Supabase → SQL Editor
-- ==============================================

-- Table des membres de la famille
create table members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_mom boolean default false,
  created_at timestamptz default now()
);

-- Table des réponses dîner (une ligne par personne par jour)
create table dinner_responses (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references members(id) on delete cascade,
  date date not null,
  status text check (status in ('oui', 'non', 'assiette')) not null,
  arrival_time text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(member_id, date)
);

-- Table des corvées
create table chores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  assigned_to_id uuid references members(id) on delete set null,
  is_done boolean default false,
  created_at timestamptz default now()
);

-- Table de la liste de courses
create table shopping_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  added_by_id uuid references members(id) on delete set null,
  is_done boolean default false,
  created_at timestamptz default now()
);

-- ==============================================
-- Insertion des membres de la famille
-- ==============================================
insert into members (name, is_mom) values
  ('Chloé', false),
  ('Elisabeth', true),
  ('Nicolas', false),
  ('Alix', false),
  ('Oriane', false),
  ('Eléonore', false),
  ('Oscar', false);

-- ==============================================
-- Corvées de base (modifiables par la suite)
-- ==============================================
insert into chores (name) values
  ('Faire les courses'),
  ('La lessive'),
  ('Cuisiner le dîner'),
  ('Sortir les poubelles');

-- ==============================================
-- Activer le temps réel (realtime) sur toutes les tables
-- ==============================================
alter publication supabase_realtime add table dinner_responses;
alter publication supabase_realtime add table chores;
alter publication supabase_realtime add table shopping_items;

-- ==============================================
-- Politique d'accès public (Row Level Security)
-- Permet à tout le monde de lire et écrire sans login
-- ==============================================
alter table members enable row level security;
alter table dinner_responses enable row level security;
alter table chores enable row level security;
alter table shopping_items enable row level security;

create policy "Public read members" on members for select using (true);
create policy "Public read dinner" on dinner_responses for select using (true);
create policy "Public write dinner" on dinner_responses for insert with check (true);
create policy "Public update dinner" on dinner_responses for update using (true);
create policy "Public read chores" on chores for select using (true);
create policy "Public write chores" on chores for insert with check (true);
create policy "Public update chores" on chores for update using (true);
create policy "Public delete chores" on chores for delete using (true);
create policy "Public read shopping" on shopping_items for select using (true);
create policy "Public write shopping" on shopping_items for insert with check (true);
create policy "Public update shopping" on shopping_items for update using (true);
create policy "Public delete shopping" on shopping_items for delete using (true);
