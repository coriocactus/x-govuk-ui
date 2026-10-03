/**
 * Moves one shared indicator to the highlighted item, so the highlight slides between rows instead
 * of each row fading in and out on its own. The indicator appears in place when the list opens,
 * and hides when nothing is highlighted. It sits among the rows, in the container's scrolling
 * content, so it scrolls with them and the container clips it. The container must be the
 * indicator's positioned ancestor, and the element that scrolls, if the list scrolls. Returns a
 * function that stops tracking.
 *
 * Between rows in view, the indicator glides, as its stylesheet's transition says. At the list's
 * edge, the arrow keys scroll the list to bring the highlighted row into view. The indicator then
 * keeps its place on screen in the frame the list scrolls, while the rows pass beneath it. It
 * glides only as far as the row then is from it. Where the list scrolled a whole row, that is no
 * distance. Where it scrolled a row only partly in view, the indicator glides the rest of the way.
 * It never rides up with the rows and glides back, and it never jumps. A turn of the wheel leaves
 * it on its row, scrolling with it.
 *
 * A held key repeats faster than a glide ends, so a gliding indicator would trail its row and
 * catch up with a lurch as the list began to scroll. While a key is held, the indicator therefore
 * goes to each row at once, as a native menu's highlight does. A single press glides again.
 *
 * Each row is measured as it is, so rows of different heights get an indicator of their own
 * height.
 * @internal
 */
export function trackHighlight(
  container: HTMLElement | null,
  selectors: { indicator: string; item: string },
) {
  const indicator = container?.querySelector<HTMLElement>(selectors.indicator);
  if (!container || !indicator) return;
  // The row the indicator last went to, and how far the list was scrolled since.
  let placed: { item: HTMLElement; scroll: number } | null = null;
  let frame = 0;
  // Whether the last key down was a repeat of one held, as the browser marks it, until it is let
  // go.
  let held = false;
  const pressed = (event: KeyboardEvent) => {
    held = event.repeat;
  };
  const released = () => {
    held = false;
  };
  const highlighted = () => container.querySelector<HTMLElement>(selectors.item);
  // The indicator's place among the rows, in the scrolling content's own coordinates, so it scrolls
  // with them. It is measured from inside the container's border, where its positioned children
  // start. A popup scales as it grows into place, so a key pressed as it opens is measured part way
  // through. The distance on screen is scaled back to the layout's, because the indicator is placed
  // in layout coordinates.
  const topOf = (item: HTMLElement) => {
    const box = container.getBoundingClientRect();
    const scale = container.offsetHeight ? box.height / container.offsetHeight : 1;
    return (
      (item.getBoundingClientRect().top - box.top) / (scale || 1) -
      container.clientTop +
      container.scrollTop
    );
  };
  // Where it is drawn now, part way through a glide or not, in the same coordinates.
  const drawn = () => new DOMMatrixReadOnly(getComputedStyle(indicator).transform).m42;
  const put = (item: HTMLElement, glide: boolean) => {
    indicator.style.transition = glide ? "" : "none";
    indicator.style.transform = `translateY(${topOf(item)}px)`;
    indicator.style.height = `${item.offsetHeight}px`;
    indicator.style.opacity = "1";
    placed = { item, scroll: container.scrollTop };
  };
  const follow = (item: HTMLElement) => {
    if (!placed || held) return put(item, false);
    const moved = container.scrollTop - placed.scroll;
    // The list scrolled as the highlight moved. The indicator first keeps its place on screen, by
    // moving among the rows at once by as much as they scrolled. It then glides from there.
    if (moved !== 0 && item !== placed.item) {
      indicator.style.transition = "none";
      indicator.style.transform = `translateY(${drawn() + moved}px)`;
      // The kept place is drawn before the glide starts, so the glide starts from it.
      void indicator.offsetHeight;
    }
    put(item, true);
  };
  const place = () => {
    const item = highlighted();
    if (!item) {
      indicator.style.opacity = "0";
      placed = null;
      return;
    }
    follow(item);
  };
  const schedule = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(place);
  };
  // The browser sends scroll events before it runs animation frames. The indicator therefore keeps
  // its place in the frame the list scrolls in, and the frame scheduled for the highlight finds it
  // already gliding. A scroll that leaves the highlight where it was, as the wheel's does, moves
  // the indicator with its row, because it sits among the rows.
  const scrolled = () => {
    const item = highlighted();
    if (!item || !placed) return;
    if (item === placed.item) placed.scroll = container.scrollTop;
    else follow(item);
  };
  // A held key's row is placed as soon as it is highlighted, in the frame it scrolls in, so the two
  // are never a frame apart. Otherwise the place is found once a frame, however many changes come.
  const observer = new MutationObserver(() => {
    if (!held) return schedule();
    cancelAnimationFrame(frame);
    place();
  });
  observer.observe(container, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["data-highlighted"],
  });
  container.addEventListener("scroll", scrolled, { passive: true });
  // The keys may go to a field outside the list, as a combobox's do, so the whole page is listened
  // to.
  const page = container.ownerDocument;
  page.addEventListener("keydown", pressed, true);
  page.addEventListener("keyup", released, true);
  schedule();
  return () => {
    cancelAnimationFrame(frame);
    observer.disconnect();
    container.removeEventListener("scroll", scrolled);
    page.removeEventListener("keydown", pressed, true);
    page.removeEventListener("keyup", released, true);
  };
}
