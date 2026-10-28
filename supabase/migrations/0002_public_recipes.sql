-- Recipes are readable by every signed-in user; writes stay with the owning household.

drop policy if exists "recipes: members" on public.recipes;

create policy "recipes: read all" on public.recipes
  for select to authenticated using (true);
create policy "recipes: members insert" on public.recipes
  for insert to authenticated with check (public.is_member(household_id));
create policy "recipes: members update" on public.recipes
  for update to authenticated using (public.is_member(household_id)) with check (public.is_member(household_id));
create policy "recipes: members delete" on public.recipes
  for delete to authenticated using (public.is_member(household_id));

create index if not exists recipes_created_idx on public.recipes (created_at desc);
