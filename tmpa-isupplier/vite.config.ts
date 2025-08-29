import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

export default defineConfig({
  plugins: [react()],
  base: "/TMPA_supplier_Assistant/", // must match the repo name exactly
});
