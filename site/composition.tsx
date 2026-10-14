import * as charts from "@x-govuk-ui/memetics";
import * as React from "react";
import {
  Component,
  type ComponentType,
  type ReactNode,
  Suspense,
  use,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import * as jsxRuntime from "react/jsx-runtime";
import * as library from "x-govuk-ui";
import { CodeBlock, CodeBlockCopy, Details, Stack, TextShimmer, useMotionTiming } from "x-govuk-ui";
import type { Composable } from "./composable";
import * as data from "./workspace-data";

/*
 * The views Piscine Assist composes. Each is a file of JSX in site/compositions, as an agent writes
 * one, built from the library's parts over the workspace's data. The page fetches the file and
 * shows it as it is written, then imports the same file as the server compiled it, and draws it.
 */

/** The modules a composition imports, by the names it imports them by, which the page gives it. */
export const modules: Record<Composable, unknown> = {
  react: React,
  "react/jsx-runtime": jsxRuntime,
  "x-govuk-ui": library,
  "@x-govuk-ui/memetics": charts,
  "../workspace-data": data,
};

/** A composition as the server compiles it, which takes its imports and gives its exports. */
export type Compiled = { default: (require: (name: string) => unknown) => { default?: unknown } };

/** The component a compiled composition exports, given the modules it imports. */
export function componentFrom(compiled: Compiled, name: string): ComponentType {
  const exports = compiled.default((imported) => {
    if (Object.hasOwn(modules, imported)) return modules[imported as Composable];
    throw new Error(`A composition cannot import ${imported}.`);
  });
  if (typeof exports.default !== "function")
    throw new Error(`The composition ${name} exports no component.`);
  return exports.default as ComponentType;
}

// Each composition's source and component are fetched once. A failure is kept too, so drawing
// again does not fetch again. Asking for the view again starts afresh, with `prefetch`. Each part
// keeps the promise it mounted with, so a fresh fetch never suspends a part already drawn.
const sources = new Map<string, Promise<string>>();
const components = new Map<string, Promise<ComponentType>>();
const once = <T,>(cache: Map<string, Promise<T>>, name: string, load: () => Promise<T>) => {
  let found = cache.get(name);
  if (!found) {
    found = load();
    cache.set(name, found);
  }
  return found;
};

/** A composition's JSX, as Piscine Assist wrote it. */
export const sourceOf = (name: string) =>
  once(sources, name, async () => {
    const response = await fetch(`/compositions/${name}.tsx`);
    if (!response.ok) throw new Error(`There is no composition called ${name}.`);
    return response.text();
  });

/**
 * A composition's component, from the site's own script for it. The name comes from the
 * workspace's own suggestions, never from what users type.
 */
export const componentOf = (name: string) =>
  once(components, name, async () =>
    componentFrom((await import(`${location.origin}/compositions/${name}.js`)) as Compiled, name),
  );

/**
 * Starts fetching a composition afresh, so it is ready by the time it is written. A browser keeps a
 * script that failed to load as failed, so only the source is fetched again after a failure.
 */
export function prefetch(name: string) {
  sources.delete(name);
  components.delete(name);
  sourceOf(name).catch(() => {});
  componentOf(name).catch(() => {});
}

/** The parts a composition imports from the library and its extensions, in order. */
export const partsOf = (source: string) =>
  [...source.matchAll(/import\s*\{([^}]*)\}\s*from\s*"(?:x-govuk-ui|@x-govuk-ui\/[a-z]+)"/g)]
    .flatMap(([, names]) => (names ?? "").split(","))
    .map((name) => name.trim())
    .filter((name) => /^[A-Z]\w*$/.test(name))
    .sort();

/** Shows what is in it, or what it is given for an error from what is in it. */
class Boundary extends Component<
  { fallback: (error: Error) => ReactNode; children: ReactNode },
  { error?: Error }
> {
  state: { error?: Error } = {};
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    return this.state.error ? this.props.fallback(this.state.error) : this.props.children;
  }
}

/** How many characters of JSX Piscine Assist writes each millisecond. */
const RATE = 1.6;

/**
 * The source as written so far, at RATE from `started`, a time on `performance.now()`'s clock.
 * Drawn again from that time, such as after its tile moves, it carries on where it was. With
 * reduced motion, it is written at once.
 */
function useWritten(source: string, started: number) {
  const { reduced } = useMotionTiming();
  const [now, setNow] = useState(() => performance.now());
  const length = reduced
    ? source.length
    : Math.min(source.length, Math.floor((now - started) * RATE));
  const done = length >= source.length;
  useEffect(() => {
    if (done) return;
    let frame = requestAnimationFrame(function tick(time) {
      setNow(time);
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [done]);
  return source.slice(0, length);
}

/** The tile's scrolling viewport around an element. */
const tileOf = (element: HTMLElement | null) =>
  element?.closest<HTMLElement>(".x-govuk-ui-scroll-area-viewport");

/** How far a view has come, which its status says. */
type Stage = "writing" | "drawing" | "drawn";

const stages: Record<Stage, string> = {
  writing: "Piscine Assist is writing this view",
  drawing: "Piscine Assist is drawing this view",
  drawn: "Piscine Assist has drawn this view.",
};

/**
 * A view Piscine Assist composes, for a tile. Its JSX is written into the tile, and the view it
 * draws then takes its place, with the JSX beneath it in a Details. One status says how far it has
 * come, so screen readers hear each change, and it is hidden once the view is drawn. An error in
 * fetching or drawing the view is shown in its place.
 */
export function ComposedView({ name, started }: { name: string; started: number }) {
  const [stage, setStage] = useState<Stage>("writing");
  return (
    <Boundary
      fallback={(error) => (
        <p role="alert" className="workspace-composed-error">
          {`Piscine Assist could not draw this view. ${error.message}`}
        </p>
      )}
    >
      <p role="status" className="workspace-composed-status" data-stage={stage}>
        {stage === "drawn" ? stages.drawn : <TextShimmer>{stages[stage]}</TextShimmer>}
      </p>
      <Suspense fallback={null}>
        <Written name={name} started={started} onStage={setStage} />
      </Suspense>
    </Boundary>
  );
}

function Written({
  name,
  started,
  onStage,
}: {
  name: string;
  started: number;
  onStage: (stage: Stage) => void;
}) {
  const [loading] = useState(() => sourceOf(name));
  const source = use(loading);
  const written = useWritten(source, started);
  const done = written.length === source.length;
  const box = useRef<HTMLDivElement>(null);
  // While it is written, the tile follows the newest line, unless users have scrolled away from
  // the end. The layout is read first, then the scroll is set.
  useLayoutEffect(() => {
    const tile = tileOf(box.current);
    if (!tile || !written) return;
    const end = tile.scrollHeight - tile.clientHeight;
    if (end - tile.scrollTop < 120) tile.scrollTop = end;
  }, [written]);
  // The view starts at its top, not where the JSX's end left the tile.
  useLayoutEffect(() => {
    if (!done) return;
    onStage("drawing");
    const tile = tileOf(box.current);
    if (tile) tile.scrollTop = 0;
  }, [done, onStage]);
  return (
    <div ref={box}>
      {done ? (
        <Stack>
          <Suspense fallback={null}>
            <Drawn name={name} onStage={onStage} />
          </Suspense>
          <Details summary="The JSX Piscine Assist wrote">
            <CodeBlock code={source} language="tsx" filename={`${name}.tsx`} wrap>
              <CodeBlockCopy />
            </CodeBlock>
          </Details>
        </Stack>
      ) : (
        <CodeBlock code={written} language="tsx" filename={`${name}.tsx`} wrap />
      )}
    </div>
  );
}

function Drawn({ name, onStage }: { name: string; onStage: (stage: Stage) => void }) {
  const [loading] = useState(() => componentOf(name));
  const Composed = use(loading);
  useEffect(() => onStage("drawn"), [onStage]);
  return (
    <div className="workspace-composed-view">
      <Composed />
    </div>
  );
}

const list = new Intl.ListFormat("en-GB", { type: "conjunction" });

/** The parts a composition is built from, as a sentence, once its JSX has arrived. */
export function ComposedParts({ name }: { name: string }) {
  return (
    <Boundary fallback={() => null}>
      <Suspense fallback={null}>
        <Parts name={name} />
      </Suspense>
    </Boundary>
  );
}

function Parts({ name }: { name: string }) {
  const [loading] = useState(() => sourceOf(name));
  const parts = partsOf(use(loading));
  return <p className="workspace-assist-parts">{`Composed from ${list.format(parts)}.`}</p>;
}
