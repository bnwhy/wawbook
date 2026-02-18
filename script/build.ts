import { build as esbuild, Plugin } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, readFile } from "fs/promises";

// Plugin to completely ignore dev-only modules in production
const ignoreDevModules: Plugin = {
  name: "ignore-dev-modules",
  setup(build) {
    // Match ./vite imports from server/index.ts
    build.onResolve({ filter: /^\.\/vite$/ }, (args) => {
      return {
        path: args.path,
        namespace: "ignore-dev",
      };
    });

    // Return empty module for ignored paths
    build.onLoad({ filter: /.*/, namespace: "ignore-dev" }, () => {
      return {
        contents: "export const setupVite = () => { throw new Error('Vite should not be used in production'); };",
        loader: "js",
      };
    });
  },
};

// Server deps to bundle into dist/index.cjs to reduce cold start times.
// Only include packages actually imported by server code.
const allowlist = [
  "bcryptjs",
  "connect-pg-simple",
  "drizzle-orm",
  "drizzle-zod",
  "express",
  "express-rate-limit",
  "express-session",
  "passport",
  "passport-apple",
  "passport-google-oauth20",
  "passport-local",
  "pg",
  "pino",
  "pino-pretty",
  "sharp",
  "stripe",
  "zod",
  "zod-validation-error",
];

async function buildAll() {
  await rm("dist", { recursive: true, force: true });

  console.log("building client...");
  await viteBuild();

  console.log("building server...");
  const pkg = JSON.parse(await readFile("package.json", "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  const externals = allDeps.filter((dep) => !allowlist.includes(dep));

  // Add vite-related modules to externals to prevent bundling dev-only code
  const devExternals = [
    "vite",
    "vite-plugin-runtime-error-modal",
    "@vitejs/plugin-react",
    "./vite",
    "./vite.js",
  ];

  await esbuild({
    entryPoints: ["server/index.ts"],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: "dist/index.cjs",
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: true,
    external: [...externals, ...devExternals],
    plugins: [ignoreDevModules],
    logLevel: "info",
  });
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
