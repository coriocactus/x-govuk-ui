"use client";

import { Dialog as Primitive } from "@base-ui/react/dialog";
import { AnimatePresence, motion } from "motion/react";
import {
  type ComponentPropsWithRef,
  type CSSProperties,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { MediaCredit } from "./card";
import { useMotionTiming } from "./motion";
import { useOverlaySound } from "./overlay";
import { useScopeSound } from "./sound-scope";

export type LightboxImage = {
  src: string;
  /** Describes the photo, for users who cannot see it. */
  alt: string;
  /**
   * The photo's own size, or any size with its proportions, so rows are laid out before it loads.
   */
  width: number;
  height: number;
  caption?: ReactNode;
  /** Who made the photo. It shows as a MediaCredit on the thumbnail, and beside the caption. */
  credit?: string;
};

export type LightboxProps = ComponentPropsWithRef<"ul"> & {
  images: readonly LightboxImage[];
  /** The height rows aim for, in pixels. Each row grows a little to fill the width exactly. */
  rowHeight?: number;
  /** The space between photos, in pixels. */
  gap?: number;
  /** Names the gallery and the viewer for screen readers. */
  label?: string;
};

type Rect = { left: number; top: number; width: number; height: number };

const centre = (rect: Rect) => [rect.left + rect.width / 2, rect.top + rect.height / 2] as const;

/**
 * Moves the photo between a thumbnail's place and its own, growing or shrinking on the way. At the
 * thumbnail's end it has the thumbnail's corners and no shadow, so the two match where they swap.
 */
function fly(photo: HTMLElement, thumbnail: Rect, toThumbnail: boolean) {
  const style = getComputedStyle(photo);
  // A photo closed part way through sliding in leaves from where it has reached. Its own place is
  // where it would come to rest.
  const slid = new DOMMatrixReadOnly(style.transform === "none" ? undefined : style.transform);
  const box = photo.getBoundingClientRect();
  const own = {
    left: box.left - slid.m41,
    top: box.top - slid.m42,
    width: box.width,
    height: box.height,
  };
  const [fromX, fromY] = centre(thumbnail);
  const [toX, toY] = centre(own);
  const scale = thumbnail.width / own.width;
  const frames = [
    {
      transform: `translate(${fromX - toX}px, ${fromY - toY}px) scale(${scale})`,
      // The corners are scaled with the photo, so they are set larger to land at the thumbnail's.
      borderRadius: `${6 / scale}px`,
      boxShadow: "0 0 0 transparent",
    },
    { transform: style.transform, borderRadius: style.borderRadius, boxShadow: style.boxShadow },
  ];
  return photo.animate(toThumbnail ? frames.reverse() : frames, {
    duration: toThumbnail ? 340 : 420,
    // It eases out to its place and back, without overshooting.
    easing: toThumbnail ? "cubic-bezier(0.4, 0, 0.2, 1)" : "cubic-bezier(0.22, 1, 0.36, 1)",
    // Back at the thumbnail, it stays there until the viewer has gone. Once it arrives at its own
    // place, it lets go, so it can slide away to the next photo.
    fill: toThumbnail ? "forwards" : "none",
  });
}

/**
 * Photos in justified rows, each row filling the width at the photos' own proportions, laid out by
 * CSS alone. Pressing a photo dips it a little. It then moves to the centre and grows, while the
 * others spread outwards and fade, and the page behind blurs under a light veil.
 *
 * The arrow keys, the buttons or a swipe move between photos, each sliding in from its side. The
 * gallery behind follows, so each photo's place stays in sight. A press anywhere outside the
 * photo, Escape or Close sends it back to its place as the blur clears and the others return. The
 * viewer is a Base UI Dialog, so focus stays inside it and returns to the photo it ends on.
 */
export function Lightbox({
  images,
  rowHeight = 180,
  gap = 8,
  label = "Photos",
  className = "",
  ...props
}: LightboxProps) {
  const [index, setIndex] = useState<number | null>(null);
  const [direction, setDirection] = useState(0);
  const [closing, setClosing] = useState(false);
  const thumbnails = useRef<(HTMLButtonElement | null)[]>([]);
  const returnTo = useRef<HTMLElement | null>(null);
  const opening = useRef(false);
  const swipe = useRef<number | null>(null);
  const shown = useRef<HTMLImageElement | null>(null);
  // How far a photo slides as the next takes its place. It is a whole screen's width, so each photo
  // is fully off the screen at the start and end of its slide, as in a carousel.
  const travel = () => window.innerWidth;
  const { reduced } = useMotionTiming();
  const sound = useOverlaySound();
  const play = useScopeSound();
  const count = images.length;
  const current = index === null ? null : images[index];

  const thumbnailRect = (at: number) => {
    const rect = thumbnails.current[at]?.getBoundingClientRect();
    // A thumbnail scrolled out of sight has nowhere to fly to.
    if (!rect || rect.bottom < 0 || rect.top > window.innerHeight) return null;
    return rect;
  };
  // Where a photo sits in the gallery, leaving out its spread.
  const place = (at: number) => {
    const item = thumbnails.current[at]?.parentElement;
    return item
      ? {
          left: item.offsetLeft,
          top: item.offsetTop,
          width: item.offsetWidth,
          height: item.offsetHeight,
        }
      : null;
  };
  // The other photos spread outwards from the one showing, further the further away they are.
  // Every place is read before any photo moves, so the page is laid out once, not once per photo.
  const spread = (at: number) => {
    const places = thumbnails.current.map((_, other) => place(other));
    const chosen = places[at];
    if (!chosen) return;
    const [fromX, fromY] = centre(chosen);
    thumbnails.current.forEach((thumbnail, other) => {
      const item = thumbnail?.parentElement;
      const own = places[other];
      if (!item || !own || other === at) return;
      const [x, y] = centre(own);
      const distance = Math.hypot(x - fromX, y - fromY) || 1;
      const push = Math.min(140, Math.max(48, distance * 0.35));
      item.style.setProperty("--x-govuk-ui-lightbox-dx", `${((x - fromX) / distance) * push}px`);
      item.style.setProperty("--x-govuk-ui-lightbox-dy", `${((y - fromY) / distance) * push}px`);
    });
  };
  const open = (at: number) => {
    const rect = thumbnailRect(at);
    spread(at);
    opening.current = !reduced && rect !== null;
    returnTo.current = thumbnails.current[at] ?? null;
    setClosing(false);
    setDirection(0);
    setIndex(at);
  };
  const move = (step: number) => {
    // While closing, the photo is on its way back to its place, and another must not take it.
    if (index === null || count < 2 || closing) return;
    const next = (index + step + count) % count;
    spread(next);
    setDirection(step);
    setIndex(next);
    returnTo.current = thumbnails.current[next] ?? null;
  };
  const close = () => {
    if (index === null || closing) return;
    // The photo's place comes into sight at once, if it is not already, so it has somewhere to go.
    thumbnails.current[index]?.scrollIntoView({ block: "nearest", behavior: "instant" });
    const rect = thumbnailRect(index);
    // The photo showing, not one still sliding away.
    const photo = shown.current;
    if (reduced || !rect || !photo) {
      setIndex(null);
      return;
    }
    // The photo goes back to its place as the blur clears and the others return, and the viewer
    // closes as it lands. It stays closing until it has gone.
    setClosing(true);
    fly(photo, rect, true).finished.then(() => setIndex(null));
  };

  // Behind the veil, the gallery follows the photos as they change, so each one's place is in sight
  // for it to go back to.
  useEffect(() => {
    if (index === null || direction === 0) return;
    thumbnails.current[index]?.scrollIntoView({
      block: "nearest",
      behavior: reduced ? "instant" : "smooth",
    });
  }, [index, direction, reduced]);

  // Focus moves to Close as it appears, where Base UI's focus would go, but at once. Base UI waits
  // for the next frame, and an arrow key pressed before then would go to the thumbnail, not the
  // viewer. Close appears once each time the viewer opens, so this never takes focus back from
  // another button.
  const focusClose = useCallback((button: HTMLButtonElement | null) => {
    button?.focus({ preventScroll: true });
  }, []);

  // The photos either side load ahead, so moving between them never waits.
  useEffect(() => {
    if (index === null) return;
    for (const step of [1, -1]) {
      const near = images[(index + step + count) % count];
      if (near) new Image().src = near.src;
    }
  }, [index, images, count]);

  return (
    <>
      <ul
        {...props}
        className={`x-govuk-ui-lightbox ${className}`.trim()}
        aria-label={label}
        style={{ gap } as CSSProperties}
        data-viewing={(index !== null && !closing) || undefined}
      >
        {images.map((image, at) => (
          <li
            key={image.src}
            className="x-govuk-ui-lightbox-item"
            style={
              {
                "--x-govuk-ui-lightbox-ratio": image.width / image.height,
                "--x-govuk-ui-lightbox-row": `${rowHeight}px`,
              } as CSSProperties
            }
          >
            <button
              type="button"
              ref={(element) => {
                thumbnails.current[at] = element;
              }}
              className="x-govuk-ui-lightbox-thumbnail"
              aria-haspopup="dialog"
              // The photo in the viewer takes its place while it is open.
              data-away={at === index || undefined}
              onClick={() => open(at)}
            >
              <img src={image.src} alt={image.alt} width={image.width} height={image.height} />
              {image.credit && <MediaCredit>{image.credit}</MediaCredit>}
            </button>
          </li>
        ))}
      </ul>
      <Primitive.Root
        open={index !== null}
        onOpenChange={(next, details) => {
          if (next) return;
          sound(false, details.reason);
          close();
        }}
      >
        <Primitive.Portal>
          <Primitive.Backdrop
            className="x-govuk-ui-lightbox-backdrop"
            data-closing={closing || undefined}
          />
          <Primitive.Popup
            className="x-govuk-ui-lightbox-viewer"
            data-closing={closing || undefined}
            finalFocus={returnTo}
            aria-label={label}
            onKeyDown={(event) => {
              if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
              // The viewer ignores a key that something in a caption has used, and a key held with
              // a modifier for the browser's own shortcuts.
              if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
              event.preventDefault();
              play("tick");
              move(event.key === "ArrowRight" ? 1 : -1);
            }}
            onPointerDown={(event) => {
              swipe.current = event.clientX;
            }}
            onClick={(event) => {
              // A press anywhere but the photo, its caption and the buttons closes the viewer.
              const target = event.target as Element;
              if (
                !target.closest(".x-govuk-ui-lightbox-photo, .x-govuk-ui-lightbox-caption, button")
              )
                close();
            }}
            onPointerUp={(event) => {
              const start = swipe.current;
              swipe.current = null;
              if (start === null || event.pointerType === "mouse") return;
              const distance = event.clientX - start;
              if (Math.abs(distance) > 50) move(distance < 0 ? 1 : -1);
            }}
          >
            <Primitive.Title className="x-govuk-ui-visually-hidden">{label}</Primitive.Title>
            <div className="x-govuk-ui-lightbox-bar">
              <p className="x-govuk-ui-lightbox-count" aria-live="polite">
                {index === null ? "" : `${index + 1} of ${count}`}
              </p>
              <Primitive.Close
                ref={focusClose}
                className="x-govuk-ui-lightbox-button"
                aria-label="Close"
              >
                <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                  <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" />
                </svg>
              </Primitive.Close>
            </div>
            <div className="x-govuk-ui-lightbox-stage">
              {count > 1 && (
                <button
                  type="button"
                  className="x-govuk-ui-lightbox-button"
                  aria-label="Previous photo"
                  onClick={() => move(-1)}
                >
                  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                    <path d="m15 5-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2" />
                  </svg>
                </button>
              )}
              <figure className="x-govuk-ui-lightbox-figure">
                {/* Photos move as in a carousel. The photo showing slides away to one side as the
                    next slides in from the other. Both share one place. */}
                <div className="x-govuk-ui-lightbox-frame">
                  <AnimatePresence initial={false} custom={direction}>
                    {current && (
                      <motion.img
                        key={`photo-${index}`}
                        ref={(photo: HTMLImageElement | null) => {
                          if (!photo) return;
                          shown.current = photo;
                          if (!opening.current || index === null) return;
                          opening.current = false;
                          const rect = thumbnailRect(index);
                          if (rect) fly(photo, rect, false);
                        }}
                        className="x-govuk-ui-lightbox-photo"
                        custom={direction}
                        variants={{
                          enter: (step: number) => ({ x: step * travel() }),
                          centre: { x: 0 },
                          leave: (step: number) => ({ x: -step * travel() }),
                        }}
                        initial="enter"
                        animate="centre"
                        exit="leave"
                        transition={
                          reduced ? { duration: 0 } : { duration: 0.42, ease: [0.22, 1, 0.36, 1] }
                        }
                        src={current.src}
                        alt={current.alt}
                        width={current.width}
                        height={current.height}
                        draggable={false}
                      />
                    )}
                  </AnimatePresence>
                </div>
                {(current?.caption || current?.credit) && (
                  <figcaption key={`caption-${index}`} className="x-govuk-ui-lightbox-caption">
                    {current.caption}
                    {current.credit && (
                      <span className="x-govuk-ui-lightbox-credit">Photo by {current.credit}</span>
                    )}
                  </figcaption>
                )}
              </figure>
              {count > 1 && (
                <button
                  type="button"
                  className="x-govuk-ui-lightbox-button"
                  aria-label="Next photo"
                  onClick={() => move(1)}
                >
                  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                    <path d="m9 5 7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2" />
                  </svg>
                </button>
              )}
            </div>
          </Primitive.Popup>
        </Primitive.Portal>
      </Primitive.Root>
    </>
  );
}
