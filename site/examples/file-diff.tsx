import { useState } from "react";
import { Button, FileDiff, Tag } from "x-govuk-ui";

type Props = { context?: number };

const before = `import { formatDate } from "./dates";

type Application = {
  reference: string;
  submitted: Date;
  status: "received" | "approved";
};

export function summary(application: Application) {
  const lines = [
    \`Reference: \${application.reference}\`,
    \`Submitted: \${formatDate(application.submitted)}\`,
  ];
  // Applications are checked in the order they arrive.
  // A caseworker picks the oldest first.
  // Urgent cases are flagged by the contact centre.
  // Flagged cases go to the front of the queue.
  // Each check takes about 10 working days.
  // The status changes when a decision is made.
  // People get an email when it changes.
  if (application.status === "approved") lines.push("Approved");
  return lines.join("\\n");
}
`;

const after = `import { formatDate } from "./dates";

type Application = {
  reference: string;
  submitted: Date;
  status: "received" | "approved" | "refused";
};

export function summary(application: Application) {
  const lines = [
    \`Reference: \${application.reference}\`,
    \`Submitted: \${formatDate(application.submitted)}\`,
  ];
  // Applications are checked in the order they arrive.
  // A caseworker picks the oldest first.
  // Urgent cases are flagged by the contact centre.
  // Flagged cases go to the front of the queue.
  // Each check takes about 10 working days.
  // The status changes when a decision is made.
  // People get an email when it changes.
  if (application.status !== "received") lines.push(\`Decision: \${application.status}\`);
  return lines.join("\\n");
}
`;

export default function FileDiffExample({ context = 3 }: Props) {
  // An agent proposes the change, and people accept or reject it.
  const [decision, setDecision] = useState<"accepted" | "rejected" | null>(null);
  return (
    <FileDiff
      filename="src/summary.ts"
      language="ts"
      before={before}
      after={after}
      context={context}
    >
      {decision ? (
        <>
          <Tag colour={decision === "accepted" ? "green" : "grey"} variant="outline">
            {decision === "accepted" ? "Accepted" : "Rejected"}
          </Tag>
          <Button variant="outline" size="small" onClick={() => setDecision(null)}>
            Undo
          </Button>
        </>
      ) : (
        <>
          <Button variant="outline" size="small" onClick={() => setDecision("rejected")}>
            Reject
          </Button>
          <Button size="small" onClick={() => setDecision("accepted")}>
            Accept
          </Button>
        </>
      )}
    </FileDiff>
  );
}
