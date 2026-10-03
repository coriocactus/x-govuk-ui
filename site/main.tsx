import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { componentNames } from "./catalogue";
import { Home, NotFound } from "./home";
import { PreviewFrame } from "./preview-frame";
import { Workbench } from "./workbench";
import { Workspace } from "./workspace";

// An old component address leads to its new one in the workbench.
const old = location.pathname.match(/^\/components\/([^/]+)$/);
if (old) history.replaceState(null, "", `/workbench/${old[1]}${location.search}${location.hash}`);

// The site has three parts, its front page, the workbench and the workspace, and a page for any
// other address.
function pageFor(path: string) {
  if (path === "/") return <Home />;
  if (path === "/workspace") return <Workspace />;
  const [base, name, ...rest] = path.split("/").filter(Boolean);
  const known = !name || componentNames.includes(name as (typeof componentNames)[number]);
  // A component's example alone, in the frame of the workbench's phone preview.
  if (base === "workbench" && name && known && new URLSearchParams(location.search).has("frame")) {
    return <PreviewFrame />;
  }
  if (base === "workbench" && known && !rest.length) return <Workbench />;
  return <NotFound />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>{pageFor(location.pathname)}</StrictMode>,
);
