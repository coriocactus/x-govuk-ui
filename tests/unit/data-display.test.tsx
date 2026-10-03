import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import {
  Choices,
  CodeBlock,
  CodeBlockCopy,
  DataTable,
  Figure,
  FigureCaption,
  FigureData,
  FigureSource,
  FileDiff,
  FormStep,
  FormSteps,
  formatDateTime,
  GroupedTable,
  GroupedTableGroup,
  GroupedTableRow,
  ImageGeneration,
  Kbd,
  LetteredChoices,
  Lightbox,
  LogoCarousel,
  NumberedChoices,
  PlanCard,
  QrCode,
  QuestionCard,
  ReasoningStep,
  Sidebar,
  SidebarContent,
  SidebarItem,
  SidebarProvider,
  Stat,
  Stats,
  SummaryCard,
  SummaryList,
  SummaryListAction,
  SummaryListRow,
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
  TaskList,
  TaskListItem,
  Timeline,
  TimelineItem,
} from "x-govuk-ui";
import { isOneCharacter, isOneGlyph } from "../../packages/core/src/glyph";

test("tables give headings their scope and sortable headings a button", () => {
  const html = renderToStaticMarkup(
    <Table>
      <TableCaption size="medium">Applications</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead sort="ascending">Region</TableHead>
          <TableHead numeric>Received</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableHead>London</TableHead>
          <TableCell numeric>7,912</TableCell>
        </TableRow>
      </TableBody>
    </Table>,
  );
  expect(html).toContain('<th scope="col" aria-sort="ascending"');
  expect(html).toMatch(/aria-sort="ascending"[^>]*><button type="button"/);
  expect(html).toContain('<th scope="row"');
  expect(html).toMatch(/<td class="x-govuk-ui-table-cell" data-numeric="true">7,912/);
  expect(html).toContain("x-govuk-ui-table-caption--medium");
});

test("code blocks colour code, number lines and copy", () => {
  const html = renderToStaticMarkup(
    <CodeBlock code={'const answer = "yes";\n'} filename="answer.ts">
      <CodeBlockCopy />
    </CodeBlock>,
  );
  expect(html).toContain('<span class="x-govuk-ui-code-keyword">const</span>');
  expect(html).toContain('<span class="x-govuk-ui-code-string">');
  // The final line break ends the only line.
  expect(html.match(/x-govuk-ui-code-line-number/g)).toHaveLength(1);
  expect(html).toContain("answer.ts</span>");
  expect(html).toContain('aria-label="Copy"');
  const plain = renderToStaticMarkup(<CodeBlock code="<b>" language="unknown" />);
  expect(plain).toContain("&lt;b&gt;");
  expect(plain).not.toContain("x-govuk-ui-code-sign");
});

test("an editable code block types in a named text box over colours hidden from screen readers", () => {
  const html = renderToStaticMarkup(
    <CodeBlock defaultCode={"const a = 1;\n"} filename="a.ts" editable />,
  );
  expect(html).toMatch(/<textarea aria-label="a.ts" spellcheck="false"[^>]*wrap="off"/i);
  expect(html).toContain('<pre class="x-govuk-ui-code-block-code" aria-hidden="true">');
  // The line after the final break is where the caret stands, so it is numbered.
  expect(html.match(/x-govuk-ui-code-line-number/g)).toHaveLength(2);
  // The text box is the Tab stop, so the region is not named as one.
  expect(html).not.toContain('role="region"');
  const labelled = renderToStaticMarkup(
    <CodeBlock code="x" label="Source" editable inputProps={{ "aria-labelledby": "field" }} />,
  );
  expect(labelled).not.toContain('aria-label="Source"');
  expect(labelled).toContain('aria-labelledby="field"');
});

test("a key, a tag or a badge of one character or one icon is marked to be square", () => {
  for (const one of ["K", " ⌘ ", "3", "👍🏽", "é"]) expect(isOneCharacter(one)).toBe(true);
  for (const more of ["", " ", "Esc", "12", "⌘K"]) expect(isOneCharacter(more)).toBe(false);
  expect(isOneGlyph(<svg aria-hidden="true" />)).toBe(true);
  expect(
    isOneGlyph(
      <>
        <svg aria-hidden="true" />
        <span className="x-govuk-ui-visually-hidden">Experimental</span>
      </>,
    ),
  ).toBe(true);
  expect(isOneGlyph(["A", <span key="b">B</span>])).toBe(false);
  expect(isOneGlyph(<span>B</span>)).toBe(false);
  const keys = renderToStaticMarkup(<Kbd>Ctrl Shift P</Kbd>);
  expect(keys.match(/data-single/g)).toHaveLength(1);
  expect(renderToStaticMarkup(<Kbd>Esc</Kbd>)).not.toContain("data-single");
  expect(renderToStaticMarkup(<Kbd>?</Kbd>)).toContain('data-single="true"');
  expect(renderToStaticMarkup(<Tag>3</Tag>)).toContain('data-single="true"');
  expect(renderToStaticMarkup(<Tag>Received</Tag>)).not.toContain("data-single");
  const sidebar = renderToStaticMarkup(
    <SidebarProvider>
      <Sidebar>
        <SidebarContent>
          <SidebarItem badge={3}>Inbox</SidebarItem>
          <SidebarItem badge={12}>Sent</SidebarItem>
        </SidebarContent>
      </Sidebar>
    </SidebarProvider>,
  );
  expect(sidebar.match(/x-govuk-ui-sidebar-badge" data-single/g)).toHaveLength(1);
});

test("summary lists, task lists, diffs and galleries keep GOV.UK's structure and name their parts", () => {
  const summary = renderToStaticMarkup(
    <SummaryCard title="Applicant" headingLevel={3}>
      <SummaryList>
        <SummaryListRow label="Name" actions={<SummaryListAction href="#name" hiddenText="name" />}>
          Anthony Eden
        </SummaryListRow>
        <SummaryListRow label="Date of birth">5 January 1978</SummaryListRow>
      </SummaryList>
    </SummaryCard>,
  );
  expect(summary).toContain("<h3");
  expect(summary).toContain('<dt class="x-govuk-ui-summary-list-key">Name</dt>');
  expect(summary).toContain('Change<span class="x-govuk-ui-visually-hidden"> name</span>');
  // A row without actions keeps the column, so the values line up.
  expect(summary.match(/x-govuk-ui-summary-list-actions/g)).toHaveLength(2);
  const tasks = renderToStaticMarkup(
    <TaskList>
      <TaskListItem href="#details" hint="Name and address" status="completed">
        Company details
      </TaskListItem>
      <TaskListItem href="#pay" status="cannot-start">
        Pay the fee
      </TaskListItem>
      <TaskListItem href="#documents" status="incomplete">
        Upload documents
      </TaskListItem>
    </TaskList>,
  );
  expect(tasks).toMatch(/aria-describedby="[^"]+-hint [^"]+-status"/);
  expect(tasks).not.toContain('href="#pay"');
  expect(tasks).toContain("Cannot start yet");
  expect(tasks).toContain('data-colour="blue">Incomplete</strong>');
  const diff = renderToStaticMarkup(
    <FileDiff
      filename="a.ts"
      language="ts"
      before={"one\ntwo\nthree\n"}
      after={"one\n2\nthree\n"}
    />,
  );
  expect(diff).toContain("1 line added, 1 removed");
  expect(diff.indexOf("Removed: ")).toBeLessThan(diff.indexOf("Added: "));
  const folded = renderToStaticMarkup(
    <FileDiff
      filename="b.ts"
      before={Array.from({ length: 12 }, (_, line) => `line ${line}`).join("\n")}
      after={Array.from({ length: 12 }, (_, line) => (line === 11 ? "last" : `line ${line}`)).join(
        "\n",
      )}
      context={2}
    />,
  );
  expect(folded).toContain("Show 9 unchanged lines");
  const gallery = renderToStaticMarkup(
    <Lightbox
      label="Photos of London"
      images={[
        { src: "/a.jpg", alt: "A tower", width: 400, height: 600, credit: "A photographer" },
      ]}
    />,
  );
  expect(gallery).toContain('<ul class="x-govuk-ui-lightbox" aria-label="Photos of London"');
  expect(gallery).toContain('aria-haspopup="dialog"');
  expect(gallery).toContain('alt="A tower" width="400" height="600"');
  // The credit is a Tag on the thumbnail, read as "Photo by" its photographer.
  expect(gallery).toContain("Photo by </span>A photographer</strong>");
  const plan = renderToStaticMarkup(
    <PlanCard title="Tidy the summary" actions={<button type="button">Approve</button>}>
      <ReasoningStep status="pending">Run the tests</ReasoningStep>
    </PlanCard>,
  );
  expect(plan).toContain("aria-labelledby");
  expect(plan).toContain("Not started: </span>Run the tests");
  const question = renderToStaticMarkup(
    <QuestionCard
      questions={[
        {
          name: "address",
          question: "Which address?",
          options: [{ value: "home", label: "Home" }],
          other: "Somewhere else",
        },
        { name: "papers", question: "Which papers?", options: [], multiple: true },
      ]}
    />,
  );
  // One question at a time, as a fieldset of native radios, each with its letter. The later
  // questions wait in the form, hidden.
  expect(question).toContain("<legend");
  expect(question).toContain('type="radio"');
  expect(question).toContain('aria-keyshortcuts="A"');
  expect(question).toContain('placeholder="Somewhere else"');
  expect(question).toMatch(/data-step="1" hidden=""/);
  expect(question).toContain('aria-valuetext="Question 1 of 2"');
  // Choices are marked with letters, numbers or nothing, and only marked ones have keys.
  const numbered = renderToStaticMarkup(
    <NumberedChoices
      name="contact"
      legend="How should we contact you?"
      options={[
        { value: "email", label: "Email" },
        { value: "post", label: "Post" },
      ]}
    />,
  );
  expect(numbered).toContain('aria-keyshortcuts="2"');
  expect(numbered).toContain('data-markers="numbers"');
  const plain = renderToStaticMarkup(
    <Choices
      name="contact"
      legend="How should we contact you?"
      markers="none"
      multiple
      options={[{ value: "email", label: "Email" }]}
    />,
  );
  expect(plain).toContain('type="checkbox"');
  expect(plain).not.toContain("aria-keyshortcuts");
  expect(
    renderToStaticMarkup(
      <LetteredChoices name="contact" legend="How?" options={[{ value: "a", label: "A" }]} />,
    ),
  ).toContain('aria-keyshortcuts="A"');
  // Form steps shows its first step on a page, with how far along it is, and keeps the rest.
  const steps = renderToStaticMarkup(
    <FormSteps title="Apply for a licence">
      <FormStep title="Your details">
        <input name="name" />
      </FormStep>
      <FormStep>
        <input name="email" />
      </FormStep>
    </FormSteps>,
  );
  expect(steps).toContain('data-layout="page"');
  expect(steps).toContain("Question 1 of 2");
  expect(steps).toContain("<h1");
  expect(steps).toMatch(/data-step="1" hidden=""/);
  expect(steps).toContain(">Continue<");
});

test("grouped and data tables name their parts", () => {
  const grouped = renderToStaticMarkup(
    <GroupedTable label="Issues" columns={[{ id: "points", label: "Points", collapse: "inline" }]}>
      <GroupedTableGroup label="To do">
        <GroupedTableRow title="Check contrast" cells={{ points: 2 }} />
      </GroupedTableGroup>
    </GroupedTable>,
  );
  expect(grouped).toContain(
    '<section class="x-govuk-ui-grouped-table-groups" aria-label="Issues">',
  );
  // Each cell says its column, wherever the narrowing table puts it.
  expect(grouped).toContain('<span class="x-govuk-ui-visually-hidden">Points: </span>2');
  expect(grouped).toMatch(/<button[^>]*aria-expanded="true"[^>]*>.*To do/);
  const rows = [{ name: "Harbour Water", funding: 438000 }];
  const data = renderToStaticMarkup(
    <DataTable
      label="Partners"
      rows={rows}
      rowKey={(row) => row.name}
      rowName={(row) => row.name}
      selectable
      count={(count) => `${count} partner`}
      columns={[
        { id: "name", header: "Organisation", width: 200, cell: (row) => row.name },
        {
          id: "funding",
          header: "Funding",
          width: 120,
          numeric: true,
          sortBy: (row) => row.funding,
          cell: (row) => row.funding,
          summary: { label: "Sum", value: (all) => all.length },
        },
      ]}
    />,
  );
  expect(data).toContain('<caption class="x-govuk-ui-visually-hidden">Partners</caption>');
  expect(data).toContain('aria-label="Select Harbour Water"');
  expect(data).toContain('aria-label="Select every row"');
  expect(data).toContain('role="separator"');
  expect(data).toContain('aria-sort="none"');
  expect(data).toContain("1 partner");
});

test("timelines write dates as GOV.UK does, and media parts name themselves", () => {
  expect(formatDateTime(new Date(2021, 2, 15, 16, 27))).toBe("15 March 2021 at 4:27pm");
  expect(formatDateTime(new Date(2021, 2, 15, 12, 0))).toBe("15 March 2021 at midday");
  expect(formatDateTime(new Date(2021, 0, 25, 9, 0))).toBe("25 January 2021 at 9am");
  const timeline = renderToStaticMarkup(
    <Timeline label="History">
      <TimelineItem
        key="sent"
        title="Passport sent"
        by="the Passport Office"
        date={new Date(2026, 2, 14, 9, 0)}
      >
        Sent by post.
      </TimelineItem>
    </Timeline>,
  );
  expect(timeline).toContain('<ol class="x-govuk-ui-timeline" aria-label="History">');
  expect(timeline).toContain('<h3 class="x-govuk-ui-timeline-title">Passport sent</h3>');
  expect(timeline).toMatch(/<time dateTime="2026-03-14T[^"]+">14 March 2026 at 9am<\/time>/i);
  const qr = renderToStaticMarkup(<QrCode value="https://www.gov.uk/" label="GOV.UK" />);
  expect(qr).toContain('role="img" aria-label="QR code for GOV.UK"');
  expect(qr.match(/<circle/g)?.length).toBeGreaterThan(50);
  const logos = renderToStaticMarkup(
    <LogoCarousel
      label="Run with"
      visible={2}
      items={[{ name: "Home Office" }, { name: "HM Treasury" }, { name: "Cabinet Office" }]}
    />,
  );
  // Screen readers hear every organisation, not the moving wall.
  expect(logos).toContain("<li>Cabinet Office</li>");
  expect(logos).toContain('class="x-govuk-ui-logo-carousel-wall"');
  expect(logos).toMatch(
    /aria-hidden="true"[^>]*>|class="x-govuk-ui-logo-carousel-wall"[^>]*aria-hidden="true"/,
  );
  expect(logos).toContain("Pause");
  // Until the image arrives, a progress bar shows how far along it is, if the service says.
  const making = renderToStaticMarkup(
    <ImageGeneration alt="A chimney" width={4} height={3} progress={0.5} />,
  );
  expect(making).toContain('role="progressbar"');
  expect(making).toContain('aria-valuenow="50"');
  expect(making).not.toContain("<img");
  const waiting = renderToStaticMarkup(<ImageGeneration alt="A chimney" width={4} height={3} />);
  expect(waiting).toContain('role="progressbar"');
  expect(waiting).not.toContain("aria-valuenow");
  // An image given from the start shows unchanged.
  const made = renderToStaticMarkup(
    <ImageGeneration src="/a.jpg" alt="A chimney" width={4} height={3} />,
  );
  expect(made).toContain('alt="A chimney"');
  expect(made).not.toContain('role="progressbar"');
});

test("a figure is named by its caption's headline, and stats are set in one", () => {
  const figure = renderToStaticMarkup(
    <Figure description="Most buy online.">
      <FigureCaption title="Most licences are bought online" subtitle="2025" />
      <p>A drawing</p>
      <FigureSource>Source: the shop</FigureSource>
      <FigureData>
        <p>The figures</p>
      </FigureData>
    </Figure>,
  );
  const title = figure.match(/aria-labelledby="([^"]+)"/)?.[1];
  const description = figure.match(/aria-describedby="([^"]+)"/)?.[1];
  expect(figure).toContain(`id="${title}" class="x-govuk-ui-figure-title"`);
  expect(figure).toContain(
    `id="${description}" class="x-govuk-ui-visually-hidden">Most buy online.`,
  );
  expect(figure).toContain("Show the figures as a table");
  // The caption is the figure's first child, as HTML asks, and the description comes last.
  expect(figure).toMatch(/^<figure[^>]*><figcaption/);
  expect(figure).toMatch(/Most buy online\.<\/span><\/figure>$/);
  // Without a caption, the figure has no name, instead of one pointing at nothing.
  expect(renderToStaticMarkup(<Figure>A drawing</Figure>)).not.toContain("aria-labelledby");
  const stats = renderToStaticMarkup(
    <Stats title="Sales are up" source="Source: the shop">
      <Stat label="Sold" value="4,200" />
    </Stats>,
  );
  expect(stats).toMatch(
    /^<figure aria-labelledby="[^"]+"[^>]* class="x-govuk-ui-figure x-govuk-ui-stats"/,
  );
  expect(stats).toContain("x-govuk-ui-figure-source");
  expect(
    renderToStaticMarkup(
      <Stats>
        <Stat label="Sold" value="4,200" />
      </Stats>,
    ),
  ).not.toContain("figcaption");
  // A change's words are the service's, for another language.
  expect(
    renderToStaticMarkup(
      <Stat
        label="Gwerthwyd"
        value="4,200"
        change={{ value: "400", direction: "up" }}
        labels={{ up: "I fyny" }}
      />,
    ),
  ).toContain(">I fyny <");
});
