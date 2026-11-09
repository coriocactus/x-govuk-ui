import {
  Button,
  ScrollArea,
  SidePanel,
  SidePanelBody,
  SidePanelClose,
  SidePanelHeader,
  SidePanelLayout,
  SidePanelProvider,
  SidePanelTitle,
  SidePanelTrigger,
  SummaryList,
  SummaryListRow,
  Textarea,
  useSidePanel,
} from "x-govuk-ui";

type Props = { open?: boolean };

/**
 * Shows the notes, or hides them while they are beside the work, from the bar above it. The button
 * stays in the bar either way, so the bar keeps its height.
 */
function NotesButton() {
  const notes = useSidePanel();
  const beside = notes.shown && notes.beside;
  return (
    <SidePanelTrigger
      render={<Button variant="secondary" size="small" />}
      onClick={(event) => {
        if (!beside) return;
        event.preventDefault();
        notes.close();
      }}
    >
      {beside ? "Hide case notes" : "Show case notes"}
    </SidePanelTrigger>
  );
}

export default function SidePanelExample({ open = true }: Props) {
  return (
    // A change of `open` in the playground starts the example again, open or closed.
    <SidePanelProvider
      key={String(open)}
      defaultOpen={open}
      defaultWidth={300}
      minWidth={240}
      maxWidth={420}
      besideFrom={560}
    >
      <div className="preview-side-panel">
        <div className="preview-side-panel-bar">
          <h2>Application RF-2041</h2>
          <NotesButton />
        </div>
        <SidePanelLayout className="preview-side-panel-layout">
          <ScrollArea className="preview-side-panel-work">
            <SummaryList>
              <SummaryListRow label="Licence">12 months</SummaryListRow>
              <SummaryListRow label="Status">Needs a decision</SummaryListRow>
              <SummaryListRow label="Received">14 October 2026</SummaryListRow>
            </SummaryList>
          </ScrollArea>
          <SidePanel label="Case notes" initialFocus={() => document.getElementById("case-note")}>
            <SidePanelHeader>
              <SidePanelTitle>Case notes</SidePanelTitle>
              <SidePanelClose />
            </SidePanelHeader>
            <SidePanelBody>
              <Textarea id="case-note" label="Add a note" rows={4} />
              <Button size="small">Save note</Button>
            </SidePanelBody>
          </SidePanel>
        </SidePanelLayout>
      </div>
    </SidePanelProvider>
  );
}
