import type { CodegenConfig } from "@graphql-codegen/cli"

const config: CodegenConfig = {
  overwrite: true,
  schema: "../schema/*.graphql",
  // Keep node_modules and build output out of the glob: the code-file-loader
  // forces `ignore: []`, and since cli v7 defaults to `noSilentErrors: true`,
  // a single unparsable file anywhere under the glob fails the whole run.
  documents: ["./**/*.tsx", "./**/*.ts", "!./node_modules/**", "!./.next/**", "!./graph/**"],
  ignoreNoDocuments: true,
  generates: {
    "./graph/": {
      preset: "client",
      config: {
        useTypeImports: true,
        // skipTypename: false,
        // withHooks: true,
        documentMode: "documentNode",
        scalars: { Cursor: "string", Date: "string", DateTime: "string" },
      },
    },
  },
  // hooks: { afterAllFileWrite: ["biome check --write"] },
}

export default config
