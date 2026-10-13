import { expect, test } from "../fixtures";

test("the error summary takes focus and its links focus their fields", async ({ frame, open }) => {
  await open("error-summary");
  // The page opens as the server returns it, with the summary taking focus.
  const summary = frame.locator(".x-govuk-ui-error-summary");
  await expect(summary).toBeFocused();
  // Fixing an answer removes its line, and sending again focuses the summary again.
  await frame.getByRole("textbox", { name: "Email address" }).fill("name@example.com");
  await expect(frame.getByRole("link", { name: /Enter an email address/ })).toHaveCount(0);
  await frame.getByRole("textbox", { name: "Email address" }).fill("");
  await frame.getByRole("button", { name: "Continue" }).click();
  await expect(summary).toBeFocused();
  await frame.getByRole("link", { name: /Enter an email address/ }).click();
  await expect(frame.getByRole("textbox", { name: "Email address" })).toBeFocused();
  await frame.getByRole("link", { name: /Select how/ }).click();
  await expect(frame.getByRole("radio", { name: "Email" })).toBeFocused();
});

test("a form checks every answer when sent, and its date can come from the calendar", async ({
  page,
  frame,
  open,
}) => {
  await open("form");
  await frame.getByRole("button", { name: "Continue" }).click();
  // The summary opens above the fields, takes focus and lists the problems in the fields' order.
  const summary = frame.locator(".x-govuk-ui-error-summary");
  await expect(summary).toBeFocused();
  await expect(page).toHaveTitle(/^Error: Form/);
  await expect(summary.getByRole("link")).toHaveText([
    "Enter an email address in the correct format, like name@example.com",
    "Enter your date of birth",
    "Select how long you need your licence for",
  ]);
  const email = frame.getByRole("textbox", { name: "Email address" });
  await expect(email).toHaveAttribute("aria-invalid", "true");
  // Fixing an answer clears its message and its line at once.
  await email.fill("someone@example.com");
  await expect(email).not.toHaveAttribute("aria-invalid");
  await expect(summary.getByRole("link")).toHaveCount(2);
  // A date that changes but is still wrong keeps its message until the form is sent again.
  await frame.getByRole("textbox", { name: "Day" }).fill("31");
  await expect(summary.getByRole("link", { name: "Enter your date of birth" })).toBeVisible();
  // Each line goes to its field.
  await summary.getByRole("link", { name: "Select how long you need your licence for" }).click();
  await expect(frame.getByRole("radio", { name: "1 day" })).toBeFocused();
  await frame.getByRole("radio", { name: "8 days" }).check();
  await frame.getByRole("textbox", { name: "Month" }).fill("2");
  await frame.getByRole("textbox", { name: "Year" }).fill("1990");
  await frame.getByRole("button", { name: "Continue" }).click();
  await expect(summary.getByRole("link")).toHaveText(["Date of birth must be a real date"]);
  // The date of birth can be chosen from the calendar, whose year is a Select.
  await frame.getByRole("button", { name: "Choose the date from a calendar" }).click();
  await page.getByRole("combobox", { name: "Year" }).click();
  await page.getByRole("option", { name: "1985" }).click();
  await page.getByRole("combobox", { name: "Month" }).click();
  await page.getByRole("option", { name: "March" }).click();
  // The arrows either side of the Selects still turn the month.
  await page.getByRole("button", { name: "Next month" }).click();
  await expect(page.getByRole("combobox", { name: "Month" })).toHaveText(/April/);
  await page.getByRole("button", { name: "Previous month" }).click();
  await expect(page.getByRole("combobox", { name: "Month" })).toHaveText(/March/);
  await page.getByRole("button", { name: /27 March 1985/ }).click();
  await expect(frame.getByRole("textbox", { name: "Day" })).toHaveValue("27");
  await frame.getByRole("button", { name: "Continue" }).click();
  await expect(summary).toBeHidden();
  await expect(page).toHaveTitle(/^Form/);
  await expect(frame.getByRole("status")).toHaveText("Your answers are ready. Nothing was sent.");
});

test("a form in stages saves as it goes, shows server errors, reveals follow-ups and thanks people", async ({
  page,
  frame,
  open,
  playground,
}) => {
  await open("form");
  // An example's setting shows only once what it needs is set. A prop that needs another says so,
  // and is disabled until it is set.
  const back = playground.switch("back");
  await expect(back).toHaveCount(0);
  await playground.set("example", /In stages/);
  await expect(back).toBeEnabled();
  await expect(playground.switch("titlePrefix")).toBeDisabled();
  await expect(page.locator(".prop-needs[data-unmet]").first()).toContainText(
    "Only with example set to One page",
  );
  await playground.set("fail", true);
  const survey = frame.locator(".x-govuk-ui-form-steps");
  await expect(survey).toHaveAttribute("data-layout", "card");
  // In a card, continuing without a rating shows the message under the question, and focus goes
  // to its first answer.
  const message = survey.locator(".x-govuk-ui-error");
  await frame.getByRole("button", { name: "Submit and continue" }).click();
  await expect(message).toHaveText("Error: Select a rating to continue");
  await expect(frame.getByRole("radio", { name: "Very satisfied" })).toBeFocused();
  await expect(frame.locator(".x-govuk-ui-error-summary")).toHaveCount(0);
  // The rating is saved as soon as it is given. A save that fails says so, and the step stays.
  await frame.getByRole("radio", { name: "Satisfied", exact: true }).check();
  await frame.getByRole("button", { name: "Submit and continue" }).click();
  await expect(message).toContainText("We could not record your rating");
  await frame.getByRole("button", { name: "Submit and continue" }).click();
  // The next step comes, with focus on its first answer, and a yes opens a follow-up question.
  const yes = frame.getByRole("radio", { name: "Yes" });
  await expect(yes).toBeFocused();
  await yes.check();
  await frame.getByLabel("Tell us about the technical issues").fill("The page froze once.");
  await frame.getByLabel("How could we improve this service?").fill("Faster search.");
  // The card grows as the follow-up question opens, and moves Send feedback down. Playwright can
  // find the button still for two frames while it moves, and press where it was. The test waits
  // until nothing in the card moves. The button's spinner stays paused while it is not loading.
  await expect
    .poll(() =>
      survey.evaluate(
        (element) =>
          element
            .getAnimations({ subtree: true })
            .filter((animation) => animation.playState === "running").length +
          element.querySelectorAll("[data-moving]").length,
      ),
    )
    .toBe(0);
  await frame.getByRole("button", { name: "Send feedback" }).click();
  await expect(frame.getByText("Thank you for your feedback.")).toBeVisible();
  await expect(survey).toHaveAttribute("data-done", "true");

  // On a page, with Back and progress, it ends with Check your answers, where Change asks a
  // question again and comes back.
  await frame.getByRole("button", { name: "Start again" }).click();
  await playground.set("layout", "Page");
  for (const name of ["back", "progress", "checkAnswers"]) await playground.set(name, true);
  await playground.set("fail", false);
  await expect(frame.getByText("Question 1 of 2")).toBeVisible();
  await frame.getByRole("radio", { name: "Dissatisfied", exact: true }).check();
  await frame.getByRole("button", { name: "Submit and continue" }).click();
  await expect(frame.getByText("Question 2 of 2")).toBeVisible();
  // Back goes to the step before, with its answer kept.
  await frame.getByRole("link", { name: "Back" }).click();
  await expect(frame.getByRole("radio", { name: "Dissatisfied", exact: true })).toBeChecked();
  await frame.getByRole("button", { name: "Submit and continue" }).click();
  await frame.getByRole("radio", { name: "No", exact: true }).check();
  await frame.getByRole("button", { name: "Continue" }).click();
  const review = frame.locator(".x-govuk-ui-form-steps-summary");
  await expect(frame.getByRole("heading", { name: "Check your answers" })).toBeFocused();
  await expect(review.locator(".x-govuk-ui-summary-list-value")).toHaveText([
    "Dissatisfied",
    "No",
    "Not answered",
  ]);
  await review
    .getByRole("button", { name: /Change your answer to Overall, how satisfied/ })
    .click();
  await expect(frame.getByRole("radio", { name: "Dissatisfied", exact: true })).toBeFocused();
  await frame.getByRole("radio", { name: "Very satisfied" }).check();
  await frame.getByRole("button", { name: "Submit and continue" }).click();
  await expect(review.locator(".x-govuk-ui-summary-list-value").first()).toHaveText(
    "Very satisfied",
  );

  // Remembered, it continues from the same step with its answers after the page loads again.
  await frame.getByRole("button", { name: "Start again" }).click();
  await playground.set("remember", true);
  await frame.getByRole("radio", { name: "Neither satisfied nor dissatisfied" }).check();
  await frame.getByRole("button", { name: "Submit and continue" }).click();
  // The step's first answer takes focus a frame after the step comes, so typing waits for it, as
  // a person's would. Typing before then would go to the answer that takes focus.
  await expect(frame.getByRole("radio", { name: "Yes" })).toBeFocused();
  await frame.getByLabel("How could we improve this service?").fill("Keep it short.");
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("x-govuk-ui-example-feedback") ?? ""))
    .toContain("Keep it short.");
  // The playground starts again after a reload, so the survey is chosen again.
  await page.reload();
  await playground.set("example", /In stages/);
  for (const name of ["back", "remember"]) await playground.set(name, true);
  // The step it continues from is the service's own component, which shows once the answers are
  // restored after the page loads.
  await expect(frame.getByLabel("How could we improve this service?")).toBeVisible();
  await expect(frame.getByLabel("How could we improve this service?")).toHaveValue(
    "Keep it short.",
  );
  // In the card, Back is a button in its footer.
  await frame.getByRole("button", { name: "Back", exact: true }).click();
  await expect(
    frame.getByRole("radio", { name: "Neither satisfied nor dissatisfied" }),
  ).toBeChecked();
});

test("check your answers lists every kind of field, links an error to an answer in a wrapper, and comes back after a reload", async ({
  page,
  frame,
  open,
  playground,
}) => {
  await open("form");
  const choose = async () => {
    await playground.set("example", /In stages/);
    await playground.set("layout", "Page");
    for (const name of ["checkAnswers", "history", "moreKinds", "remember"])
      await playground.set(name, true);
  };
  await choose();
  await frame.getByRole("radio", { name: "Satisfied", exact: true }).check();
  await frame.getByRole("button", { name: "Submit and continue" }).click();
  await frame.getByRole("radio", { name: "No", exact: true }).check();
  await frame.getByRole("button", { name: "Continue" }).click();
  // The step's radios come from a component of the survey's own, so none has the group's id. The
  // error summary links to the first answer on the page all the same.
  await expect(frame.getByRole("heading", { name: "About your visit" })).toBeFocused();
  await frame.getByRole("button", { name: "Continue" }).click();
  const summary = frame.locator(".x-govuk-ui-error-summary");
  await expect(summary).toBeFocused();
  await summary.getByRole("link", { name: "Select how you found this service" }).click();
  await expect(frame.getByRole("radio", { name: "A search engine" })).toBeFocused();
  await frame.getByRole("radio", { name: "GOV.UK" }).check();
  await frame.getByRole("button", { name: "Computer" }).click();
  await frame.getByRole("slider", { name: "How easy was it, from 1 to 5?" }).press("ArrowRight");
  // The select's options come from a component of the survey's own too.
  await frame.getByRole("combobox", { name: "Which part did you use most?" }).click();
  await page.getByRole("option", { name: "Reporting a catch" }).click();
  // The switch starts on. Turned off, it sends nothing, and comes back off all the same.
  const research = frame.getByRole("switch", { name: "Take part in research about this service" });
  await expect(research).toBeChecked();
  await research.uncheck();
  await frame.getByRole("button", { name: "Continue" }).click();
  // Each field gives its answer as it shows it.
  const review = frame.locator(".x-govuk-ui-form-steps-summary");
  const answers = [
    "Satisfied",
    "No",
    "Not answered",
    "GOV.UK",
    "Computer",
    "4",
    "Reporting a catch",
    "Off",
  ];
  await expect(review.locator(".x-govuk-ui-summary-list-value")).toHaveText(answers);
  await expect(review.locator(".x-govuk-ui-summary-list-key")).toContainText([
    "What did you use?",
    "How easy was it, from 1 to 5?",
    "Take part in research about this service",
  ]);
  // Reloaded on Check your answers, the survey comes back to it, with every answer listed, the
  // select's by its label and the switch still off. The playground starts again after a reload, so
  // the survey is chosen again.
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("x-govuk-ui-example-feedback") ?? ""))
    .toContain('"at":4');
  await page.reload();
  await choose();
  await expect(review.locator(".x-govuk-ui-summary-list-value")).toHaveText(answers);
  // The browser's Back goes to the last question, and Forward comes back to Check your answers.
  await page.goBack();
  await expect(frame.getByRole("heading", { name: "About your visit" })).toBeVisible();
  await page.goForward();
  await expect(review.locator(".x-govuk-ui-summary-list-value")).toHaveText(answers);
  // While the answers are sent, Change does nothing, so nothing keeps them once they are sent. The
  // two presses come one after the other, before the answers are sent.
  await frame.evaluate((element) => {
    const buttons = [...element.querySelectorAll<HTMLButtonElement>("button")];
    buttons.find((button) => button.textContent === "Send feedback")?.click();
    element.querySelector<HTMLButtonElement>(".x-govuk-ui-summary-list-action")?.click();
  });
  await expect(frame.getByText("Thank you for your feedback.")).toBeVisible();
  await page.waitForTimeout(600);
  expect(await page.evaluate(() => localStorage.getItem("x-govuk-ui-example-feedback"))).toBeNull();
});

test("a survey that starts on a step in a wrapper goes back to it from Check your answers", async ({
  page,
  frame,
  open,
  playground,
}) => {
  await open("form");
  await playground.set("example", /In stages/);
  await playground.set("layout", "Page");
  for (const name of ["checkAnswers", "history", "moreKinds", "fromVisit"])
    await playground.set(name, true);
  // The step it starts on is in a component of the survey's own, so it is known only once it
  // registers. The browser's history then records it, not the step before it.
  const visit = frame.getByRole("heading", { name: "About your visit" });
  await expect(visit).toBeVisible();
  await frame.getByRole("radio", { name: "GOV.UK" }).check();
  await frame.getByRole("button", { name: "Continue" }).click();
  await expect(frame.locator(".x-govuk-ui-form-steps-summary")).toBeVisible();
  await page.goBack();
  await expect(visit).toBeVisible();
  await expect(frame.getByRole("radio", { name: "GOV.UK" })).toBeChecked();
});

test("a remembered survey keeps a slider's value as it shows, and an answer given just before the page reloads, and forgets them once sent", async ({
  page,
  frame,
  open,
  playground,
}) => {
  await open("form");
  const choose = async () => {
    await playground.set("example", /In stages/);
    for (const name of ["moreKinds", "remember"]) await playground.set(name, true);
  };
  await choose();
  await frame.getByRole("radio", { name: "Satisfied", exact: true }).check();
  await frame.getByRole("button", { name: "Submit and continue" }).click();
  await expect(frame.getByRole("radio", { name: "Yes" })).toBeFocused();
  await frame.getByRole("radio", { name: "No", exact: true }).check();
  await frame.getByRole("button", { name: "Continue" }).click();
  // The step's chosen answer takes focus as it comes, here the switch that starts on.
  await expect(
    frame.getByRole("switch", { name: "Take part in research about this service" }),
  ).toBeFocused();
  // The slider sends its value from an input that follows its state, so the value is kept once
  // React has drawn it, not as the key is pressed.
  const ease = frame.getByRole("slider", { name: "How easy was it, from 1 to 5?" });
  await ease.focus();
  await ease.press("ArrowRight");
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("x-govuk-ui-example-feedback") ?? ""))
    .toContain('["ease","4"]');
  // An answer given just before the page reloads is kept as the page goes.
  await frame.getByRole("radio", { name: "GOV.UK" }).check();
  await page.reload();
  await choose();
  await expect(
    frame.getByRole("slider", { name: "How easy was it, from 1 to 5?" }),
  ).toHaveAttribute("aria-valuenow", "4");
  await expect(frame.getByRole("radio", { name: "GOV.UK" })).toBeChecked();
  // Once sent, the answers are gone from the browser, and the press that sent them, which would
  // otherwise keep them a moment later, keeps nothing. The survey sends in less than that moment.
  await frame.getByRole("button", { name: "Send feedback" }).click();
  await expect(frame.getByText("Thank you for your feedback.")).toBeVisible();
  await page.waitForTimeout(600);
  expect(await page.evaluate(() => localStorage.getItem("x-govuk-ui-example-feedback"))).toBeNull();
});

test("a remembered survey keeps the answers of a step that applies again, however soon the page reloads", async ({
  page,
  frame,
  open,
  playground,
}) => {
  await open("form");
  const choose = async () => {
    await playground.set("example", /In stages/);
    for (const name of ["back", "moreKinds", "remember", "fromVisit"])
      await playground.set(name, true);
  };
  await choose();
  const kept = () => page.evaluate(() => localStorage.getItem("x-govuk-ui-example-feedback") ?? "");
  // The tablet step applies only to those who used a tablet.
  await frame.getByRole("radio", { name: "GOV.UK" }).check();
  await frame.getByRole("button", { name: "Tablet" }).click();
  await frame.getByRole("button", { name: "Continue" }).click();
  await frame.getByLabel("Which tablet did you use?").fill("A small one");
  await frame.getByRole("button", { name: "Back", exact: true }).click();
  await expect(frame.getByRole("heading", { name: "About your visit" })).toBeVisible();
  // Once a phone is chosen, the step no longer applies, and its answer is left out.
  await frame.getByRole("button", { name: "Phone" }).click();
  await expect.poll(kept).toContain('["device","phone"]');
  expect(await kept()).not.toContain("A small one");
  // A tablet again brings the step back, and its answer with it, though the page reloads before
  // the step is drawn as applying.
  await frame.getByRole("button", { name: "Tablet" }).click();
  await page.reload();
  await choose();
  await expect(frame.locator('input[name="tablet"]')).toHaveValue("A small one");
});
