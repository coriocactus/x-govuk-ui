import type { SyntheticEvent } from "react";

type Handler<E extends SyntheticEvent> = ((event: E) => void) | undefined;

/**
 * One handler made of a service's own and a part's own, for the same event. The service's runs
 * first. The part's then runs, unless the service's prevented the event's default. That is how a
 * service stops a part doing what it would, such as a carousel's arrow moving the slides.
 *
 * React marks an event as prevented when `preventDefault` is called, even an event the browser
 * cannot cancel, such as a scroll or focus. Preventing any event therefore stops the part's own
 * handler. Where preventing an event already means something else, as it does for dropping files,
 * use `both`.
 * @internal
 */
export function chain<E extends SyntheticEvent>(theirs: Handler<E>, ours: Handler<E>): Handler<E> {
  if (!theirs || !ours) return theirs ?? ours;
  return (event) => {
    theirs(event);
    if (!event.defaultPrevented) ours(event);
  };
}

/**
 * One handler that calls both, the first first, whatever the first does. A part uses it where a
 * service prevents the default for a reason of its own, as `dragover` and `drop` are prevented to
 * take files, so preventing it cannot mean "stop the part".
 * @internal
 */
export function both<E extends SyntheticEvent>(first: Handler<E>, second: Handler<E>): Handler<E> {
  if (!first || !second) return first ?? second;
  return (event) => {
    first(event);
    second(event);
  };
}
