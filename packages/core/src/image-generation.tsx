"use client";

import {
  type ComponentPropsWithRef,
  type CSSProperties,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { Mosaic } from "./image-mosaic";
import { useMotionTiming } from "./motion";
import { TextShimmer } from "./text-shimmer";

export type ImageGenerationProps = ComponentPropsWithRef<"figure"> & {
  /**
   * The finished image. Leave it out while the image is being made, and give it once it arrives. It
   * then forms out of the mosaic. Taking it away again, to make another, breaks the image back into
   * the mosaic.
   */
  src?: string;
  /**
   * A rough early version of the image, for services that send one while they work, such as
   * OpenAI's partial images. The mosaic takes its colours from it. Most services send only the
   * finished image.
   */
  preview?: string;
  /** Describes the finished image. */
  alt: string;
  /** The image's size, or any size with its proportions. */
  width: number;
  height: number;
  /**
   * How far along the work is, from 0 to 1, for services that report it. A bar and the share done
   * show with the label. Leave it out when the service reports only that it is done.
   */
  progress?: number;
  /** What is being made, such as "Making the poster". */
  label?: ReactNode;
};

type Phase = "making" | "forming" | "made" | "breaking";

/** Loads an image once, and keeps it for the mosaic to read. */
function load(src: string, cache: Map<string, Promise<HTMLImageElement>>) {
  let image = cache.get(src);
  if (!image) {
    image = new Promise((resolve, reject) => {
      const picture = new Image();
      picture.decoding = "async";
      picture.onload = () =>
        picture.decode().then(
          () => resolve(picture),
          () => resolve(picture),
        );
      picture.onerror = reject;
      picture.src = src;
    });
    cache.set(src, image);
  }
  return image;
}

/**
 * An image being made by an agent. Most services report only when the image is done. Until then, a
 * mosaic of small cells fills the frame, with ridges of brand tint flowing through it and cells
 * popping now and then. If the service sends a rough preview, the mosaic takes its colours.
 *
 * When the image arrives, it forms out of the cells in a sweep from the top left, with the success
 * sound. Making another breaks it back into cells, which keep its colours while the next is made.
 * A band at the foot shows the label in Text shimmer. If the service reports progress, the band
 * also shows a bar and the share done. Screen readers hear a progress bar while the work goes on,
 * and the image's description once it is made.
 */
export function ImageGeneration({
  src,
  preview,
  alt,
  width,
  height,
  progress,
  label = "Creating image",
  className = "",
  ...props
}: ImageGenerationProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const tones = useRef<HTMLSpanElement>(null);
  const mosaic = useRef<Mosaic | null>(null);
  const images = useRef(new Map<string, Promise<HTMLImageElement>>());
  const { reduced } = useMotionTiming();
  // An image given from the start is shown as it is, such as one made earlier in a conversation.
  const [phase, setPhase] = useState<Phase>(src ? "made" : "making");
  // The image in the frame, beneath any cells.
  const [shown, setShown] = useState(src);
  const share = progress === undefined ? null : Math.max(0, Math.min(1, progress));

  // The mosaic lasts as long as the frame, and starts again if motion preferences change.
  const current = useRef(phase);
  current.current = phase;
  useEffect(() => {
    if (!canvas.current || !tones.current) return;
    const drawing = new Mosaic(canvas.current, tones.current, reduced, current.current === "made");
    mosaic.current = drawing;
    return () => {
      drawing.destroy();
      mosaic.current = null;
    };
  }, [reduced]);

  // An image arriving forms out of the cells.
  useEffect(() => {
    if (!src || src === shown) return;
    let live = true;
    load(src, images.current).then(
      (image) => {
        if (!live) return;
        setShown(src);
        setPhase("forming");
        mosaic.current?.form(image, () => setPhase("made"));
      },
      () => {},
    );
    return () => {
      live = false;
    };
  }, [src, shown]);

  // Taking the image away breaks it into cells, which keep its colours while the next is made.
  useEffect(() => {
    if (src || !shown) return;
    let live = true;
    setPhase("breaking");
    load(shown, images.current).then(
      (image) => {
        if (!live) return;
        mosaic.current?.break(image, () => {
          setShown(undefined);
          setPhase("making");
        });
      },
      () => {},
    );
    return () => {
      live = false;
    };
  }, [src, shown]);

  // A rough preview colours the mosaic while the image is made.
  useEffect(() => {
    if (phase === "made") {
      mosaic.current?.rest();
      return;
    }
    if (!preview || phase !== "making") return;
    let live = true;
    load(preview, images.current).then(
      (image) => {
        if (live) mosaic.current?.tintWith(image);
      },
      () => {},
    );
    return () => {
      live = false;
    };
  }, [preview, phase]);

  const made = phase === "made";
  return (
    <figure
      {...props}
      className={`x-govuk-ui-image-generation ${className}`.trim()}
      style={{ aspectRatio: `${width} / ${height}` } as CSSProperties}
      data-phase={phase}
      // SoundScope plays the success sound as an image forms whole.
      data-success={made || undefined}
      aria-busy={!made}
    >
      {shown && <img className="x-govuk-ui-image-generation-image" src={shown} alt={alt} />}
      {/* A canvas with nothing inside it says nothing to screen readers. */}
      <canvas ref={canvas} className="x-govuk-ui-image-generation-canvas" />
      {/* The mosaic's colours, set by the theme in CSS. */}
      <span ref={tones} className="x-govuk-ui-image-generation-tones" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
        <span />
      </span>
      {!made && (
        <figcaption className="x-govuk-ui-image-generation-status">
          <span
            role="progressbar"
            aria-valuemin={share === null ? undefined : 0}
            aria-valuemax={share === null ? undefined : 100}
            aria-valuenow={share === null ? undefined : Math.round(share * 100)}
            aria-label={typeof label === "string" ? label : "Creating image"}
            className="x-govuk-ui-image-generation-meter"
            data-indeterminate={share === null || undefined}
          >
            {share !== null && <span style={{ width: `${share * 100}%` }} />}
          </span>
          <TextShimmer>{label}</TextShimmer>
          {share !== null && (
            <span className="x-govuk-ui-image-generation-share">{Math.round(share * 100)}%</span>
          )}
        </figcaption>
      )}
    </figure>
  );
}
