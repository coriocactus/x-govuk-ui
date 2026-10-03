import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { basename, dirname, join, resolve } from "node:path";

// This checkout of the repository, and the ports its servers take. The repository may be checked
// out more than once, as jj workspaces or git worktrees side by side. It may also be checked out
// once, as a contributor's clone in a folder of any name. Ports are found, not assigned, so no
// checkout depends on how its folder is named. None collides with another checkout, or with
// anything else on the machine.
// - The workbench takes the port it had last time, so an address kept in a browser keeps working.
//   Otherwise it takes the first free port from 3000 for the main checkout and from 3001 for any
//   other, so 3000 stays the person's own. The port is remembered in this checkout's
//   node_modules/.cache.
// - The browser tests take a free port the system gives each run.
// - A probe server takes the first free port from 3005 and says which.

const root = resolve(import.meta.dir, "..");
const memory = join(root, "node_modules/.cache/x-govuk-ui/workbench-port");

/** What a command prints, or nothing if it fails or is not installed. */
function run(command: string[]) {
  try {
    const result = Bun.spawnSync(command, { cwd: root, stdout: "pipe", stderr: "ignore" });
    return result.success ? result.stdout.toString().trim() : "";
  } catch {
    return "";
  }
}

/**
 * This checkout's name, which the workbench's toolbar uses to tell checkouts apart, and whether it
 * is the main one. The name is jj's workspace, or git's worktree, or else the folder's. Reading
 * jj's workspace leaves the working copy unchanged.
 */
export function checkout(): { name: string; main: boolean } {
  const workspace = run([
    "jj",
    "--ignore-working-copy",
    "log",
    "-r",
    "@",
    "--no-graph",
    "-T",
    "working_copies",
  ])
    .split(/\s+/)[0]
    ?.replace(/@$/, "");
  if (workspace) return { name: workspace, main: workspace === "default" };
  const top = run(["git", "rev-parse", "--show-toplevel"]);
  if (top) {
    const own = resolve(root, run(["git", "rev-parse", "--git-dir"]));
    const shared = resolve(root, run(["git", "rev-parse", "--git-common-dir"]));
    return { name: basename(top), main: own === shared };
  }
  return { name: basename(root), main: true };
}

// A server listening on every address of a port leaves space for another on one address of it, and
// the reverse. A browser goes to whichever is more specific. A port is therefore free only if each
// address a browser might reach it by can be listened on. Those are every address and the
// machine's own, in IPv4 and IPv6. A machine without IPv6 has no such address, which leaves
// nothing in the way.
const addresses = ["0.0.0.0", "127.0.0.1", "::", "::1"];

/** Whether an address of a port can be listened on, found by listening on it for a moment. */
const open = (port: number, host: string) =>
  new Promise<boolean>((done) => {
    const server = createServer();
    server.once("error", (error: NodeJS.ErrnoException) =>
      done(error.code === "EADDRNOTAVAIL" || error.code === "EAFNOSUPPORT"),
    );
    server.listen({ port, host, exclusive: true }, () => server.close(() => done(true)));
  });

/** Whether nothing listens on a port, at any address a browser might reach it by. */
async function free(port: number) {
  for (const host of addresses) if (!(await open(port, host))) return false;
  return true;
}

/** The first free port from one, skipping any to leave alone. */
async function firstFree(from: number, { skip = [] }: { skip?: number[] } = {}) {
  for (let port = from; port < from + 200; port++)
    if (!skip.includes(port) && (await free(port))) return port;
  throw new Error(`No port is free from ${from} to ${from + 199}.`);
}

/** A free port the system chooses, for a server no one needs to find again, such as the tests'. */
export function anyFree(hostname = "127.0.0.1") {
  const server = Bun.serve({ port: 0, hostname, fetch: () => new Response() });
  const { port } = server;
  server.stop(true);
  return port;
}

/** The port this checkout last served its workbench on, if any. */
function remembered() {
  try {
    const port = Number(readFileSync(memory, "utf8"));
    return Number.isInteger(port) && port > 0 ? port : null;
  } catch {
    return null;
  }
}

/**
 * The port a checkout's workbench starts looking from, 3000 for the main one and 3001 for any
 * other.
 */
const lowest = (main: boolean) => (main ? 3000 : 3001);

/**
 * The port for this checkout's workbench. It is the one it had last time, while that is free, or
 * else the first free one from 3000 for the main checkout and from 3001 for any other. Either way,
 * it is remembered for next time.
 */
export async function workbenchPort() {
  const { main } = checkout();
  const skip = main ? [] : [3000];
  const port = await firstFree(remembered() ?? lowest(main), { skip });
  mkdirSync(dirname(memory), { recursive: true });
  writeFileSync(memory, String(port));
  return port;
}

// `bun run checkout` says the checkout's name and its workbench's port. Given `name`, it says only
// the name, for `bun run dev` to give the workbench. Given `port`, it says only a free port.
if (import.meta.main) {
  const { name, main } = checkout();
  const asked = process.argv[2];
  if (asked === "name") console.log(name);
  else if (asked === "port") console.log(anyFree());
  else {
    const workbench = remembered() ?? `the first free port from ${lowest(main)}`;
    console.log(
      `${name}${main ? ", the main checkout" : ""}: the workbench on ${workbench}, the browser tests on a free port each run, probes on the first free port from 3005`,
    );
  }
}
