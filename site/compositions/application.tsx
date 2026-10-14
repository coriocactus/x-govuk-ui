import { Fragment, useState } from "react";
import {
  Button,
  ButtonGroup,
  formatDate,
  formatTime,
  InsetText,
  NotificationBanner,
  Stack,
  SummaryList,
  SummaryListRow,
  Tag,
  type TagColour,
} from "x-govuk-ui";
import { askFor, issueLicence, money, type Status, useApplication } from "../workspace-data";

const statuses: Record<Status, [string, TagColour]> = {
  decision: ["Needs a decision", "orange"],
  waiting: ["Waiting for the applicant", "yellow"],
  ready: ["Ready to issue", "blue"],
  issued: ["Issued", "green"],
};

/**
 * Theresa May's application, with the check it waits on. The caseworker issues the licence once
 * her date of birth is checked, or asks her for proof of age.
 */
export default function Application() {
  const application = useApplication("RL-48213");
  const [busy, setBusy] = useState<"issue" | "ask">();
  // A banner takes focus only for a change made here, not when the view opens.
  const [changedHere, setChangedHere] = useState(false);
  if (!application) return <p>There is no application RL-48213.</p>;
  const paid = application.payments[0];

  const act = async (action: "issue" | "ask", run: () => Promise<void>) => {
    setBusy(action);
    try {
      await run();
      setChangedHere(true);
    } finally {
      setBusy(undefined);
    }
  };

  return (
    <Stack>
      {application.status === "issued" && (
        <NotificationBanner type="success" title="Licence issued" autoFocus={changedHere}>
          {`${application.name}'s licence starts on ${formatDate(application.starts)}. It has been emailed to ${application.email}.`}
        </NotificationBanner>
      )}
      {application.status === "waiting" && (
        <NotificationBanner type="success" title="Proof of age asked for" autoFocus={changedHere}>
          {`${application.name} has been asked for proof of age. The application comes back to you when she replies.`}
        </NotificationBanner>
      )}
      <SummaryList>
        <SummaryListRow label="Status">
          <Tag colour={statuses[application.status][1]}>{statuses[application.status][0]}</Tag>
        </SummaryListRow>
        <SummaryListRow label="Name">{application.name}</SummaryListRow>
        <SummaryListRow label="Date of birth">{formatDate(application.dateOfBirth)}</SummaryListRow>
        <SummaryListRow label="Address">
          {application.address.map((line, index) => (
            <Fragment key={line}>
              {index > 0 && <br />}
              {line}
            </Fragment>
          ))}
        </SummaryListRow>
        <SummaryListRow label="Licence">
          {`${application.licence}, from ${formatDate(application.starts)}`}
        </SummaryListRow>
        <SummaryListRow label="Concession">
          {application.senior ? `Senior, at ${application.age} when the licence starts` : "None"}
        </SummaryListRow>
        {paid && (
          <SummaryListRow label="Paid">
            {`${money(paid.amount)} at ${formatTime(paid.date)} on ${formatDate(paid.date)}, from the card ending ${paid.card}`}
          </SummaryListRow>
        )}
      </SummaryList>
      {application.status === "decision" && (
        <>
          <InsetText>
            The date of birth does not match the driving licence. Check it before you issue a senior
            licence.
          </InsetText>
          <ButtonGroup>
            <Button
              loading={busy === "issue"}
              disabled={busy === "ask"}
              onClick={() => act("issue", () => issueLicence(application.reference))}
            >
              Issue licence
            </Button>
            <Button
              variant="secondary"
              loading={busy === "ask"}
              disabled={busy === "issue"}
              onClick={() => act("ask", () => askFor(application.reference, "proof of age"))}
            >
              Ask for proof of age
            </Button>
          </ButtonGroup>
        </>
      )}
    </Stack>
  );
}
