"use client";

import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { isSupabaseConfigured } from "../supabase/env";
import { LocalStore } from "./local";
import type { ChangeTopic, DataStore } from "./store";
import { SupabaseStore } from "./supabase";

const StoreContext = createContext<DataStore | null>(null);

export const queryKeys = {
  session: ["session"] as const,
  recipes: (hid: string) => ["recipes", hid] as const,
  latest: ["latest"] as const,
  recipe: (id: string) => ["recipe", id] as const,
  collections: (hid: string) => ["collections", hid] as const,
  cooked: (hid: string) => ["cooked", hid] as const,
  notes: (recipeId: string) => ["notes", recipeId] as const,
  grocery: (hid: string) => ["grocery", hid] as const,
};

const TOPIC_KEYS: Record<ChangeTopic, string[]> = {
  recipes: ["recipes", "recipe", "latest"],
  collections: ["collections"],
  cooked: ["cooked"],
  grocery: ["grocery"],
  household: ["session"],
  notes: ["notes"],
};

export function invalidateTopic(queryClient: QueryClient, topic: ChangeTopic) {
  for (const key of TOPIC_KEYS[topic]) void queryClient.invalidateQueries({ queryKey: [key] });
}

function RealtimeBridge() {
  const store = useStore();
  const queryClient = useQueryClient();
  const { data: session } = useQuery({ queryKey: queryKeys.session, queryFn: () => store.init(), staleTime: Infinity });
  const householdId = session?.household.id;

  useEffect(() => {
    if (!householdId) return;
    return store.subscribe(householdId, (topic) => invalidateTopic(queryClient, topic));
  }, [store, householdId, queryClient]);

  return null;
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: true } } }),
  );
  const [store] = useState<DataStore>(() => (isSupabaseConfigured ? new SupabaseStore() : new LocalStore()));

  return (
    <QueryClientProvider client={queryClient}>
      <StoreContext.Provider value={store}>
        <RealtimeBridge />
        {children}
      </StoreContext.Provider>
    </QueryClientProvider>
  );
}

export function useStore(): DataStore {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useStore must be used inside DataProvider");
  return store;
}

export function useInvalidate() {
  const queryClient = useQueryClient();
  return (topic: ChangeTopic) => invalidateTopic(queryClient, topic);
}
