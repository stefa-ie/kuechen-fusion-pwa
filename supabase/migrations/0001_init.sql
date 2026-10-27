-- Küchen Fusion schema. Every shared row belongs to a household; access = household membership.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Profiles & households
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  avatar text not null default '🍳',
  color text not null default '#121212',
  active_household_id uuid,
  created_at timestamptz not null default now()
);

create or replace function public.generate_invite_code() returns text
language sql volatile as $$
  select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::int, 1), '')
  from generate_series(1, 6);
$$;

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique default public.generate_invite_code(),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.profiles
  add constraint profiles_active_household_fk
  foreign key (active_household_id) references public.households (id) on delete set null;

create table public.household_members (
  household_id uuid not null references public.households (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (household_id, profile_id)
);

create or replace function public.is_member(hid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.household_members
    where household_id = hid and profile_id = auth.uid()
  );
$$;

create or replace function public.shares_household(other uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.household_members a
    join public.household_members b on a.household_id = b.household_id
    where a.profile_id = auth.uid() and b.profile_id = other
  );
$$;

-- ---------------------------------------------------------------------------
-- Recipes, collections, cooked, notes
-- ---------------------------------------------------------------------------

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  created_by uuid references public.profiles (id) on delete set null,
  title text not null,
  description text,
  image_url text,
  author text,
  source_url text,
  linked_url text,
  source_type text not null default 'web',
  servings numeric,
  servings_label text,
  times jsonb not null default '{}'::jsonb,
  ingredients jsonb not null default '[]'::jsonb,
  steps jsonb not null default '[]'::jsonb,
  tags text[] not null default '{}',
  language text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index recipes_household_idx on public.recipes (household_id, created_at desc);

create table public.collections (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.collection_recipes (
  collection_id uuid not null references public.collections (id) on delete cascade,
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  household_id uuid not null references public.households (id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (collection_id, recipe_id)
);

create table public.recipe_cooked (
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  household_id uuid not null references public.households (id) on delete cascade,
  cooked_at timestamptz not null default now(),
  primary key (recipe_id, profile_id)
);

create table public.recipe_notes (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  profile_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  household_id uuid not null references public.households (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Grocery list (one list per household)
-- ---------------------------------------------------------------------------

create table public.grocery_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null,
  qty numeric,
  unit text,
  note text,
  category text not null default 'other',
  checked boolean not null default false,
  position double precision not null default 0,
  recipe_id uuid references public.recipes (id) on delete set null,
  recipe_title text,
  added_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index grocery_household_idx on public.grocery_items (household_id, position);

-- ---------------------------------------------------------------------------
-- Import cache (shared across all users, contains only public recipe data)
-- ---------------------------------------------------------------------------

create table public.recipe_imports (
  url_hash text primary key,
  url text not null,
  normalized jsonb not null,
  method text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.recipes enable row level security;
alter table public.collections enable row level security;
alter table public.collection_recipes enable row level security;
alter table public.recipe_cooked enable row level security;
alter table public.recipe_notes enable row level security;
alter table public.grocery_items enable row level security;
alter table public.recipe_imports enable row level security;

create policy "profiles: read self and housemates" on public.profiles
  for select to authenticated using (id = auth.uid() or public.shares_household(id));
create policy "profiles: update self" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "households: members read" on public.households
  for select to authenticated using (public.is_member(id));
create policy "households: members update" on public.households
  for update to authenticated using (public.is_member(id)) with check (public.is_member(id));

create policy "members: read own households" on public.household_members
  for select to authenticated using (public.is_member(household_id));
create policy "members: leave" on public.household_members
  for delete to authenticated using (profile_id = auth.uid());

create policy "recipes: members" on public.recipes
  for all to authenticated using (public.is_member(household_id)) with check (public.is_member(household_id));
create policy "collections: members" on public.collections
  for all to authenticated using (public.is_member(household_id)) with check (public.is_member(household_id));
create policy "collection_recipes: members" on public.collection_recipes
  for all to authenticated using (public.is_member(household_id)) with check (public.is_member(household_id));
create policy "cooked: members read" on public.recipe_cooked
  for select to authenticated using (public.is_member(household_id));
create policy "cooked: own rows" on public.recipe_cooked
  for insert to authenticated with check (profile_id = auth.uid() and public.is_member(household_id));
create policy "cooked: delete own" on public.recipe_cooked
  for delete to authenticated using (profile_id = auth.uid());
create policy "notes: private" on public.recipe_notes
  for all to authenticated using (profile_id = auth.uid())
  with check (profile_id = auth.uid() and public.is_member(household_id));
create policy "grocery: members" on public.grocery_items
  for all to authenticated using (public.is_member(household_id)) with check (public.is_member(household_id));
create policy "imports: read" on public.recipe_imports
  for select to authenticated using (true);
create policy "imports: write" on public.recipe_imports
  for insert to authenticated with check (true);

-- ---------------------------------------------------------------------------
-- New users: profile + first household + default folders
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  hid uuid;
begin
  insert into public.profiles (id) values (new.id);
  insert into public.households (name, created_by) values ('Unsere Küche', new.id) returning id into hid;
  insert into public.household_members (household_id, profile_id, role) values (hid, new.id, 'owner');
  insert into public.collections (household_id, name, created_by)
    values (hid, 'Favoriten', new.id), (hid, 'Will ich kochen', new.id);
  update public.profiles set active_household_id = hid where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------

create or replace function public.create_household(name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  hid uuid;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  insert into public.households (name, created_by) values (create_household.name, auth.uid()) returning id into hid;
  insert into public.household_members (household_id, profile_id, role) values (hid, auth.uid(), 'owner');
  insert into public.collections (household_id, name, created_by) values (hid, 'Favoriten', auth.uid());
  update public.profiles set active_household_id = hid where id = auth.uid();
  return hid;
end;
$$;

create or replace function public.join_household(code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  hid uuid;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select id into hid from public.households where invite_code = upper(trim(code));
  if hid is null then raise exception 'not_found'; end if;
  insert into public.household_members (household_id, profile_id) values (hid, auth.uid())
    on conflict do nothing;
  update public.profiles set active_household_id = hid where id = auth.uid();
  return hid;
end;
$$;

create or replace function public.leave_household(hid uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  remaining int;
  next_hid uuid;
begin
  select count(*) into remaining from public.household_members where profile_id = auth.uid();
  if remaining <= 1 then raise exception 'last_household'; end if;
  delete from public.household_members where household_id = hid and profile_id = auth.uid();
  if not exists (select 1 from public.household_members where household_id = hid) then
    delete from public.households where id = hid;
  end if;
  select household_id into next_hid from public.household_members where profile_id = auth.uid() limit 1;
  update public.profiles set active_household_id = next_hid
    where id = auth.uid() and (active_household_id = hid or active_household_id is null);
end;
$$;

create or replace function public.reorder_grocery(ids uuid[]) returns void
language sql security invoker set search_path = public as $$
  update public.grocery_items
  set position = array_position(ids, id)
  where id = any(ids);
$$;

grant execute on function public.create_household(text) to authenticated;
grant execute on function public.join_household(text) to authenticated;
grant execute on function public.leave_household(uuid) to authenticated;
grant execute on function public.reorder_grocery(uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- Storage for recipe photos imported from social media (their CDN links expire)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('recipe-images', 'recipe-images', true)
on conflict (id) do nothing;

create policy "recipe images: members upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'recipe-images' and public.is_member(((storage.foldername(name))[1])::uuid));

create policy "recipe images: members delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'recipe-images' and public.is_member(((storage.foldername(name))[1])::uuid));

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------

alter table public.grocery_items replica identity full;
alter table public.recipes replica identity full;
alter table public.collection_recipes replica identity full;
alter table public.collections replica identity full;
alter table public.recipe_cooked replica identity full;
alter table public.household_members replica identity full;

alter publication supabase_realtime add table
  public.grocery_items,
  public.recipes,
  public.collections,
  public.collection_recipes,
  public.recipe_cooked,
  public.household_members;
