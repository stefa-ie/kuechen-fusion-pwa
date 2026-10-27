import type {
  Collection,
  CookedEntry,
  GroceryItem,
  Household,
  Member,
  NewGroceryItem,
  Profile,
  Recipe,
  RecipeDraft,
  RecipeNote,
} from "../types";

export interface Session {
  profile: Profile;
  household: Household;
  households: Household[];
  members: Member[];
  /** "supabase" shares data across devices, "local" keeps it in this browser. */
  mode: "supabase" | "local";
}

export type ChangeTopic = "recipes" | "collections" | "cooked" | "grocery" | "household" | "notes";

export interface DataStore {
  mode: Session["mode"];
  init(): Promise<Session>;
  getSession(): Promise<Session>;
  updateProfile(patch: Partial<Pick<Profile, "displayName" | "avatar" | "color">>): Promise<void>;
  createHousehold(name: string): Promise<void>;
  joinHousehold(code: string): Promise<void>;
  switchHousehold(id: string): Promise<void>;
  renameHousehold(id: string, name: string): Promise<void>;
  leaveHousehold(id: string): Promise<void>;

  listRecipes(householdId: string): Promise<Recipe[]>;
  getRecipe(id: string): Promise<Recipe | null>;
  createRecipe(householdId: string, draft: RecipeDraft): Promise<Recipe>;
  updateRecipe(id: string, draft: Partial<RecipeDraft>): Promise<void>;
  deleteRecipe(id: string): Promise<void>;

  listCollections(householdId: string): Promise<Collection[]>;
  createCollection(householdId: string, name: string): Promise<Collection>;
  renameCollection(id: string, name: string): Promise<void>;
  deleteCollection(id: string): Promise<void>;
  setInCollection(householdId: string, collectionId: string, recipeId: string, included: boolean): Promise<void>;

  listCooked(householdId: string): Promise<CookedEntry[]>;
  setCooked(householdId: string, recipeId: string, cooked: boolean): Promise<void>;

  listNotes(recipeId: string): Promise<RecipeNote[]>;
  addNote(householdId: string, recipeId: string, body: string): Promise<void>;
  deleteNote(id: string): Promise<void>;

  listGrocery(householdId: string): Promise<GroceryItem[]>;
  addGrocery(householdId: string, items: NewGroceryItem[]): Promise<void>;
  updateGrocery(id: string, patch: Partial<Omit<GroceryItem, "id" | "householdId">>): Promise<void>;
  deleteGrocery(ids: string[]): Promise<void>;
  reorderGrocery(householdId: string, orderedIds: string[]): Promise<void>;

  /** Notifies about changes made elsewhere (other devices or tabs). */
  subscribe(householdId: string, onChange: (topic: ChangeTopic) => void): () => void;
}
