import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";

// One run of the browser tests at a time on this machine, from any checkout. Agents in several
// workspaces share one laptop. Two runs of the matrix at once would each take half its cores and
// slow both, so a second run waits for the first to finish. The lock is a directory, which only one
// process can make. A lock whose run has died is taken over.
const lock = join(tmpdir(), "x-govuk-ui-browser-tests.lock");
const owner = join(lock, "owner.json");
const checkout = basename(resolve(import.meta.dirname, "../.."));

type Owner = { pid: number; checkout: string };

/**
 * Whether a process is still running. A process owned by another user counts as running, though it
 * cannot be signalled.
 */
function running(pid: number) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

/** Whether the lock was left by a run that died, or by one that died before it could sign it. */
async function abandoned(held: Owner | null) {
  if (held) return !running(held.pid);
  const made = await stat(lock).catch(() => null);
  return made !== null && Date.now() - made.mtimeMs > 30_000;
}

/** Playwright's global setup. It takes the lock, and returns its teardown, which releases it. */
export default async function takeTheLock() {
  let waiting = false;
  for (;;) {
    try {
      await mkdir(lock);
      await writeFile(owner, JSON.stringify({ pid: process.pid, checkout } satisfies Owner));
      return () => rm(lock, { recursive: true, force: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    }
    const held = await readFile(owner, "utf8")
      .then((text) => JSON.parse(text) as Owner)
      .catch(() => null);
    if (await abandoned(held)) {
      await rm(lock, { recursive: true, force: true });
      continue;
    }
    if (!waiting) {
      console.log(
        `Waiting for the browser tests in ${held?.checkout ?? "another checkout"} to finish`,
      );
      waiting = true;
    }
    await new Promise((settle) => setTimeout(settle, 2000));
  }
}
