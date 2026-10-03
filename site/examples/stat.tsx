import { Stat, Stats } from "x-govuk-ui";

type Props = {
  orientation?: "horizontal" | "vertical";
  align?: "start" | "centre";
  /** Heads the figures with a rule, a headline and a source, as a Chart's are headed. */
  titled?: boolean;
  icons?: boolean;
};

const icon = (path: string) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <path d={path} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function StatExample({
  orientation = "horizontal",
  align = "start",
  titled = true,
  icons = false,
}: Props) {
  return (
    <Stats
      orientation={orientation}
      align={align}
      title={titled ? "Sales are up and the queue is shorter" : undefined}
      subtitle={titled ? "Rod fishing licences, week to 4 October 2026" : undefined}
      source={titled ? "Source: made-up figures for this example" : undefined}
    >
      <Stat
        label="Licences sold"
        value="4,200"
        change={{ value: "400 (22%)", direction: "up", sentiment: "good" }}
        icon={icons ? icon("M4 19h16M4 15l5-5 4 4 7-8") : undefined}
      />
      <Stat
        label="Applications waiting"
        value="1,200"
        change={{ value: "90 (14%)", direction: "down", sentiment: "good" }}
        icon={icons ? icon("M4 6h16M4 12h10M4 18h7") : undefined}
      />
      <Stat
        label="Average wait"
        value="3.2 days"
        change={{ value: "0.4 days", direction: "up", sentiment: "bad" }}
        icon={icons ? icon("M12 7v5l3 2M20 12a8 8 0 1 1-16 0 8 8 0 0 1 16 0") : undefined}
      />
      <Stat
        label="Refunds paid"
        value="£18,400"
        description="1 to 4 October"
        icon={icons ? icon("M4 7h16v10H4zM4 11h16M8 15h3") : undefined}
      />
    </Stats>
  );
}
