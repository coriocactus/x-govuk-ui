import { ChangeSummary, ChangeSummaryItem, Stack, Timeline, TimelineItem } from "x-govuk-ui";

type Props = { timeline?: boolean };

const HOUR = 60 * 60 * 1000;

export default function ChangeSummaryExample({ timeline = true }: Props) {
  const handover = (
    <ChangeSummary>
      <ChangeSummaryItem label="Owner" from="Lord Rosebery" to="William Gladstone" />
      <ChangeSummaryItem label="Relationship" from="Managed" to="Strategic" />
    </ChangeSummary>
  );
  if (!timeline) return handover;
  // The times are set from when the example opens, so they read the same on any day.
  const now = Date.now();
  return (
    <Timeline label="History of Tamar Valley Foundry">
      <TimelineItem
        title="Handed over to a new owner"
        by="William Gladstone"
        date={new Date(now - 2 * HOUR)}
      >
        <Stack gap={2}>
          {handover}
          <p>Reason: the company has joined the strategic accounts.</p>
        </Stack>
      </TimelineItem>
      <TimelineItem title="Website added" by="Lord Rosebery" date={new Date(now - 72 * HOUR)}>
        <ChangeSummary>
          <ChangeSummaryItem label="Website" to="tamarvalleyfoundry.example" />
        </ChangeSummary>
      </TimelineItem>
    </Timeline>
  );
}
