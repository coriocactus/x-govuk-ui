import { useEffect, useRef, useState } from "react";
import { Button, Link, Stack, Timeline, TimelineItem, TimelineMore } from "x-govuk-ui";

type Event = { id: string; title: string; by: string; date: Date; description: string };

/** When users last looked at their application. The events since then are new to them. */
const lastLooked = new Date(2026, 2, 10, 9, 0);

const history: Event[] = [
  {
    id: "approved",
    title: "Application approved",
    by: "the Passport Office",
    date: new Date(2026, 2, 12, 14, 5),
    description: "Your new passport is being printed.",
  },
  {
    id: "photo",
    title: "Photo checked",
    by: "the Passport Office",
    date: new Date(2026, 2, 10, 11, 20),
    description: "Your photo meets the rules for passport photos.",
  },
  {
    id: "documents",
    title: "Documents received",
    by: "the Passport Office",
    date: new Date(2026, 2, 9, 10, 40),
    description:
      "We received your old passport and 2 photos. We will send your old passport back separately.",
  },
  {
    id: "posted",
    title: "Documents posted",
    by: "you",
    date: new Date(2026, 2, 5, 16, 30),
    description: "You sent your old passport and 2 photos by Royal Mail.",
  },
  {
    id: "submitted",
    title: "Application submitted",
    by: "you",
    date: new Date(2026, 2, 4, 19, 12),
    description: "You applied to renew an adult passport and paid £94.50.",
  },
  {
    id: "started",
    title: "Application started",
    by: "you",
    date: new Date(2026, 2, 4, 18, 41),
    description: "You started to renew your passport online.",
  },
  {
    id: "eligible",
    title: "Eligibility checked",
    by: "you",
    date: new Date(2026, 2, 4, 18, 30),
    description: "You checked that you can renew your passport online.",
  },
];

const later: Event[] = [
  {
    id: "sent",
    title: "Passport sent",
    by: "the Passport Office",
    date: new Date(2026, 2, 14, 9, 0),
    description: "Sent by Royal Mail. You will need to sign for it.",
  },
  {
    id: "delivered",
    title: "Passport delivered",
    by: "Royal Mail",
    date: new Date(2026, 2, 16, 12, 0),
    description: "Signed for at your address.",
  },
];

/** How many events show at first, and how many more each press of Show earlier events loads. */
const page = 3;

export default function TimelineExample() {
  const [added, setAdded] = useState<Event[]>([]);
  const [loaded, setLoaded] = useState(page);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const next = later.find((event) => !added.includes(event));
  const events = [...added, ...history.slice(0, loaded)];
  // The earlier events stand in for a service's API, so they take a moment to load.
  const loadEarlier = () => {
    setLoading(true);
    timer.current = setTimeout(() => {
      setLoaded((count) => count + page);
      setLoading(false);
    }, 400);
  };
  return (
    <Stack gap={5}>
      <Button
        variant="outline"
        size="small"
        onClick={() => {
          if (next) setAdded([next, ...added]);
          else {
            clearTimeout(timer.current);
            setAdded([]);
            setLoaded(page);
            setLoading(false);
          }
        }}
      >
        {next ? "Add the next update" : "Start again"}
      </Button>
      <Timeline label="History of your application">
        {events.map((event) => (
          <TimelineItem
            key={event.id}
            title={event.title}
            by={event.by}
            date={event.date}
            highlighted={event.date > lastLooked}
          >
            {event.description}
            {event.id === "submitted" && (
              <>
                {" "}
                <Link href="#receipt">View your receipt</Link>.
              </>
            )}
          </TimelineItem>
        ))}
        {loaded < history.length && <TimelineMore loading={loading} onClick={loadEarlier} />}
      </Timeline>
    </Stack>
  );
}
