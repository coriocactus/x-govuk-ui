import {
  Tile,
  TileClose,
  TileContent,
  TileMaximise,
  TileMenu,
  TileSplit,
  Tiles,
  TilesDock,
  type TilesLayout,
  TilesTidy,
} from "@x-govuk-ui/belsize";
import { useRef, useState } from "react";
import {
  Button,
  EmptyState,
  EmptyStateActions,
  EmptyStateDescription,
  EmptyStateTitle,
  SummaryList,
  SummaryListRow,
  Tag,
  Textarea,
  Timeline,
  TimelineItem,
} from "x-govuk-ui";

type Props = {
  dropBehaviour?: "split" | "swap" | "split-and-swap";
  snap?: number;
  grip?: boolean;
  previewResize?: boolean;
  /** The widest screen on which the tiles show one at a time, with a pager between them. */
  mobileBreakpoint?: number;
};

/** A caseworker's desk, with the application and its evidence beside its history and a note. */
const desk: TilesLayout = {
  type: "split",
  direction: "row",
  splitPercentages: [45, 55],
  children: [
    { type: "split", direction: "column", children: ["application", "evidence"] },
    {
      type: "split",
      direction: "column",
      splitPercentages: [60, 40],
      children: ["history", "notes"],
    },
  ],
};

const papers = [
  { id: "application", title: "Application" },
  { id: "evidence", title: "Evidence" },
  { id: "history", title: "History" },
  { id: "notes", title: "Notes" },
];

/**
 * Drag a tile by its bar to another tile's edge, or the desk's own edge, and drop it there. Drag
 * the lines between them to resize them. Split a tile to add a note beside it, or maximise one.
 * Drag a tile to the dock to close it, and drag it back from the dock to open it again. Tidy lays
 * them out evenly. Every move is in each tile's menu too.
 */
export default function TilesExample({
  dropBehaviour = "split",
  snap = 0,
  grip = false,
  previewResize = false,
  mobileBreakpoint,
}: Props) {
  const [layout, setLayout] = useState<TilesLayout | null>(desk);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [added, setAdded] = useState(1);
  // Each split adds a new note, which waits in the dock once it is closed, as the papers do. The
  // count is a ref as well, so two splits before a render still make two notes.
  const count = useRef(1);
  const newNote = () => {
    count.current += 1;
    setAdded(count.current);
    return `note-${count.current}`;
  };
  const tiles = [
    ...papers,
    ...Array.from({ length: added - 1 }, (_, index) => ({
      id: `note-${index + 2}`,
      title: `Note ${index + 2}`,
    })),
  ];
  const title = (id: string) => tiles.find((tile) => tile.id === id)?.title ?? id;

  return (
    <Tiles
      value={layout}
      onValueChange={setLayout}
      tiles={tiles}
      createTile={newNote}
      dropBehaviour={dropBehaviour}
      snap={snap || undefined}
      grip={grip}
      previewResize={previewResize}
      mobileBreakpoint={mobileBreakpoint || undefined}
      className="preview-tiles"
      empty={
        <EmptyState size="small">
          <EmptyStateTitle level={3}>Every tile is closed</EmptyStateTitle>
          <EmptyStateDescription>
            Drag one back from the dock, or set the desk out again.
          </EmptyStateDescription>
          <EmptyStateActions>
            <Button size="small" variant="secondary" onClick={() => setLayout(desk)}>
              Reset the desk
            </Button>
          </EmptyStateActions>
        </EmptyState>
      }
      renderTile={(id) => (
        <Tile
          title={title(id)}
          controls={
            <>
              <TileMenu />
              <TileSplit direction="across" />
              <TileSplit direction="down" />
              <TileMaximise />
              <TileClose />
            </>
          }
        >
          <TileContent scroll className="preview-tile">
            {id === "application" && (
              <SummaryList>
                <SummaryListRow label="Applicant">Priya Natarajan</SummaryListRow>
                <SummaryListRow label="Reference">RL-48213</SummaryListRow>
                <SummaryListRow label="Licence">
                  <Tag colour="blue">12 months</Tag>
                </SummaryListRow>
                <SummaryListRow label="Concession">Disability</SummaryListRow>
              </SummaryList>
            )}
            {id === "evidence" && (
              <ul className="preview-tile-list">
                <li>Blue Badge, both sides (JPEG, 1.2 MB)</li>
                <li>Proof of address (PDF, 220 KB)</li>
              </ul>
            )}
            {id === "history" && (
              <Timeline label="History of the application">
                <TimelineItem
                  title="Evidence received"
                  by="Priya Natarajan"
                  date={new Date(2026, 8, 29, 9, 12)}
                >
                  A photo of her Blue Badge.
                </TimelineItem>
                <TimelineItem
                  title="Application received"
                  by="Priya Natarajan"
                  date={new Date(2026, 8, 28, 18, 40)}
                >
                  A 12-month licence at the disability rate, £23.80.
                </TimelineItem>
              </Timeline>
            )}
            {(id === "notes" || id.startsWith("note-")) && (
              <Textarea
                label={id === "notes" ? "Case note" : title(id)}
                hideLabel={id !== "notes"}
                rows={3}
                value={notes[id] ?? ""}
                onChange={(event) => setNotes({ ...notes, [id]: event.target.value })}
              />
            )}
          </TileContent>
        </Tile>
      )}
    >
      <div className="preview-tiles-bar">
        <TilesDock className="preview-tiles-dock" />
        <TilesTidy>Tidy the desk</TilesTidy>
        <Button size="small" variant="quiet" onClick={() => setLayout(desk)}>
          Reset the desk
        </Button>
      </div>
    </Tiles>
  );
}
