import { RelativeTime, SummaryList, SummaryListRow } from "x-govuk-ui";

type Props = { hours?: number };

const HOUR = 60 * 60 * 1000;

export default function RelativeTimeExample({ hours = 3 }: Props) {
  // The times are set from when the example opens, so they read the same on any day.
  const now = Date.now();
  return (
    <SummaryList>
      <SummaryListRow label="Last call">
        <RelativeTime date={new Date(now - hours * HOUR)} />
      </SummaryListRow>
      <SummaryListRow label="Last meeting">
        <RelativeTime date={new Date(now - 9 * 24 * HOUR)} />
      </SummaryListRow>
      <SummaryListRow label="Next visit">
        <RelativeTime date={new Date(now + 5 * 24 * HOUR)} />
      </SummaryListRow>
    </SummaryList>
  );
}
