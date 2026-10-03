import { useState } from "react";
import { Button, ErrorSummary, ErrorSummaryItem, Input, Radio, Radios } from "x-govuk-ui";

type Problems = { email?: string; contact?: string };

// The service checks every answer when the form is sent, as GOV.UK recommends.
const check = (email: string, contact: string | null): Problems => ({
  email: /^\S+@\S+\.\S+$/.test(email) ? undefined : "Enter an email address, like name@example.com",
  contact: contact ? undefined : "Select how you would like to be contacted",
});

/**
 * The page as it comes back when the server has found problems. The summary is at the top, taking
 * focus, and each field has its message. Fixing an answer removes its line.
 */
export default function ErrorSummaryExample({ title = "There is a problem", autoFocus = true }) {
  const [email, setEmail] = useState("");
  const [contact, setContact] = useState<string | null>(null);
  const [problems, setProblems] = useState<Problems>(() => check("", null));
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState("");

  return (
    <form
      className="preview-summary-form"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const next = check(email, contact);
        setProblems(next);
        setAttempt((count) => count + 1);
        setStatus(
          next.email || next.contact ? "" : "Your details are ready. No information was sent.",
        );
      }}
    >
      {(problems.email || problems.contact) && (
        // A new key after each submission moves focus to the summary again. An answer that now
        // passes loses its line, as Form's do, and the summary disappears once nothing is wrong. An
        // answer that still fails keeps its message until the form is sent again.
        <div className="preview-summary">
          <ErrorSummary key={attempt} title={title} autoFocus={autoFocus}>
            {problems.email && <ErrorSummaryItem href="#email">{problems.email}</ErrorSummaryItem>}
            {problems.contact && (
              <ErrorSummaryItem href="#contact">{problems.contact}</ErrorSummaryItem>
            )}
          </ErrorSummary>
        </div>
      )}
      <div className="preview-stack">
        <Input
          id="email"
          label="Email address"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => {
            const next = event.target.value;
            setEmail(next);
            if (!check(next, contact).email)
              setProblems((current) => ({ ...current, email: undefined }));
          }}
          errorMessage={problems.email}
        />
        <Radios
          id="contact"
          name="contact"
          legend="How would you like to be contacted?"
          value={contact}
          onValueChange={(next) => {
            setContact(next);
            setProblems((current) => ({ ...current, contact: undefined }));
          }}
          errorMessage={problems.contact}
        >
          <Radio value="email">Email</Radio>
          <Radio value="phone">Phone</Radio>
        </Radios>
      </div>
      <div className="preview-actions">
        <Button type="submit">Continue</Button>
      </div>
      <p className="preview-message" role="status" data-success={status ? "" : undefined}>
        {status}
      </p>
    </form>
  );
}
