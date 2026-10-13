import type { SyntheticEvent } from "react";

type Handler<E extends SyntheticEvent> = ((event: E) => void) | undefined;

/**
 * One handler made of a service's own and a part's own, for the same event. The service's runs
 * first. The part's then runs, unless the service's prevented the event's default. That is how a
 * service stops a part doing what it would, such as a carousel's arrow moving the slides.
 * @internal
 */
export function chain<E extends SyntheticEvent>(theirs: Handler<E>, ours: Handler<E>): Handler<E> {
  if (!theirs || !ours) return theirs ?? ours;
  return (event) => {
    theirs(event);
    if (!event.defaultPrevented) ours(event);
  };
}
