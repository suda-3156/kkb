import type { CodegenConfig } from "@graphql-codegen/cli"

const config: CodegenConfig = {
  overwrite: true,
  schema: "../schema/*.graphql",
  documents: ["./**/*.tsx", "./**/*.ts"],
  ignoreNoDocuments: true,
  generates: {
    "./graph/": {
      preset: "client",
      config: {
        useTypeImports: true,
        skipTypename: false,
        withHooks: true,
        documentMode: "documentNode",
      },
    },
  },
  // hooks: { afterAllFileWrite: ["biome check --write"] },
}

export default config
