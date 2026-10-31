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
  const heading = frame.getByRole("heading", { name: "Your details" });
  const form = frame.locator(".x-govuk-ui-form");
  // Where the heading sits in the form, which the summary leaves alone until it opens.
  const offset = async () => (await heading.boundingBox())!.y - (await form.boundingBox())!.y;
  const before = await offset();
  await frame.getByRole("button", { name: "Continue" }).click();
  // The summary opens above the page's heading, which is inside the Form, takes focus and lists
  // the problems in the fields' order.
  const summary = frame.locator(".x-govuk-ui-error-summary");
  await expect(summary).toBeFocused();
  // It eases open from nothing, so the heading is beneath it once it has.
  await expect
    .poll(async () => (await heading.boundingBox())!.y - (await summary.boundingBox())!.y)
    .toBeGreaterThan(0);
  // Once open, the summary is a page's 30 pixels above the heading, as the fields are apart.
  await expect
    .poll(async () => {
      const above = (await summary.boundingBox())!;
      return Math.round((await heading.boundingBox())!.y - (above.y + above.height));
    })
    .toBe(30);
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
  // Once the summary has folded away, the heading is back where it started.
  await expect.poll(async () => Math.abs((await offset()) - before)).toBeLessThan(1);
});

test("a list of errors of a service's own, drawn with the errors, keeps focus", async ({
  frame,
  open,
  playground,
}) => {
  await open("form");
  await playground.set("ownSummary", true);
  await frame.getByRole("button", { name: "Continue" }).click();
  // The Form draws its own summary with the errors, before the example's list takes its place, but
  // takes no focus from the list.
  const own = frame.locator(".preview-own-errors");
  await expect(own).toBeFocused();
  await expect(frame.locator(".x-govuk-ui-error-summary")).toHaveCount(0);
  await expect(own.getByRole("link")).toHaveText([
    "Enter an email address in the correct format, like name@example.com",
    "Enter your date of birth",
    "Select how long you need your licence for",
  ]);
});

test("a message about the whole form shows in the summary without a link", async ({
  frame,
  open,
  playground,
}) => {
  await open("form");
  await playground.set("fail", true);
  await frame.getByRole("textbox", { name: "Email address" }).fill("someone@example.com");
  await frame.getByRole("textbox", { name: "Day" }).fill("27");
  await frame.getByRole("textbox", { name: "Month" }).fill("3");
  await frame.getByRole("textbox", { name: "Year" }).fill("1985");
  await frame.getByRole("radio", { name: "8 days" }).check();
  // The second press comes while the answers are being sent, so it sends nothing.
  await frame.getByRole("button", { name: "Continue" }).dblclick();
  const summary = frame.locator(".x-govuk-ui-error-summary");
  await expect(summary).toBeFocused();
  await expect(summary).toContainText("We could not save your details. Try again.");
  await expect(summary.getByRole("link")).toHaveCount(0);
  await expect(frame.getByRole("status")).toHaveText("");
  await frame.getByRole("button", { name: "Continue" }).click();
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

  // In the card, Back is a button in its footer.
  await playground.set("layout", "Card");
  await frame.getByRole("radio", { name: "Neither satisfied nor dissatisfied" }).check();
  await frame.getByRole("button", { name: "Submit and continue" }).click();
  // The step's first answer takes focus a frame after the step comes.
  await expect(frame.getByRole("radio", { name: "Yes" })).toBeFocused();
  await frame.getByRole("button", { name: "Back", exact: true }).click();
  await expect(
    frame.getByRole("radio", { name: "Neither satisfied nor dissatisfied" }),
  ).toBeChecked();
});

test("check your answers lists every kind of field, links an error to an answer in a wrapper, and follows the browser's history", async ({
  page,
  frame,
  open,
  playground,
}) => {
  await open("form");
  await playground.set("example", /In stages/);
  await playground.set("layout", "Page");
  for (const name of ["checkAnswers", "history", "moreKinds"]) await playground.set(name, true);
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
  // The switch starts on. Turned off, it sends nothing, and Check your answers lists it as off.
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
  // The browser's Back goes to the last question, and Forward comes back to Check your answers.
  await page.goBack();
  await expect(frame.getByRole("heading", { name: "About your visit" })).toBeVisible();
  await page.goForward();
  await expect(review.locator(".x-govuk-ui-summary-list-value")).toHaveText(answers);
  // While the answers are sent, Change does nothing, so the answers stay sent. The two presses come
  // one after the other, before the answers are sent.
  await frame.evaluate((element) => {
    const buttons = [...element.querySelectorAll<HTMLButtonElement>("button")];
    buttons.find((button) => button.textContent === "Send feedback")?.click();
    element.querySelector<HTMLButtonElement>(".x-govuk-ui-summary-list-action")?.click();
  });
  await expect(frame.getByText("Thank you for your feedback.")).toBeVisible();
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

test("in a card, a step's chosen answer takes focus as it comes, such as a switch that starts on", async ({
  frame,
  open,
  playground,
}) => {
  await open("form");
  await playground.set("example", /In stages/);
  await playground.set("moreKinds", true);
  await frame.getByRole("radio", { name: "Satisfied", exact: true }).check();
  await frame.getByRole("button", { name: "Submit and continue" }).click();
  await expect(frame.getByRole("radio", { name: "Yes" })).toBeFocused();
  await frame.getByRole("radio", { name: "No", exact: true }).check();
  await frame.getByRole("button", { name: "Continue" }).click();
  await expect(
    frame.getByRole("switch", { name: "Take part in research about this service" }),
  ).toBeFocused();
});

test("check your answers leaves out the answers of a step that applies no longer", async ({
  frame,
  open,
  playground,
}) => {
  await open("form");
  await playground.set("example", /In stages/);
  await playground.set("layout", "Page");
  for (const name of ["checkAnswers", "moreKinds", "fromVisit"]) await playground.set(name, true);
  // The tablet step applies only to those who used a tablet.
  await frame.getByRole("radio", { name: "GOV.UK" }).check();
  await frame.getByRole("button", { name: "Tablet" }).click();
  await frame.getByRole("button", { name: "Continue" }).click();
  await frame.getByLabel("Which tablet did you use?").fill("A small one");
  await frame.getByRole("button", { name: "Continue" }).click();
  const review = frame.locator(".x-govuk-ui-form-steps-summary");
  await expect(review.locator(".x-govuk-ui-summary-list-value")).toContainText(["A small one"]);
  // Once a phone is chosen, the step no longer applies, and its answer is left out.
  await review.getByRole("button", { name: /Change your answer to What did you use\?/ }).click();
  await frame.getByRole("button", { name: "Phone" }).click();
  await frame.getByRole("button", { name: "Continue" }).click();
  await expect(review.locator(".x-govuk-ui-summary-list-key")).not.toContainText([
    "Which tablet did you use?",
  ]);
  await expect(review).not.toContainText("A small one");
});

test("an application in pages takes its Back link, buttons and answers where it places them", async ({
  frame,
  open,
  playground,
}) => {
  await open("form");
  await playground.set("example", "In pages: an application");
  const main = frame.locator("main");
  const back = frame.getByRole("link", { name: "Back", exact: true });
  // The first question has no way back, and shows how far along it is, once, where the page
  // places it.
  await expect(back).toHaveCount(0);
  await expect(frame.getByText("Step 1 of 3")).toBeVisible();
  await expect(frame.locator(".x-govuk-ui-form-steps-progress")).toHaveCount(1);
  await frame.getByRole("textbox", { name: "What is your full name?" }).fill("Jo Bloggs");
  await frame.getByRole("button", { name: "Continue" }).click();
  const email = frame.getByRole("textbox", { name: "What is your email address?" });
  await expect(email).toBeVisible();
  // The Back link is in the page's place for one, above the main content, and the form draws
  // none of its own.
  await expect(back).toHaveCount(1);
  await expect(main.getByRole("link", { name: "Back", exact: true })).toHaveCount(0);
  await back.click();
  await expect(frame.getByRole("textbox", { name: "What is your full name?" })).toHaveValue(
    "Jo Bloggs",
  );
  await frame.getByRole("button", { name: "Continue" }).click();
  await email.fill("jo@example.com");
  await frame.getByRole("button", { name: "Continue" }).click();
  await frame.getByRole("radio", { name: "8 days" }).check();
  // A button of the example's own sits beside Continue.
  const buttons = frame.locator(".x-govuk-ui-form-steps-buttons").getByRole("button");
  await expect(buttons).toHaveText(["Continue", "Save and come back later"]);
  await frame.getByRole("button", { name: "Save and come back later" }).click();
  // It saves the answers the form would send now.
  await expect(frame.getByRole("status")).toHaveText("3 answers are saved. Nothing was sent.");
  await frame.getByRole("button", { name: "Continue" }).click();
  // Check your answers takes focus at the example's own heading, and lists the answers in two
  // sections, without the button that is only for the questions.
  const heading = frame.getByRole("heading", { name: "Check your answers before you apply" });
  await expect(heading).toBeFocused();
  await expect(frame.getByRole("heading", { level: 2 })).toHaveText([
    "Your details",
    "Your licence",
  ]);
  const details = frame.locator(".x-govuk-ui-form-steps-review").first();
  await expect(details.locator(".x-govuk-ui-summary-list-value")).toHaveText([
    "Jo Bloggs",
    "jo@example.com",
  ]);
  await expect(frame.getByRole("button", { name: "Save and come back later" })).toHaveCount(0);
  await expect(frame.getByText("Step 1 of 3")).toHaveCount(0);
  // Change asks the question again, then comes back.
  await frame
    .getByRole("button", { name: /Change your answer to What is your email address/ })
    .click();
  await expect(email).toBeFocused();
  await email.fill("jo@example.org");
  await frame.getByRole("button", { name: "Continue" }).click();
  await expect(heading).toBeFocused();
  await expect(details.locator(".x-govuk-ui-summary-list-value")).toHaveText([
    "Jo Bloggs",
    "jo@example.org",
  ]);
  // The licence is a sentence of the example's own, in place of a list, so the form lists no
  // answers of its own. Its Change asks again, and the sentence follows the new answer.
  await expect(frame.locator(".x-govuk-ui-summary-list")).toHaveCount(1);
  const licence = frame.locator(".preview-licence");
  await expect(licence).toContainText("You asked for a licence for 8 days.");
  await licence.getByRole("button", { name: "Change how long your licence lasts" }).click();
  await expect(frame.getByRole("radio", { name: "8 days" })).toBeFocused();
  await frame.getByRole("radio", { name: "12 months" }).check();
  await frame.getByRole("button", { name: "Continue" }).click();
  await expect(heading).toBeFocused();
  await expect(licence).toContainText("You asked for a licence for 12 months.");
  await frame.getByRole("button", { name: "Accept and send" }).click();
  // Once sent, the Panel heads the page and takes focus, and the sections stay.
  await expect(
    frame.getByRole("heading", { level: 1, name: "Your answers have been sent" }),
  ).toBeFocused();
  await expect(heading).toHaveCount(0);
  await expect(frame.getByRole("heading", { level: 2 })).toHaveText([
    "Your details",
    "Your licence",
  ]);
  await expect(back).toHaveCount(0);
});
