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
  await frame.getByLabel("How could we improve this service?").fill("Keep it short.");
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("x-govuk-ui-example-feedback") ?? ""))
    .toContain("Keep it short.");
  // The playground starts again after a reload, so the survey is chosen again.
  await page.reload();
  await playground.set("example", /In stages/);
  for (const name of ["back", "remember"]) await playground.set(name, true);
  await expect(frame.getByLabel("How could we improve this service?")).toHaveValue(
    "Keep it short.",
  );
  // In the card, Back is a button in its footer.
  await frame.getByRole("button", { name: "Back", exact: true }).click();
  await expect(
    frame.getByRole("radio", { name: "Neither satisfied nor dissatisfied" }),
  ).toBeChecked();
});
