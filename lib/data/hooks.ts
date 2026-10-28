"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { GroceryItem, NewGroceryItem, Recipe } from "../types";
import { queryKeys, useStore } from "./provider";

export function useSession() {
  const store = useStore();
  return useQuery({ queryKey: queryKeys.session, queryFn: () => store.init(), staleTime: Infinity, retry: 1 });
}

export function useHouseholdId(): string | undefined {
  return useSession().data?.household.id;
}

export function useRecipes() {
  const store = useStore();
  const hid = useHouseholdId();
  return useQuery({
    queryKey: queryKeys.recipes(hid ?? ""),
    queryFn: () => store.listRecipes(hid!),
    enabled: Boolean(hid),
  });
}

export function useLatestRecipes(limit = 10) {
  const store = useStore();
  const hid = useHouseholdId();
  return useQuery({
    queryKey: [...queryKeys.latest, limit],
    queryFn: () => store.listLatestRecipes(limit),
    enabled: Boolean(hid),
  });
}

export function useRecipe(id: string) {
  const store = useStore();
  const queryClient = useQueryClient();
  const hid = useHouseholdId();
  return useQuery({
    queryKey: queryKeys.recipe(id),
    queryFn: () => store.getRecipe(id),
    enabled: Boolean(hid),
    initialData: () =>
      queryClient.getQueryData<Recipe[]>(queryKeys.recipes(hid ?? ""))?.find((r) => r.id === id),
  });
}

export function useCanEdit(recipe: Recipe | null | undefined): boolean {
  const hid = useHouseholdId();
  return Boolean(recipe && hid && recipe.householdId === hid);
}

export function useCollections() {
  const store = useStore();
  const hid = useHouseholdId();
  return useQuery({
    queryKey: queryKeys.collections(hid ?? ""),
    queryFn: () => store.listCollections(hid!),
    enabled: Boolean(hid),
  });
}

export function useCooked() {
  const store = useStore();
  const hid = useHouseholdId();
  return useQuery({
    queryKey: queryKeys.cooked(hid ?? ""),
    queryFn: () => store.listCooked(hid!),
    enabled: Boolean(hid),
  });
}

export function useNotes(recipeId: string) {
  const store = useStore();
  const hid = useHouseholdId();
  return useQuery({
    queryKey: queryKeys.notes(recipeId),
    queryFn: () => store.listNotes(recipeId),
    enabled: Boolean(hid),
  });
}

export function useGrocery() {
  const store = useStore();
  const hid = useHouseholdId();
  return useQuery({
    queryKey: queryKeys.grocery(hid ?? ""),
    queryFn: () => store.listGrocery(hid!),
    enabled: Boolean(hid),
  });
}

export function useGroceryActions() {
  const store = useStore();
  const hid = useHouseholdId() ?? "";
  const queryClient = useQueryClient();
  const key = queryKeys.grocery(hid);

  const patchCache = (fn: (items: GroceryItem[]) => GroceryItem[]) => {
    const previous = queryClient.getQueryData<GroceryItem[]>(key);
    if (previous) queryClient.setQueryData(key, fn(previous));
    return previous;
  };
  const settle = () => queryClient.invalidateQueries({ queryKey: key });

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<GroceryItem> }) => store.updateGrocery(id, patch),
    onMutate: ({ id, patch }) => ({ previous: patchCache((items) => items.map((i) => (i.id === id ? { ...i, ...patch } : i))) }),
    onError: (_e, _v, ctx) => ctx?.previous && queryClient.setQueryData(key, ctx.previous),
    onSettled: settle,
  });

  const remove = useMutation({
    mutationFn: (ids: string[]) => store.deleteGrocery(ids),
    onMutate: (ids) => ({ previous: patchCache((items) => items.filter((i) => !ids.includes(i.id))) }),
    onError: (_e, _v, ctx) => ctx?.previous && queryClient.setQueryData(key, ctx.previous),
    onSettled: settle,
  });

  const reorder = useMutation({
    mutationFn: (ids: string[]) => store.reorderGrocery(hid, ids),
    onMutate: (ids) => ({
      previous: patchCache((items) =>
        items.map((i) => (ids.includes(i.id) ? { ...i, position: ids.indexOf(i.id) + 1 } : i)),
      ),
    }),
    onError: (_e, _v, ctx) => ctx?.previous && queryClient.setQueryData(key, ctx.previous),
    onSettled: settle,
  });

  const add = useMutation({
    mutationFn: async (items: NewGroceryItem[]) => {
      const current = queryClient.getQueryData<GroceryItem[]>(key) ?? (await store.listGrocery(hid));
      const fresh: NewGroceryItem[] = [];
      for (const item of items) {
        const match = current.find(
          (c) =>
            !c.checked &&
            c.name.trim().toLowerCase() === item.name.trim().toLowerCase() &&
            (c.unit ?? "") === (item.unit ?? ""),
        );
        if (match && match.qty != null && item.qty != null) {
          await store.updateGrocery(match.id, { qty: match.qty + item.qty });
        } else {
          fresh.push(item);
        }
      }
      await store.addGrocery(hid, fresh);
    },
    onSettled: settle,
  });

  return { update, remove, reorder, add };
}
