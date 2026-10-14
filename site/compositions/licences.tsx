import { Chart } from "@x-govuk-ui/memetics";
import { Stack, Stat, Stats } from "x-govuk-ui";
import { useLicenceWeeks } from "../workspace-data";

/**
 * How 12-month licences are selling, against the shorter ones, over the last eight weeks. The
 * figures lead, and the chart picks out the 12-month line.
 */
export default function Licences() {
  const weeks = useLicenceWeeks();
  const last = weeks.at(-1);
  const before = weeks.at(-2);
  if (!last || !before) return <p>There are no figures yet.</p>;
  const rise = last.year - before.year;
  const total = last.day + last.eight + last.year;
  // The weeks in a row, up to the last, in which 12-month licences rose.
  let rising = 0;
  for (let at = weeks.length - 1; at > 0 && weeks[at]!.year > weeks[at - 1]!.year; at--) rising++;

  return (
    <Stack>
      <Stats source="Source: made-up figures for this workspace">
        <Stat
          label="12-month licences last week"
          value={String(last.year)}
          change={{
            value: `${rise} (${Math.round((rise / before.year) * 100)}%)`,
            direction: rise >= 0 ? "up" : "down",
            sentiment: rise >= 0 ? "good" : "bad",
          }}
        />
        <Stat
          label="Share of all licences"
          value={`${Math.round((last.year / total) * 100)}%`}
          description={`${last.year} of ${total}`}
        />
        <Stat label="Weeks rising" value={String(rising)} description="in a row" />
      </Stats>
      <Chart
        type="line"
        title={`12-month licences have risen for ${rising} weeks in a row`}
        subtitle="Rod fishing licences issued each week, last 8 weeks"
        source="Source: made-up figures for this workspace"
        description={`12-month licences rose each week from ${weeks.at(-1 - rising)?.week ?? "the start"}, to ${last.year} last week, while 1-day and 8-day licences fell.`}
        data={weeks}
        category="week"
        series={[
          { key: "year", label: "12 months" },
          { key: "eight", label: "8 days" },
          { key: "day", label: "1 day" },
        ]}
        highlight="year"
        height={220}
      />
    </Stack>
  );
}
