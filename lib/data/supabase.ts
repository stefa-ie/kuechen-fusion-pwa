"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { categorize } from "../grocery/categorize";
import { getBrowserClient } from "../supabase/client";
import type {
  Collection,
  CookedEntry,
  GroceryCategory,
  GroceryItem,
  Household,
  Member,
  Profile,
  Recipe,
  RecipeDraft,
  RecipeNote,
  RecipeTimes,
  SourceType,
} from "../types";
import type { ChangeTopic, DataStore, Session } from "./store";

type Row = Record<string, unknown>;

function check<T>(result: { data: T; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

const toProfile = (r: Row): Profile => ({
  id: r.id as string,
  displayName: (r.display_name as string) ?? "",
  avatar: (r.avatar as string) ?? "🍳",
  color: (r.color as string) ?? "#121212",
  activeHouseholdId: (r.active_household_id as string) ?? null,
});

const toHousehold = (r: Row): Household => ({
  id: r.id as string,
  name: r.name as string,
  inviteCode: r.invite_code as string,
});

const EMPTY_TIMES: RecipeTimes = { total: null, prep: null, cook: null, bake: null, rest: null };

const toRecipe = (r: Row): Recipe => ({
  id: r.id as string,
  householdId: r.household_id as string,
  createdBy: (r.created_by as string) ?? null,
  createdAt: r.created_at as string,
  title: r.title as string,
  description: (r.description as string) ?? null,
  imageUrl: (r.image_url as string) ?? null,
  author: (r.author as string) ?? null,
  sourceUrl: (r.source_url as string) ?? null,
  linkedUrl: (r.linked_url as string) ?? null,
  sourceType: (r.source_type as SourceType) ?? "web",
  servings: r.servings == null ? null : Number(r.servings),
  servingsLabel: (r.servings_label as string) ?? null,
  times: { ...EMPTY_TIMES, ...((r.times as RecipeTimes) ?? {}) },
  ingredients: (r.ingredients as Recipe["ingredients"]) ?? [],
  steps: (r.steps as Recipe["steps"]) ?? [],
  tags: (r.tags as string[]) ?? [],
  language: (r.language as string) ?? null,
});

function fromDraft(draft: Partial<RecipeDraft>): Row {
  const map: Record<keyof RecipeDraft, string> = {
    title: "title",
    description: "description",
    imageUrl: "image_url",
    author: "author",
    sourceUrl: "source_url",
    linkedUrl: "linked_url",
    sourceType: "source_type",
    servings: "servings",
    servingsLabel: "servings_label",
    times: "times",
    ingredients: "ingredients",
    steps: "steps",
    tags: "tags",
    language: "language",
  };
  const row: Row = {};
  for (const [key, column] of Object.entries(map)) {
    const value = draft[key as keyof RecipeDraft];
    if (value !== undefined) row[column] = value;
  }
  return row;
}

const toGrocery = (r: Row): GroceryItem => ({
  id: r.id as string,
  householdId: r.household_id as string,
  name: r.name as string,
  qty: r.qty == null ? null : Number(r.qty),
  unit: (r.unit as string) ?? null,
  note: (r.note as string) ?? null,
  category: (r.category as GroceryCategory) ?? "other",
  checked: Boolean(r.checked),
  position: Number(r.position ?? 0),
  recipeId: (r.recipe_id as string) ?? null,
  recipeTitle: (r.recipe_title as string) ?? null,
  addedBy: (r.added_by as string) ?? null,
  createdAt: r.created_at as string,
});

const GROCERY_COLUMNS: Record<string, string> = {
  name: "name",
  qty: "qty",
  unit: "unit",
  note: "note",
  category: "category",
  checked: "checked",
  position: "position",
  recipeId: "recipe_id",
  recipeTitle: "recipe_title",
};

export class SupabaseStore implements DataStore {
  mode = "supabase" as const;
  private db: SupabaseClient = getBrowserClient();
  private userId: string | null = null;

  async init(): Promise<Session> {
    const { data } = await this.db.auth.getSession();
    if (!data.session) {
      const { data: signedIn, error } = await this.db.auth.signInAnonymously();
      if (error) throw new Error(error.message);
      this.userId = signedIn.user?.id ?? null;
    } else {
      this.userId = data.session.user.id;
    }
    return this.getSession();
  }

  private uid(): string {
    if (!this.userId) throw new Error("not_authenticated");
    return this.userId;
  }

  async getSession(): Promise<Session> {
    const uid = this.uid();
    const profileRow = check(await this.db.from("profiles").select("*").eq("id", uid).single());
    const profile = toProfile(profileRow);
    const memberships = check(
      await this.db.from("household_members").select("household_id, households(*)").eq("profile_id", uid),
    ) as unknown as { household_id: string; households: Row }[];
    const households = memberships.map((m) => toHousehold(m.households));
    const household = households.find((h) => h.id === profile.activeHouseholdId) ?? households[0];
    if (!household) throw new Error("no_household");
    const memberRows = check(
      await this.db
        .from("household_members")
        .select("role, profiles(id, display_name, avatar, color)")
        .eq("household_id", household.id),
    ) as unknown as { role: Member["role"]; profiles: Row }[];
    const members: Member[] = memberRows.map((m) => ({
      profileId: m.profiles.id as string,
      displayName: (m.profiles.display_name as string) ?? "",
      avatar: (m.profiles.avatar as string) ?? "🍳",
      color: (m.profiles.color as string) ?? "#121212",
      role: m.role,
    }));
    return { profile, household, households, members, mode: "supabase" };
  }

  async updateProfile(patch: Partial<Pick<Profile, "displayName" | "avatar" | "color">>) {
    const row: Row = {};
    if (patch.displayName !== undefined) row.display_name = patch.displayName;
    if (patch.avatar !== undefined) row.avatar = patch.avatar;
    if (patch.color !== undefined) row.color = patch.color;
    check(await this.db.from("profiles").update(row).eq("id", this.uid()));
  }

  async createHousehold(name: string) {
    check(await this.db.rpc("create_household", { name }));
  }

  async joinHousehold(code: string) {
    const { error } = await this.db.rpc("join_household", { code });
    if (error) throw new Error(error.message.includes("not_found") ? "not_found" : error.message);
  }

  async switchHousehold(id: string) {
    check(await this.db.from("profiles").update({ active_household_id: id }).eq("id", this.uid()));
  }

  async renameHousehold(id: string, name: string) {
    check(await this.db.from("households").update({ name }).eq("id", id));
  }

  async leaveHousehold(id: string) {
    const { error } = await this.db.rpc("leave_household", { hid: id });
    if (error) throw new Error(error.message.includes("last_household") ? "last_household" : error.message);
  }

  async listRecipes(householdId: string) {
    const own = check(
      await this.db
        .from("recipes")
        .select("*")
        .eq("household_id", householdId)
        .order("created_at", { ascending: false }),
    ) as Row[];
    const saved = check(
      await this.db.from("collection_recipes").select("recipe_id").eq("household_id", householdId),
    ) as { recipe_id: string }[];
    const ownIds = new Set(own.map((r) => r.id as string));
    const foreignIds = [...new Set(saved.map((s) => s.recipe_id))].filter((id) => !ownIds.has(id));
    const foreign = foreignIds.length
      ? (check(await this.db.from("recipes").select("*").in("id", foreignIds)) as Row[])
      : [];
    return [...own, ...foreign]
      .map(toRecipe)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async listLatestRecipes(limit: number) {
    const rows = check(
      await this.db.from("recipes").select("*").order("created_at", { ascending: false }).limit(limit),
    );
    return (rows ?? []).map(toRecipe);
  }

  async getRecipe(id: string) {
    const row = check(await this.db.from("recipes").select("*").eq("id", id).maybeSingle());
    return row ? toRecipe(row) : null;
  }

  private async persistImage<T extends Partial<RecipeDraft>>(householdId: string, draft: T): Promise<T> {
    if (!draft.imageUrl?.startsWith("data:")) return draft;
    const blob = await (await fetch(draft.imageUrl)).blob();
    const ext = blob.type.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
    const path = `${householdId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await this.db.storage.from("recipe-images").upload(path, blob, { contentType: blob.type });
    if (error) return { ...draft, imageUrl: null };
    return { ...draft, imageUrl: this.db.storage.from("recipe-images").getPublicUrl(path).data.publicUrl };
  }

  async createRecipe(householdId: string, input: RecipeDraft) {
    const draft = await this.persistImage(householdId, input);
    const row = check(
      await this.db
        .from("recipes")
        .insert({ ...fromDraft(draft), household_id: householdId, created_by: this.uid() })
        .select("*")
        .single(),
    );
    return toRecipe(row);
  }

  async updateRecipe(id: string, input: Partial<RecipeDraft>) {
    let draft = input;
    if (input.imageUrl?.startsWith("data:")) {
      const row = check(await this.db.from("recipes").select("household_id").eq("id", id).single()) as Row;
      draft = await this.persistImage(row.household_id as string, input);
    }
    check(
      await this.db
        .from("recipes")
        .update({ ...fromDraft(draft), updated_at: new Date().toISOString() })
        .eq("id", id),
    );
  }

  async deleteRecipe(id: string) {
    check(await this.db.from("recipes").delete().eq("id", id));
  }

  async listCollections(householdId: string): Promise<Collection[]> {
    const rows = check(
      await this.db
        .from("collections")
        .select("*, collection_recipes(recipe_id, added_at)")
        .eq("household_id", householdId)
        .order("created_at"),
    ) as Row[];
    return rows.map((r) => ({
      id: r.id as string,
      householdId: r.household_id as string,
      name: r.name as string,
      createdAt: r.created_at as string,
      recipeIds: ((r.collection_recipes as { recipe_id: string; added_at: string }[]) ?? [])
        .sort((a, b) => b.added_at.localeCompare(a.added_at))
        .map((c) => c.recipe_id),
    }));
  }

  async createCollection(householdId: string, name: string) {
    const row = check(
      await this.db
        .from("collections")
        .insert({ household_id: householdId, name, created_by: this.uid() })
        .select("*")
        .single(),
    );
    return {
      id: row.id as string,
      householdId,
      name: row.name as string,
      recipeIds: [],
      createdAt: row.created_at as string,
    };
  }

  async renameCollection(id: string, name: string) {
    check(await this.db.from("collections").update({ name }).eq("id", id));
  }

  async deleteCollection(id: string) {
    check(await this.db.from("collections").delete().eq("id", id));
  }

  async setInCollection(householdId: string, collectionId: string, recipeId: string, included: boolean) {
    if (included) {
      check(
        await this.db
          .from("collection_recipes")
          .upsert({ collection_id: collectionId, recipe_id: recipeId, household_id: householdId }),
      );
    } else {
      check(
        await this.db
          .from("collection_recipes")
          .delete()
          .eq("collection_id", collectionId)
          .eq("recipe_id", recipeId),
      );
    }
  }

  async listCooked(householdId: string): Promise<CookedEntry[]> {
    const rows = check(await this.db.from("recipe_cooked").select("*").eq("household_id", householdId)) as Row[];
    return rows.map((r) => ({
      recipeId: r.recipe_id as string,
      profileId: r.profile_id as string,
      cookedAt: r.cooked_at as string,
    }));
  }

  async setCooked(householdId: string, recipeId: string, cooked: boolean) {
    if (cooked) {
      check(
        await this.db
          .from("recipe_cooked")
          .upsert({ recipe_id: recipeId, profile_id: this.uid(), household_id: householdId }),
      );
    } else {
      check(
        await this.db.from("recipe_cooked").delete().eq("recipe_id", recipeId).eq("profile_id", this.uid()),
      );
    }
  }

  async listNotes(recipeId: string): Promise<RecipeNote[]> {
    const rows = check(
      await this.db
        .from("recipe_notes")
        .select("*")
        .eq("recipe_id", recipeId)
        .order("created_at", { ascending: false }),
    ) as Row[];
    return rows.map((r) => ({
      id: r.id as string,
      recipeId: r.recipe_id as string,
      profileId: r.profile_id as string,
      body: r.body as string,
      createdAt: r.created_at as string,
    }));
  }

  async addNote(householdId: string, recipeId: string, body: string) {
    check(await this.db.from("recipe_notes").insert({ household_id: householdId, recipe_id: recipeId, body }));
  }

  async deleteNote(id: string) {
    check(await this.db.from("recipe_notes").delete().eq("id", id));
  }

  async listGrocery(householdId: string) {
    const rows = check(
      await this.db.from("grocery_items").select("*").eq("household_id", householdId).order("position"),
    );
    return (rows ?? []).map(toGrocery);
  }

  async addGrocery(householdId: string, items: Parameters<DataStore["addGrocery"]>[1]) {
    if (!items.length) return;
    const { data } = await this.db
      .from("grocery_items")
      .select("position")
      .eq("household_id", householdId)
      .order("position", { ascending: false })
      .limit(1);
    let position = Number(data?.[0]?.position ?? 0) + 1;
    check(
      await this.db.from("grocery_items").insert(
        items.map((item) => ({
          household_id: householdId,
          name: item.name,
          qty: item.qty,
          unit: item.unit,
          note: item.note,
          category: item.category ?? categorize(item.name),
          recipe_id: item.recipeId ?? null,
          recipe_title: item.recipeTitle ?? null,
          added_by: this.uid(),
          position: position++,
        })),
      ),
    );
  }

  async updateGrocery(id: string, patch: Partial<Omit<GroceryItem, "id" | "householdId">>) {
    const row: Row = {};
    for (const [key, value] of Object.entries(patch)) {
      const column = GROCERY_COLUMNS[key];
      if (column) row[column] = value;
    }
    check(await this.db.from("grocery_items").update(row).eq("id", id));
  }

  async deleteGrocery(ids: string[]) {
    if (!ids.length) return;
    check(await this.db.from("grocery_items").delete().in("id", ids));
  }

  async reorderGrocery(_householdId: string, orderedIds: string[]) {
    check(await this.db.rpc("reorder_grocery", { ids: orderedIds }));
  }

  subscribe(householdId: string, onChange: (topic: ChangeTopic) => void) {
    const tables: [string, ChangeTopic][] = [
      ["grocery_items", "grocery"],
      ["recipes", "recipes"],
      ["collections", "collections"],
      ["collection_recipes", "collections"],
      ["recipe_cooked", "cooked"],
      ["household_members", "household"],
    ];
    let channel = this.db.channel(`household:${householdId}`);
    for (const [table, topic] of tables) {
      channel = channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter: `household_id=eq.${householdId}` },
        () => onChange(topic),
      );
    }
    channel.subscribe();
    return () => {
      void this.db.removeChannel(channel);
    };
  }
}
