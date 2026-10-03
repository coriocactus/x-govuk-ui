import type { BunPlugin } from "bun";
import { compile, NodePackageImporter } from "sass";

export default {
  name: "sass",
  setup(build) {
    build.onLoad({ filter: /\.scss$/ }, ({ path }) => ({
      contents: compile(path, {
        importers: [new NodePackageImporter()],
        quietDeps: true,
      }).css,
      loader: "css",
    }));
  },
} satisfies BunPlugin;
