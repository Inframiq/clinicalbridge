import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "./database.types";

export type { Database, Json };
export type { Tables, TablesInsert, TablesUpdate } from "./database.types";
export type TypedSupabaseClient = SupabaseClient<Database>;

export type JsonObject = { [key: string]: Json | undefined };

/** Narrows a JSONB value to an object, falling back to `{}` for null, arrays and scalars. */
export function asJsonObject(value: Json | null | undefined): JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value : {};
}
