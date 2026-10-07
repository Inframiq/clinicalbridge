import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Deno (Supabase Edge Functions) - not part of the Next.js build.
  globalIgnores(["supabase/functions/**"]),
]);

export default eslintConfig;
