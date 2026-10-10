import {
  Avatar,
  AvatarGroup,
  GroupedTable,
  GroupedTableGroup,
  GroupedTableRow,
  Tag,
  type TagColour,
} from "x-govuk-ui";

type Props = { resizable?: boolean };

const icon = (path: string) => (
  <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
    <path d={path} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const columns = [
  {
    id: "change",
    label: "Change",
    icon: icon("M4 2.5v11M4 13.5a1.5 1.5 0 1 0 0-.1M12 13.5V7a3 3 0 0 0-3-3H6.5M8 2 6 4l2 2"),
    collapse: "inline" as const,
  },
  {
    id: "area",
    label: "Area",
    icon: icon("M2.5 2.5h5.5l5.5 5.5-5.5 5.5-5.5-5.5zM5.5 5.5h.1"),
    collapse: "drop" as const,
  },
  {
    id: "points",
    label: "Points",
    icon: icon("M8 2.5 14 13H2zM8 6.5v3"),
    collapse: "inline" as const,
  },
  {
    id: "updated",
    label: "Updated",
    icon: icon("M2.5 4h11v9.5h-11zM2.5 7h11M5.5 2.5v3M10.5 2.5v3"),
    collapse: { into: "team" },
  },
  { id: "team", label: "Assigned to", align: "end" as const },
];

type Item = {
  title: string;
  change: number;
  state: "open" | "draft" | "closed";
  area: [string, TagColour];
  points: number;
  updated: string;
  team: string[];
  urgent?: boolean;
  priority: 1 | 2 | 3;
};

const groups: { label: string; mark: "review" | "progress" | "todo"; items: Item[] }[] = [
  {
    label: "In review",
    mark: "review",
    items: [
      {
        title: "Show the licence price before payment",
        change: 212,
        state: "open",
        area: ["Payments", "orange"],
        points: 2,
        updated: "12 Mar",
        team: ["Payments", "Content design"],
        priority: 2,
      },
      {
        title: "Explain why we ask for a date of birth",
        change: 208,
        state: "open",
        area: ["Content", "purple"],
        points: 1,
        updated: "6 Mar",
        team: ["Content design"],
        priority: 1,
      },
      {
        title: "Larger tap targets on the start page",
        change: 205,
        state: "draft",
        area: ["Accessibility", "teal"],
        points: 1,
        updated: "6 Mar",
        team: ["Interaction design", "Development"],
        priority: 2,
      },
    ],
  },
  {
    label: "In progress",
    mark: "progress",
    items: [
      {
        title: "Fix the address lookup on a phone",
        change: 198,
        state: "open",
        area: ["Bug", "red"],
        points: 3,
        updated: "6 Mar",
        team: ["Development"],
        priority: 3,
        urgent: true,
      },
      {
        title: "Keep answers when people go back",
        change: 194,
        state: "draft",
        area: ["Feature", "blue"],
        points: 2,
        updated: "9 Mar",
        team: ["Development"],
        priority: 2,
      },
      {
        title: "Send the licence by email",
        change: 191,
        state: "closed",
        area: ["Feature", "blue"],
        points: 2,
        updated: "11 Mar",
        team: ["Development", "Content design"],
        priority: 2,
      },
    ],
  },
  {
    label: "To do",
    mark: "todo",
    items: [
      {
        title: "Remove old sessions after 30 days",
        change: 187,
        state: "draft",
        area: ["Data", "green"],
        points: 1,
        updated: "14 Apr",
        team: ["Development"],
        priority: 1,
      },
      {
        title: "Rotate the payment service keys",
        change: 183,
        state: "closed",
        area: ["Security", "magenta"],
        points: 1,
        updated: "14 Apr",
        team: ["Development", "Payments"],
        priority: 2,
      },
      {
        title: "Check contrast in the dark theme",
        change: 180,
        state: "draft",
        area: ["Accessibility", "teal"],
        points: 1,
        updated: "9 Apr",
        team: ["Interaction design"],
        priority: 1,
      },
      {
        title: "Restore a saved application",
        change: 176,
        state: "open",
        area: ["Bug", "red"],
        points: 2,
        updated: "18 Mar",
        team: ["Development"],
        priority: 2,
      },
    ],
  },
];

const marks = {
  review: (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      width="16"
      height="16"
      className="preview-mark-review"
    >
      <circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="m5.5 8.2 1.8 1.8 3.4-3.6" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  ),
  progress: (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      width="16"
      height="16"
      className="preview-mark-progress"
    >
      <circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 4a4 4 0 0 1 0 8z" fill="currentColor" />
    </svg>
  ),
  todo: (
    <svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16">
      <circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
};

/** Signal bars for a priority, or a red square for an urgent one. */
function Priority({ level, urgent }: { level: number; urgent?: boolean }) {
  if (urgent)
    return (
      <svg aria-hidden="true" viewBox="0 0 16 16" width="15" height="15" className="preview-urgent">
        <rect x="1.5" y="1.5" width="13" height="13" rx="3.5" fill="currentColor" />
        <path d="M8 4.5v4.5M8 11.2v.1" stroke="var(--x-govuk-ui-paper)" strokeWidth="1.8" />
      </svg>
    );
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" width="15" height="15">
      {[0, 1, 2].map((bar) => (
        <rect
          key={bar}
          x={2 + bar * 4.5}
          y={10 - bar * 3}
          width="3"
          height={4 + bar * 3}
          rx="1"
          fill="currentColor"
          opacity={bar < level ? 1 : 0.3}
        />
      ))}
    </svg>
  );
}

export default function GroupedTableExample({ resizable = true }: Props) {
  return (
    <GroupedTable
      label="Issues"
      columns={columns}
      resizable={resizable}
      toolbar={
        <p className="preview-grouped-title">
          Get a fishing licence <span>Issues</span>
        </p>
      }
    >
      {groups.map((group) => (
        <GroupedTableGroup
          key={group.label}
          label={group.label}
          icon={marks[group.mark]}
          // Work not yet started is looked at least, so its band starts folded.
          defaultOpen={group.mark !== "todo"}
        >
          {group.items.map((item) => (
            <GroupedTableRow
              key={item.change}
              title={item.title}
              icon={<Priority level={item.priority} urgent={item.urgent} />}
              cells={{
                change: (
                  <Tag
                    variant="outline"
                    colour="grey"
                    className="preview-change"
                    data-state={item.state}
                  >
                    {icon("M4 2.5v11M12 13.5V7a3 3 0 0 0-3-3H6.5M8 2 6 4l2 2")}#{item.change}
                    <span className="x-govuk-ui-visually-hidden">, {item.state}</span>
                  </Tag>
                ),
                area: (
                  <Tag variant="outline" colour="grey" className="preview-area">
                    <span className="preview-area-dot" data-colour={item.area[1]} />
                    {item.area[0]}
                  </Tag>
                ),
                points: (
                  <span className="preview-points">
                    {icon("M8 2.5 14 13H2z")}
                    {item.points}
                  </span>
                ),
                updated: <span className="preview-updated">{item.updated}</span>,
                team: (
                  <AvatarGroup>
                    {item.team.map((team) => (
                      <Avatar key={team} name={team} size="small" />
                    ))}
                  </AvatarGroup>
                ),
              }}
            />
          ))}
        </GroupedTableGroup>
      ))}
    </GroupedTable>
  );
}
