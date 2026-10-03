// The browser tests as CI runs them, in Playwright's own image, at the version package.json pins,
// against the site built in dist/. Its WebKit is Linux's, which handles focus and selections
// differently from a Mac's. There, a press gives a button focus, and a selection set by script is
// reported a frame later. A test can therefore fail in CI alone, and this script shows it here in
// a couple of minutes. It takes Playwright's own arguments, such as a spec and `-g`.
//
// The image has no Bun, which runs the config and the server, so Bun is fetched into it, at the
// version in use here, for the image's own architecture.
import { devDependencies } from "../package.json";

const image = `mcr.microsoft.com/playwright:v${devDependencies["@playwright/test"]}-noble`;
if (!(await Bun.file("dist/index.html").exists()))
  throw new Error("Run bun run build before the browser tests, which run against dist/.");

const inside = `
set -e
case "$(uname -m)" in aarch64) arch=aarch64 ;; *) arch=x64 ;; esac
mkdir -p /tmp/home/.bun/bin && cd /tmp/home
curl -fsSL -o bun.zip "https://github.com/oven-sh/bun/releases/download/bun-v${Bun.version}/bun-linux-$arch.zip"
python3 -c 'import zipfile; zipfile.ZipFile("bun.zip").extractall(".")'
mv "bun-linux-$arch/bun" .bun/bin/bun && chmod +x .bun/bin/bun && ln -s bun .bun/bin/bunx
export PATH=/tmp/home/.bun/bin:$PATH
cd /work && exec bunx --bun playwright test "$@"
`;
const run = Bun.spawn(
  [
    "docker",
    "run",
    "--rm",
    "--volume",
    `${process.cwd()}:/work`,
    "--workdir",
    "/work",
    "--env",
    "HOME=/tmp/home",
    // A public repository's runner has four CPUs, and the tests' pace depends on the CPUs.
    "--cpus",
    "4",
    image,
    "bash",
    "-c",
    inside,
    "--",
    ...process.argv.slice(2),
  ],
  { stdin: "inherit", stdout: "inherit", stderr: "inherit" },
);
process.exit(await run.exited);
