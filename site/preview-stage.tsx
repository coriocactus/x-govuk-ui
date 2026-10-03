import {
  type ComponentType,
  type CSSProperties,
  type ReactNode,
  type Ref,
  useEffect,
  useLayoutEffect,
  useRef,
} from "react";
import { WidthContainer } from "x-govuk-ui";
import { useMergedRef } from "../packages/core/src/refs";
import { type ComponentName, catalogue, type Placement } from "./catalogue";
import { examples } from "./examples";

type PreviewStageProps = {
  /** The component whose example shows, or none, for the workbench's own page. */
  name: ComponentName | null;
  /** The example's props, from the playground. */
  args: Record<string, unknown>;
  /** A new number starts the example again, as Reset preview does. */
  generation: number;
  /** The workbench's mute, which silences the Sound example too. */
  muted: boolean;
  /** What shows where there is no example, which is the workbench's own page. */
  children?: ReactNode;
  ref?: Ref<HTMLDivElement>;
};

/**
 * Where an example shows, in the workbench's preview or alone in the phone preview's frame. It
 * places the example as its catalogue entry says. A pinned example starts in the middle of the
 * preview, as every example does, unless that would leave too little space for it to grow to its
 * `grows` height. It then starts only as far off the middle as that needs. A top-pinned example
 * keeps its top still as it grows, so feedback never moves it. A bottom-pinned example keeps its
 * foot still, so the buttons in a card's footer stay under the pointer. Its place is worked out
 * again only when it starts or the preview resizes.
 */
export function PreviewStage({ name, args, generation, muted, children, ref }: PreviewStageProps) {
  const component = name ? catalogue[name] : null;
  const stage = useRef<HTMLDivElement>(null);
  const merged = useMergedRef(stage, ref);
  // Where the example sits, which can depend on its settings.
  const placed: Placement = component ? { ...component, ...component.placement?.(args) } : {};
  const { anchor, grows, roomAbove } = placed;
  // biome-ignore lint/correctness/useExhaustiveDependencies: A new example or generation starts again.
  useLayoutEffect(() => {
    const element = stage.current;
    // The stage sits in the preview's Scroll area, whose viewport is the preview's visible height.
    const frame = element?.closest<HTMLElement>(".x-govuk-ui-scroll-area-viewport");
    const example = element?.firstElementChild;
    if (!element || !frame || !(example instanceof HTMLElement)) return;
    if (anchor === "bottom") {
      const settle = () => {
        // Centred, unless that would leave too little space above for the example to grow into,
        // and with space beneath for its status message, if it has one.
        const above = Number.parseFloat(getComputedStyle(element).paddingTop) || 0;
        const tallest = Math.max(example.offsetHeight + (roomAbove ?? 0), grows ?? 0);
        const centred = (frame.clientHeight - example.offsetHeight) / 2;
        const room = frame.clientHeight - tallest - above;
        const message = example.querySelector(".preview-message") ? 72 : 24;
        element.style.setProperty(
          "--anchor-bottom",
          `${Math.round(Math.max(message, Math.min(centred, room)))}px`,
        );
      };
      settle();
      const observer = new ResizeObserver(settle);
      observer.observe(frame);
      return () => {
        observer.disconnect();
        element.style.removeProperty("--anchor-bottom");
      };
    }
    if (anchor !== "top") return;
    const settle = () => {
      // Centred, unless that would leave too little space beneath for the example to grow into.
      const below = Number.parseFloat(getComputedStyle(element).paddingBottom) || 0;
      const grown = Math.max(example.offsetHeight, grows ?? 0);
      const centred = (frame.clientHeight - example.offsetHeight) / 2;
      const room = frame.clientHeight - grown - below;
      element.style.setProperty(
        "--anchor-top",
        `${Math.round(Math.max(24, Math.min(centred, room)))}px`,
      );
    };
    settle();
    const observer = new ResizeObserver(settle);
    observer.observe(frame);
    return () => {
      observer.disconnect();
      element.style.removeProperty("--anchor-top");
    };
  }, [name, generation, anchor, grows, roomAbove]);

  // Each example takes the props its catalogue entry lists.
  const Example = name ? (examples[name] as ComponentType<Record<string, unknown>>) : null;
  return (
    <div
      ref={merged}
      className="preview-stage"
      data-component={name ?? "landing"}
      data-anchor={placed.anchor}
      data-sides={placed.sides}
      // Space kept above, for something that opens there, such as an error summary.
      style={
        placed.roomAbove
          ? ({ "--room-above": `${placed.roomAbove}px` } as CSSProperties)
          : undefined
      }
      // Focus can rest here, unseen, before the example's first control.
      tabIndex={-1}
    >
      {/* The stage already has space at its sides, so the container needs none. */}
      {Example ? (
        <WidthContainer
          width={placed.width ?? 390}
          gutters={false}
          className={`preview-example preview-example--${name}`}
          data-fit={placed.fit || undefined}
        >
          <Example
            key={`${name}:${generation}`}
            {...args}
            // The workbench's mute button silences the sound example too.
            muted={Boolean(args.muted) || muted}
          />
        </WidthContainer>
      ) : (
        children
      )}
    </div>
  );
}

/**
 * Examples never leave the workbench. A link to another site, such as the footer's licence or a
 * citation's source, does nothing when pressed, by click, middle click or Enter.
 */
export function useExamplesStay() {
  useEffect(() => {
    const stay = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest?.(".preview-stage a[href]");
      if (link instanceof HTMLAnchorElement && link.origin !== location.origin) {
        event.preventDefault();
      }
    };
    document.addEventListener("click", stay, true);
    document.addEventListener("auxclick", stay, true);
    return () => {
      document.removeEventListener("click", stay, true);
      document.removeEventListener("auxclick", stay, true);
    };
  }, []);
}
