/**
 * The answers a form of steps sends with only the steps that apply, as its FormData's entries. The
 * page may not yet show which steps apply, such as just after a change, so each step is set as it
 * applies while the answers are read, and set back in the same task, so nothing is drawn between.
 *
 * A step that applies but is still disabled is opened. A step that applies no longer, even the one
 * on show, has its controls' names taken off. Disabling that step instead would take the focus
 * from a field in use in Chrome, and a `form` that names no form leaves a control without its form
 * in Firefox once it is taken off. Steps that never apply together can therefore ask under one
 * name.
 *
 * It uses only the page, and nothing else in this file, so a browser test runs it as it is.
 * @internal
 */
export function stepAnswers(
  form: HTMLFormElement,
  applies: readonly number[],
): [string, FormDataEntryValue][] {
  const steps = [...form.querySelectorAll<HTMLFieldSetElement>("fieldset[data-step]")];
  const appliesTo = (fieldset: HTMLFieldSetElement) =>
    applies.includes(Number(fieldset.dataset.step));
  const opened = steps.filter((fieldset) => fieldset.disabled && appliesTo(fieldset));
  const leftOut = steps
    .filter((fieldset) => !fieldset.disabled && !appliesTo(fieldset))
    .flatMap((fieldset) => [...fieldset.elements]);
  const names = leftOut.map((control) => control.getAttribute("name"));
  try {
    for (const fieldset of opened) fieldset.disabled = false;
    for (const control of leftOut) control.removeAttribute("name");
    return [...new FormData(form).entries()];
  } finally {
    for (const fieldset of opened) fieldset.disabled = true;
    leftOut.forEach((control, place) => {
      const name = names[place];
      if (name !== null && name !== undefined) control.setAttribute("name", name);
    });
  }
}
