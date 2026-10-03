import { useEffect, useState } from "react";
import { ScrollArea, SoundScope, TooltipProvider, useSound, useTheme } from "x-govuk-ui";
import { type ComponentName, componentNames } from "./catalogue";
import { PreviewStage, useExamplesStay } from "./preview-stage";

/**
 * What the workbench sends the phone preview. That is the component, the example's props, its
 * start, the mute, and whether the preview is in sight. Out of sight, it shows nothing.
 */
export type PreviewMessage = {
  type: "x-govuk-ui-preview";
  name: ComponentName;
  args: Record<string, unknown>;
  generation: number;
  muted: boolean;
  shown: boolean;
};

/** What the phone preview tells the workbench once it is ready for its props. */
export const PREVIEW_READY = "x-govuk-ui-preview-ready";

/** What the phone preview tells the workbench once it has drawn the component it was sent. */
export const PREVIEW_DRAWN = "x-govuk-ui-preview-drawn";

/**
 * A component's example alone, at /workbench/<name>?frame, for the workbench's phone preview. It is
 * a page of its own in a frame, so the window an example sees is the phone's. Rules that depend on
 * the window's width, such as a button taking the full width on a phone, apply as they would on a
 * phone. The workbench sends it the component and the playground's props, and it follows the theme
 * kept in this browser. The workbench loads it before it is shown, and keeps it, so it shows at
 * once. It moves from one component to the next as told, without loading again. It shows nothing
 * while it is out of sight, so nothing in it plays or moves.
 */
export function PreviewFrame() {
  const [, base, slug] = location.pathname.split("/");
  const start =
    base === "workbench" && componentNames.includes(slug as ComponentName)
      ? (slug as ComponentName)
      : null;
  useTheme({ storageKey: "x-govuk-ui-theme" });
  const [state, setState] = useState<PreviewMessage | null>(null);
  useEffect(() => {
    // Only the workbench that contains the frame, on this site, sends it props.
    const receive = (event: MessageEvent) => {
      if (event.origin !== location.origin || event.source !== window.parent) return;
      if ((event.data as PreviewMessage | null)?.type === "x-govuk-ui-preview")
        setState(event.data);
    };
    window.addEventListener("message", receive);
    window.parent.postMessage({ type: PREVIEW_READY }, location.origin);
    return () => window.removeEventListener("message", receive);
  }, []);
  const play = useSound({ muted: state?.muted ?? true });
  useExamplesStay();
  const name = state?.name ?? start;
  const shown = Boolean(name && state?.shown);
  // Once the example is in the page, the workbench can show the frame instead of its own preview,
  // and the frame is drawn with it. This does not wait for an animation frame, because Safari and
  // Firefox run few or none in a frame out of sight.
  useEffect(() => {
    if (shown) window.parent.postMessage({ type: PREVIEW_DRAWN, name }, location.origin);
  }, [shown, name]);
  if (!name || !state?.shown) return null;
  return (
    <SoundScope play={play}>
      <TooltipProvider>
        <main className="preview-alone">
          <ScrollArea orientation="both" label="Preview" className="preview-frame">
            <PreviewStage
              name={name}
              args={state.args}
              generation={state.generation}
              muted={state.muted}
            />
          </ScrollArea>
        </main>
      </TooltipProvider>
    </SoundScope>
  );
}
