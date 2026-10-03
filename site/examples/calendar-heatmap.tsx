import { CalendarHeatmap } from "@x-govuk-ui/memetics";

type Props = {
  /** Starts the calendar in April, as the fishing year does, instead of in January. */
  season?: boolean;
};

// Licences sold each day of 2025, made up from the season, the day of the week and a little noise
// that is the same every time. Sales rise at the weekend. They are highest on Friday and Saturday,
// and higher on Sunday than on weekdays.
const weekendOf: Record<number, number> = { 0: 1.3, 5: 1.8, 6: 1.8 };
const sales: Record<string, number> = {};
for (let day = 0; day < 365; day++) {
  const date = new Date(Date.UTC(2025, 0, 1 + day));
  const season = Math.sin(((day - 60) / 365) * Math.PI * 2 - Math.PI / 2) * 0.5 + 0.5;
  const weekend = weekendOf[date.getUTCDay()] ?? 1;
  const noise = ((day * 7919) % 13) / 13;
  // Christmas Day sold nothing that was counted.
  if (date.getUTCMonth() !== 11 || date.getUTCDate() !== 25)
    sales[date.toISOString().slice(0, 10)] =
      Math.round((0.6 + season * 4 + noise) * weekend * 10) / 10;
}

export default function CalendarHeatmapExample({ season = false }: Props) {
  return (
    <CalendarHeatmap
      title="Anglers buy most on Fridays and Saturdays in summer"
      subtitle="Rod fishing licences sold each day, 2025, thousands"
      source="Source: made-up figures for this example"
      description="Sales rise from spring to a peak in July and August, and every week they are highest on Fridays and Saturdays. No sales were counted on Christmas Day."
      label="Licences sold"
      data={sales}
      start={season ? "2025-04-01" : "2025-01-01"}
      end="2025-12-31"
      format={(value) => `${value}k`}
    />
  );
}
