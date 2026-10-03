import { useState } from "react";
import { Button, Link, Timeline, TimelineItem } from "x-govuk-ui";

type Event = { id: string; title: string; by: string; date: Date; description: string };

const history: Event[] = [
  {
    id: "approved",
    title: "Application approved",
    by: "the Passport Office",
    date: new Date(2026, 2, 12, 14, 5),
    description: "Your new passport is being printed.",
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
    id: "submitted",
    title: "Application submitted",
    by: "you",
    date: new Date(2026, 2, 4, 19, 12),
    description: "You applied to renew an adult passport and paid £94.50.",
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

export default function TimelineExample() {
  const [events, setEvents] = useState(history);
  const next = later.find((event) => !events.includes(event));
  return (
    <div className="preview-timeline">
      <div className="preview-timeline-actions">
        <Button
          variant="outline"
          size="small"
          onClick={() => setEvents(next ? [next, ...events] : history)}
        >
          {next ? "Add the next update" : "Start again"}
        </Button>
      </div>
      <Timeline label="History of your application">
        {events.map((event) => (
          <TimelineItem key={event.id} title={event.title} by={event.by} date={event.date}>
            {event.description}
            {event.id === "submitted" && (
              <>
                {" "}
                <Link href="#receipt">View your receipt</Link>.
              </>
            )}
          </TimelineItem>
        ))}
      </Timeline>
    </div>
  );
}
