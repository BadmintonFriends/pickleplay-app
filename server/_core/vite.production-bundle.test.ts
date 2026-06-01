import { build } from "esbuild";
import { describe, expect, it } from "vitest";

describe("production server bundle", () => {
  it("does not require Vite-only development dependencies at startup", async () => {
    const result = await build({
      entryPoints: ["server/_core/index.ts"],
      platform: "node",
      packages: "external",
      bundle: true,
      format: "esm",
      write: false,
    });

    const output = result.outputFiles[0]?.text ?? "";

    expect(output).not.toContain('from "vite"');
    expect(output).not.toContain('from "@vitejs/plugin-react"');
    expect(output).not.toContain('from "@builder.io/vite-plugin-jsx-loc"');
    expect(output).not.toContain('from "vite-plugin-manus-runtime"');
  });
});
