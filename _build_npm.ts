#!/usr/bin/env -S deno run --allow-all

/**
 * Build NPM package from Deno TypeScript source
 * Copyright (c) 2025 Superstruct Ltd, New Zealand
 * Licensed under LGPL-3.0+
 */

import { build, emptyDir } from "https://deno.land/x/dnt@0.40.0/mod.ts"

await emptyDir("./npm")

await build({
  entryPoints: ["./src/lib/index.ts"],
  outDir: "./npm",
  shims: {
    deno: true,
  },
  package: {
    name: "@discere-os/babl.wasm",
    version: "0.1.115",
    description: "WebAssembly port of BABL pixel format conversion library with SIMD optimization",
    keywords: [
      "babl",
      "webassembly",
      "wasm",
      "pixel-format",
      "color-conversion",
      "simd",
      "image-processing",
      "graphics",
      "color-space"
    ],
    license: "LGPL-3.0+",
    repository: {
      type: "git",
      url: "git+https://github.com/discere-os/discere-nucleus.git",
      directory: "client/emscripten/babl.wasm"
    },
    bugs: {
      url: "https://github.com/discere-os/discere-nucleus/issues"
    },
    homepage: "https://wasm.discere.cloud/babl",
    author: {
      name: "Superstruct Ltd",
      email: "noreply@superstruct.ai",
      url: "https://superstruct.ai"
    },
    contributors: [
      {
        name: "Øyvind Kolås and BABL contributors",
        url: "https://github.com/GNOME/babl"
      }
    ],
    files: [
      "lib/**/*",
      "esm/**/*",
      "types/**/*",
      "wasm/**/*",
      "README.md"
    ],
    engines: {
      node: ">=18.0.0"
    },
    exports: {
      ".": {
        import: "./esm/lib/index.js",
        require: "./lib/index.js",
        types: "./types/lib/index.d.ts"
      },
      "./types": {
        import: "./esm/lib/types.js",
        require: "./lib/types.js",
        types: "./types/lib/types.d.ts"
      }
    },
    publishConfig: {
      access: "public"
    }
  },
  postBuild() {
    // Copy WASM files to npm package
    Deno.copyFileSync("install/wasm/babl-main.js", "npm/wasm/babl-main.js")
    Deno.copyFileSync("install/wasm/babl-main.wasm", "npm/wasm/babl-main.wasm")
    Deno.copyFileSync("install/wasm/babl-side.wasm", "npm/wasm/babl-side.wasm")

    // Copy README
    Deno.copyFileSync("README.md", "npm/README.md")

    console.log("✅ NPM package built successfully")
    console.log("📦 Package contents:")
    console.log("  - TypeScript definitions")
    console.log("  - CommonJS and ESM modules")
    console.log("  - WebAssembly binaries")
    console.log("  - Documentation")
  },
})