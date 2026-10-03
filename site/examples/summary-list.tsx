import { type FormEvent, useRef, useState } from "react";
import {
  Button,
  ButtonGroup,
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  Input,
  SummaryCard,
  SummaryList,
  SummaryListAction,
  SummaryListRow,
} from "x-govuk-ui";

type Props = { noBorder?: boolean; card?: boolean };
type Answer = "name" | "phone" | "email";

const labels: Record<Answer, string> = {
  name: "Name",
  phone: "Phone number",
  email: "Email address",
};
// Each answer's field, so the keyboard and the browser's filling suit it.
const fields: Record<Answer, { type: string; autoComplete: string }> = {
  name: { type: "text", autoComplete: "name" },
  phone: { type: "tel", autoComplete: "tel" },
  email: { type: "email", autoComplete: "email" },
};

export default function SummaryListExample({ noBorder = false, card = true }: Props) {
  const [answers, setAnswers] = useState<Record<Answer, string>>({
    name: "Tony Blair",
    phone: "07700 900457",
    email: "tony.blair@example.com",
  });
  // Change opens a dialog to edit the answer in place. The value glows once it is saved.
  const [editing, setEditing] = useState<Answer | null>(null);
  const [draft, setDraft] = useState("");
  const [message, setMessage] = useState("");
  // Focus returns to the Change that opened the dialog. Safari does not focus a pressed button.
  const opener = useRef<HTMLElement | null>(null);
  const change = (answer: Answer) => (
    <SummaryListAction
      hiddenText={labels[answer].toLowerCase()}
      onClick={(event) => {
        opener.current = event.currentTarget;
        setDraft(answers[answer]);
        setEditing(answer);
      }}
    />
  );
  const save = (event: FormEvent) => {
    event.preventDefault();
    if (editing && draft.trim())
      setAnswers((previous) => ({ ...previous, [editing]: draft.trim() }));
    setEditing(null);
  };

  const list = (
    <SummaryList noBorder={noBorder}>
      <SummaryListRow label="Name" actions={change("name")}>
        {answers.name}
      </SummaryListRow>
      <SummaryListRow label="Date of birth">5 January 1978</SummaryListRow>
      <SummaryListRow label="Phone number" actions={change("phone")}>
        {answers.phone}
      </SummaryListRow>
      <SummaryListRow label="Email address" actions={change("email")}>
        {answers.email}
      </SummaryListRow>
    </SummaryList>
  );

  return (
    <div className="preview-summary-list">
      {card ? (
        <SummaryCard
          title="Applicant"
          actions={
            <SummaryListAction
              hiddenText="applicant"
              onClick={() => setMessage("This is an example, so the applicant was not removed.")}
            >
              Remove
            </SummaryListAction>
          }
        >
          {list}
        </SummaryCard>
      ) : (
        list
      )}
      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent finalFocus={opener}>
          <form onSubmit={save}>
            <DialogTitle>Change {editing ? labels[editing].toLowerCase() : ""}</DialogTitle>
            <Input
              label={editing ? labels[editing] : ""}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              {...fields[editing ?? "name"]}
            />
            <ButtonGroup>
              <Button type="submit">Save</Button>
              <DialogClose>Cancel</DialogClose>
            </ButtonGroup>
          </form>
        </DialogContent>
      </Dialog>
      <p className="preview-message" role="status">
        {message}
      </p>
    </div>
  );
}
