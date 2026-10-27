"use client";

import { categorize } from "../grocery/categorize";
import type {
  Collection,
  CookedEntry,
  GroceryItem,
  Household,
  Member,
  Profile,
  Recipe,
  RecipeDraft,
  RecipeNote,
} from "../types";
import type { ChangeTopic, DataStore, Session } from "./store";

interface LocalDb {
  profile: Profile;
  households: Household[];
  memberships: { householdId: string; profileId: string; role: Member["role"] }[];
  recipes: Recipe[];
  collections: Collection[];
  cooked: (CookedEntry & { householdId: string })[];
  notes: (RecipeNote & { householdId: string })[];
  grocery: GroceryItem[];
}

const KEY = "kf-local-db-v1";
const CHANNEL = "kf-local-db";

export function randomId(): string {
  return crypto.randomUUID();
}

export function inviteCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => alphabet[b % alphabet.length]).join("");
}

function now() {
  return new Date().toISOString();
}

/** Browser-only store used when Supabase is not configured. Syncs between tabs. */
export class LocalStore implements DataStore {
  mode = "local" as const;
  private channel: BroadcastChannel | null =
    typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(CHANNEL) : null;

  private read(): LocalDb {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as LocalDb;
    const profileId = randomId();
    const household: Household = { id: randomId(), name: "Unsere Küche", inviteCode: inviteCode() };
    const db: LocalDb = {
      profile: { id: profileId, displayName: "", avatar: "🍳", color: "#121212", activeHouseholdId: household.id },
      households: [household],
      memberships: [{ householdId: household.id, profileId, role: "owner" }],
      recipes: [],
      collections: [
        { id: randomId(), householdId: household.id, name: "Favoriten", recipeIds: [], createdAt: now() },
        { id: randomId(), householdId: household.id, name: "Will ich kochen", recipeIds: [], createdAt: now() },
      ],
      cooked: [],
      notes: [],
      grocery: [],
    };
    localStorage.setItem(KEY, JSON.stringify(db));
    return db;
  }

  private write(db: LocalDb, topic: ChangeTopic) {
    localStorage.setItem(KEY, JSON.stringify(db));
    this.channel?.postMessage(topic);
  }

  async init() {
    return this.getSession();
  }

  async getSession(): Promise<Session> {
    const db = this.read();
    const households = db.households.filter((h) =>
      db.memberships.some((m) => m.householdId === h.id && m.profileId === db.profile.id),
    );
    const household = households.find((h) => h.id === db.profile.activeHouseholdId) ?? households[0];
    const members: Member[] = db.memberships
      .filter((m) => m.householdId === household.id)
      .map((m) => ({
        profileId: m.profileId,
        displayName: db.profile.displayName,
        avatar: db.profile.avatar,
        color: db.profile.color,
        role: m.role,
      }));
    return { profile: db.profile, household, households, members, mode: "local" };
  }

  async updateProfile(patch: Partial<Pick<Profile, "displayName" | "avatar" | "color">>) {
    const db = this.read();
    db.profile = { ...db.profile, ...patch };
    this.write(db, "household");
  }

  async createHousehold(name: string) {
    const db = this.read();
    const household: Household = { id: randomId(), name, inviteCode: inviteCode() };
    db.households.push(household);
    db.memberships.push({ householdId: household.id, profileId: db.profile.id, role: "owner" });
    db.profile.activeHouseholdId = household.id;
    this.write(db, "household");
  }

  async joinHousehold(code: string) {
    const db = this.read();
    const household = db.households.find((h) => h.inviteCode === code.trim().toUpperCase());
    if (!household) throw new Error("not_found");
    if (!db.memberships.some((m) => m.householdId === household.id && m.profileId === db.profile.id)) {
      db.memberships.push({ householdId: household.id, profileId: db.profile.id, role: "member" });
    }
    db.profile.activeHouseholdId = household.id;
    this.write(db, "household");
  }

  async switchHousehold(id: string) {
    const db = this.read();
    db.profile.activeHouseholdId = id;
    this.write(db, "household");
  }

  async renameHousehold(id: string, name: string) {
    const db = this.read();
    db.households = db.households.map((h) => (h.id === id ? { ...h, name } : h));
    this.write(db, "household");
  }

  async leaveHousehold(id: string) {
    const db = this.read();
    const mine = db.memberships.filter((m) => m.profileId === db.profile.id);
    if (mine.length <= 1) throw new Error("last_household");
    db.memberships = db.memberships.filter((m) => !(m.householdId === id && m.profileId === db.profile.id));
    if (db.profile.activeHouseholdId === id) {
      db.profile.activeHouseholdId = db.memberships.find((m) => m.profileId === db.profile.id)?.householdId ?? null;
    }
    this.write(db, "household");
  }

  async listRecipes(householdId: string) {
    return this.read()
      .recipes.filter((r) => r.householdId === householdId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getRecipe(id: string) {
    return this.read().recipes.find((r) => r.id === id) ?? null;
  }

  async createRecipe(householdId: string, draft: RecipeDraft) {
    const db = this.read();
    const recipe: Recipe = { ...draft, id: randomId(), householdId, createdBy: db.profile.id, createdAt: now() };
    db.recipes.push(recipe);
    this.write(db, "recipes");
    return recipe;
  }

  async updateRecipe(id: string, patch: Partial<RecipeDraft>) {
    const db = this.read();
    db.recipes = db.recipes.map((r) => (r.id === id ? { ...r, ...patch } : r));
    this.write(db, "recipes");
  }

  async deleteRecipe(id: string) {
    const db = this.read();
    db.recipes = db.recipes.filter((r) => r.id !== id);
    db.collections = db.collections.map((c) => ({ ...c, recipeIds: c.recipeIds.filter((r) => r !== id) }));
    db.cooked = db.cooked.filter((c) => c.recipeId !== id);
    db.grocery = db.grocery.map((g) => (g.recipeId === id ? { ...g, recipeId: null } : g));
    this.write(db, "recipes");
  }

  async listCollections(householdId: string) {
    return this.read().collections.filter((c) => c.householdId === householdId);
  }

  async createCollection(householdId: string, name: string) {
    const db = this.read();
    const collection: Collection = { id: randomId(), householdId, name, recipeIds: [], createdAt: now() };
    db.collections.push(collection);
    this.write(db, "collections");
    return collection;
  }

  async renameCollection(id: string, name: string) {
    const db = this.read();
    db.collections = db.collections.map((c) => (c.id === id ? { ...c, name } : c));
    this.write(db, "collections");
  }

  async deleteCollection(id: string) {
    const db = this.read();
    db.collections = db.collections.filter((c) => c.id !== id);
    this.write(db, "collections");
  }

  async setInCollection(_householdId: string, collectionId: string, recipeId: string, included: boolean) {
    const db = this.read();
    db.collections = db.collections.map((c) => {
      if (c.id !== collectionId) return c;
      const without = c.recipeIds.filter((r) => r !== recipeId);
      return { ...c, recipeIds: included ? [recipeId, ...without] : without };
    });
    this.write(db, "collections");
  }

  async listCooked(householdId: string) {
    return this.read().cooked.filter((c) => c.householdId === householdId);
  }

  async setCooked(householdId: string, recipeId: string, cooked: boolean) {
    const db = this.read();
    db.cooked = db.cooked.filter((c) => !(c.recipeId === recipeId && c.profileId === db.profile.id));
    if (cooked) db.cooked.push({ householdId, recipeId, profileId: db.profile.id, cookedAt: now() });
    this.write(db, "cooked");
  }

  async listNotes(recipeId: string) {
    const db = this.read();
    return db.notes
      .filter((n) => n.recipeId === recipeId && n.profileId === db.profile.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async addNote(householdId: string, recipeId: string, body: string) {
    const db = this.read();
    db.notes.push({ id: randomId(), householdId, recipeId, profileId: db.profile.id, body, createdAt: now() });
    this.write(db, "notes");
  }

  async deleteNote(id: string) {
    const db = this.read();
    db.notes = db.notes.filter((n) => n.id !== id);
    this.write(db, "notes");
  }

  async listGrocery(householdId: string) {
    return this.read().grocery.filter((g) => g.householdId === householdId);
  }

  async addGrocery(householdId: string, items: Parameters<DataStore["addGrocery"]>[1]) {
    const db = this.read();
    let position = Math.max(0, ...db.grocery.filter((g) => g.householdId === householdId).map((g) => g.position)) + 1;
    for (const item of items) {
      db.grocery.push({
        id: randomId(),
        householdId,
        name: item.name,
        qty: item.qty,
        unit: item.unit,
        note: item.note,
        category: item.category ?? categorize(item.name),
        checked: false,
        position: position++,
        recipeId: item.recipeId ?? null,
        recipeTitle: item.recipeTitle ?? null,
        addedBy: db.profile.id,
        createdAt: now(),
      });
    }
    this.write(db, "grocery");
  }

  async updateGrocery(id: string, patch: Partial<GroceryItem>) {
    const db = this.read();
    db.grocery = db.grocery.map((g) => (g.id === id ? { ...g, ...patch } : g));
    this.write(db, "grocery");
  }

  async deleteGrocery(ids: string[]) {
    const db = this.read();
    db.grocery = db.grocery.filter((g) => !ids.includes(g.id));
    this.write(db, "grocery");
  }

  async reorderGrocery(_householdId: string, orderedIds: string[]) {
    const db = this.read();
    db.grocery = db.grocery.map((g) => {
      const index = orderedIds.indexOf(g.id);
      return index === -1 ? g : { ...g, position: index + 1 };
    });
    this.write(db, "grocery");
  }

  subscribe(_householdId: string, onChange: (topic: ChangeTopic) => void) {
    const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(CHANNEL) : null;
    if (!channel) return () => {};
    channel.onmessage = (event) => onChange(event.data as ChangeTopic);
    return () => channel.close();
  }
}
