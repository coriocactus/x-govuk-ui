import { expect, test } from "../fixtures";

test("a chart shows its figures under the pointer, and as a table", async ({
  page,
  frame,
  open,
  playground,
}) => {
  await open("chart");
  await expect(frame.getByRole("img", { name: /Sales of 1-day and 8-day licences/ })).toBeVisible();
  // Moving over the plot shows each figure in a card.
  const plot = (await frame.locator(".x-govuk-ui-chart-plot").boundingBox())!;
  await page.mouse.move(plot.x + plot.width * 0.6, plot.y + plot.height / 2);
  await expect(frame.locator(".x-govuk-ui-chart-tooltip")).toBeVisible();
  await frame.getByText("Show the figures as a table").click();
  await expect(frame.getByRole("row", { name: /^Aug/ })).toContainText("41k");
  // Named on the plot, each line ends in its name, and the key is removed.
  await playground.set("direct", true);
  await expect(frame.locator(".x-govuk-ui-chart-line-label")).toHaveText([
    "1 day",
    "8 days",
    "12 months",
  ]);
  await expect(frame.locator(".x-govuk-ui-chart-key")).toHaveCount(0);
  // Horizontal bars rank the regions down the side, each with its figure at its end.
  await playground.set("type", "Bar");
  await playground.set("orientation", "Horizontal");
  await expect(
    frame.locator(".recharts-yAxis-tick-labels .recharts-cartesian-axis-tick-value").first(),
  ).toHaveText("South West");
  await expect(frame.locator(".x-govuk-ui-chart-label").first()).toHaveText("131k");
  // A dot chart joins each row's two figures, and a reference line marks the target.
  await playground.set("type", "Dot");
  await playground.set("references", true);
  await expect(frame.locator(".x-govuk-ui-chart-join path")).toHaveCount(9);
  await expect(frame.locator(".x-govuk-ui-chart-reference-label")).toHaveText("Target");
});

test("a chart set out from its parts keeps their order and its name, and Recharts keeps the classes its styles read", async ({
  page,
  frame,
  open,
  playground,
}) => {
  await open("chart");
  await playground.set("parts", true);
  const chart = frame.locator(".x-govuk-ui-chart");
  await expect(chart).toHaveAccessibleName("Short licences peak in summer, yearly ones in spring");
  await expect(chart.locator("> *")).toHaveClass([
    /x-govuk-ui-figure-caption/,
    /x-govuk-ui-chart-drawing/,
    /x-govuk-ui-chart-key/,
    /x-govuk-ui-figure-source/,
    /x-govuk-ui-figure-data/,
  ]);
  // The stylesheets and the labels' spreading read Recharts' own classes, which a new version of
  // it could rename.
  await playground.set("parts", false);
  await playground.set("type", "Pie");
  await playground.set("direct", true);
  for (const name of ["wrapper", "surface", "sector", "pie-label-text"])
    await expect(frame.locator(`.x-govuk-ui-chart .recharts-${name}`).first()).toBeAttached();
  const sector = (await frame.locator(".recharts-sector").first().boundingBox())!;
  await page.mouse.move(sector.x + sector.width / 2, sector.y + sector.height / 2);
  await expect(frame.locator(".recharts-tooltip-wrapper .x-govuk-ui-chart-tooltip")).toBeVisible();
});

test("a chart set shares one scale, one key and one pointer, and its panels keep their titles", async ({
  page,
  frame,
  open,
  playground,
}) => {
  await open("chart-set");
  await expect(frame.locator(".x-govuk-ui-chart-panel")).toHaveCount(4);
  await expect(frame.locator(".x-govuk-ui-chart-panel-title").first()).toHaveText("South West");
  // Every panel's axis ends at the same round figure, above the highest figure drawn. Lines do not
  // stack, so for lines that is the highest line, 21k, and for stacked bars the tallest stack, 31k.
  const tops = () =>
    frame
      .locator(".x-govuk-ui-chart-panel .recharts-yAxis-tick-labels")
      .evaluateAll((axes) =>
        axes.map(
          (axis) =>
            axis.querySelector(".recharts-cartesian-axis-tick-label:last-child")?.textContent,
        ),
      );
  await expect.poll(tops).toEqual(["25k", "25k", "25k", "25k"]);
  await playground.set("type", "Bars");
  await expect.poll(tops).toEqual(["40k", "40k", "40k", "40k"]);
  await playground.set("type", "Lines");
  // Moving over one panel shows the same month's card in every panel.
  const panel = (await frame
    .locator(".x-govuk-ui-chart-panel .x-govuk-ui-chart-plot")
    .first()
    .boundingBox())!;
  await page.mouse.move(panel.x + panel.width * 0.6, panel.y + panel.height / 2);
  await expect(frame.locator(".x-govuk-ui-chart-tooltip")).toHaveCount(4);
  await expect(frame.locator(".x-govuk-ui-chart-tooltip-label").first()).toHaveText(
    await frame.locator(".x-govuk-ui-chart-tooltip-label").last().innerText(),
  );
  await frame.getByText("Show the figures as tables").click();
  await expect(frame.getByRole("table")).toHaveCount(4);
});

test("each kind of chart draws its own marks, and keeps its figures in a table", async ({
  frame,
  open,
  playground,
}) => {
  await open("chart");
  const plot = frame.locator(".x-govuk-ui-chart-plot");
  // A slope names each region at both ends, with its figure.
  await playground.set("type", "Slope");
  await expect(plot.getByText("South West 118k")).toBeVisible();
  await expect(plot.getByText("131k South West")).toBeVisible();
  // A waterfall joins each step's end to the next step, and keys its kinds of step.
  await playground.set("type", "Waterfall");
  await expect(frame.locator(".x-govuk-ui-chart-connector")).toHaveCount(6);
  await expect(frame.locator(".x-govuk-ui-chart-key")).toContainText("Decrease");
  // A box for each region, and a candle for each week, hollow where the queue grew by Friday.
  await playground.set("type", "Box plot");
  await expect(frame.locator(".x-govuk-ui-chart-box")).toHaveCount(5);
  await playground.set("type", "Candlestick");
  await expect(frame.locator(".x-govuk-ui-chart-candle")).toHaveCount(8);
  await expect(frame.locator(".x-govuk-ui-chart-candle[data-rose]")).toHaveCount(4);
  // A heat map is a table, with no picture and no second table.
  await playground.set("type", "Heat map");
  await expect(frame.getByRole("row", { name: /^Friday/ })).toContainText("12.8k");
  await expect(frame.getByRole("img")).toHaveCount(0);
  await expect(frame.getByText("Show the figures as a table")).toHaveCount(0);
  // A funnel names each step with its share of the first, and a donut has the whole in its middle.
  await playground.set("type", "Funnel");
  await expect(plot.getByText("Licence issued 33,500 (70%)")).toBeVisible();
  await playground.set("type", "Donut");
  await expect(frame.locator(".x-govuk-ui-chart-centre-figure")).toHaveText("719k");
  // A radial chart names each ring at its start.
  await playground.set("type", "Radial");
  await playground.set("direct", true);
  await expect(plot.getByText("Card 61%")).toBeVisible();
});

test("a projection is a dashed line with a band, and a focus greys the rest", async ({
  frame,
  open,
  playground,
}) => {
  await open("chart");
  await playground.set("projection", true);
  await expect(frame.locator(".x-govuk-ui-chart-range path").first()).toBeVisible();
  await expect(frame.locator(".recharts-line-curve[stroke-dasharray]")).toHaveCount(1);
  await frame.getByText("Show the figures as a table").click();
  await expect(frame.getByRole("row", { name: /^Dec/ })).toContainText("16k (7k to 25k)");
  // The months to come have no actual figure, which the table says.
  await expect(frame.getByRole("row", { name: /^Dec/ })).toContainText("No figure");
  await playground.set("projection", false);
  await playground.set("focus", true);
  await expect(frame.locator(".recharts-line-curve").last()).toHaveAttribute(
    "stroke",
    "var(--x-govuk-ui-chart-1)",
  );
  await expect(
    frame.locator('.recharts-line-curve[stroke="var(--x-govuk-ui-chart-muted)"]'),
  ).toHaveCount(2);
});

test("a calendar heat map shows a day's date and figure under the pointer", async ({
  page,
  frame,
  open,
}) => {
  await open("calendar-heatmap");
  const day = frame.locator('[data-date="2025-08-15"]');
  const box = (await day.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await expect(frame.locator(".x-govuk-ui-chart-tooltip-label")).toHaveText(
    "Friday 15 August 2025",
  );
  // The day is outlined by the stylesheet, so moving to the next day changes no day.
  await expect(day).toHaveCSS("outline-style", "solid");
  await day.evaluate((cell) => {
    const changes: MutationRecord[] = [];
    new MutationObserver((records) => changes.push(...records)).observe(
      cell.parentElement as Element,
      { attributes: true, subtree: true },
    );
    Object.assign(window, { dayChanges: changes });
  });
  await page.mouse.move(box.x + box.width / 2, box.y + box.height * 1.5 + 4);
  await expect(frame.locator(".x-govuk-ui-chart-tooltip-label")).toHaveText(
    "Saturday 16 August 2025",
  );
  expect(
    await day.evaluate(
      () => (window as unknown as { dayChanges: MutationRecord[] }).dayChanges.length,
    ),
  ).toBe(0);
  // The card stays as the pointer moves up onto it, so it can be read under a magnifier.
  const label = frame.locator(".x-govuk-ui-chart-tooltip-label");
  const centre = (box: { x: number; y: number; width: number; height: number }) =>
    [box.x + box.width / 2, box.y + box.height / 2] as const;
  const sixteenth = (await frame.locator('[data-date="2025-08-16"]').boundingBox())!;
  await page.mouse.move(sixteenth.x + sixteenth.width / 2, sixteenth.y - 6);
  await expect(label).toHaveText("Saturday 16 August 2025");
  // Escape puts it away, and it stays away until the pointer comes to another day.
  await page.keyboard.press("Escape");
  await expect(label).toHaveCount(0);
  await page.mouse.move(...centre(sixteenth));
  await expect(label).toHaveCount(0);
  await page.mouse.move(
    ...centre((await frame.locator('[data-date="2025-08-17"]').boundingBox())!),
  );
  await expect(label).toHaveText("Sunday 17 August 2025");
  await frame.getByText("Show the figures as a table").click();
  await expect(frame.getByRole("row", { name: /^22 December 2025/ })).toContainText("No figure");
});

test("a treemap names the parts that have room, and shows each part's path under the pointer", async ({
  frame,
  open,
  playground,
}) => {
  await open("treemap");
  await expect(frame.locator(".x-govuk-ui-treemap-name").first()).toHaveText("Bailiffs");
  // Hovering waits for the part to stop growing into place.
  await frame.locator(".x-govuk-ui-treemap-part rect").first().hover();
  await expect(frame.locator(".x-govuk-ui-chart-tooltip-label")).toHaveText(
    "Enforcement › Bailiffs",
  );
  // Split no further, the areas are the only parts.
  await playground.set("nested", false);
  await expect(frame.locator(".x-govuk-ui-treemap-name").first()).toHaveText("Enforcement");
  // The key still names the areas, so the chart keeps its height and nothing moves.
  await expect(frame.locator(".x-govuk-ui-chart-key")).toContainText("Running the service");
});

test("a sankey draws a band for each flow, and names each stage with its figure", async ({
  frame,
  open,
}) => {
  await open("sankey");
  await expect(frame.locator(".x-govuk-ui-sankey-flow")).toHaveCount(7);
  await expect(frame.locator(".x-govuk-ui-sankey-name")).toHaveText([
    "Online",
    "Issued at once",
    "Checked by a caseworker",
    "By phone",
    "By post",
    "Issued after checks",
    "Refused",
  ]);
});

test("a gauge is a meter that moves as its figure changes", async ({ frame, open, page }) => {
  await open("gauge");
  const meter = frame.getByRole("meter", { name: "Applications decided within 10 days" });
  await expect(meter).toHaveAttribute("aria-valuenow", "82");
  await page.getByRole("slider", { name: "value" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(meter).toHaveAttribute("aria-valuenow", "83");
  await expect(meter).toHaveAttribute(
    "aria-valuetext",
    /^83%, from 0% to 100%, against a target of 90%$/,
  );
});

test("a brush shows part of a long chart, a category at a time from the keyboard", async ({
  page,
  frame,
  open,
}) => {
  await open("chart");
  await page
    .getByRole("group", { name: "Examples" })
    .getByRole("button", { name: "Part of the year" })
    .click();
  const first = frame.getByRole("slider", { name: "First month shown" });
  const last = frame.getByRole("slider", { name: "Last month shown" });
  await expect(first).toHaveAttribute("aria-valuetext", "Jan");
  await first.focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await last.focus();
  await page.keyboard.press("ArrowLeft");
  await expect(first).toHaveAttribute("aria-valuetext", "Mar");
  await expect(last).toHaveAttribute("aria-valuetext", "Nov");
  await expect(frame.locator(".x-govuk-ui-chart-brush-range")).toHaveText("Mar to Nov");
  // The plot draws only the months between the handles, and the table keeps every one.
  await expect(
    frame
      .locator(
        ".x-govuk-ui-chart-plot .recharts-xAxis-tick-labels .recharts-cartesian-axis-tick-value",
      )
      .first(),
  ).toHaveText("Mar");
  await frame.getByText("Show the figures as a table").click();
  await expect(frame.getByRole("row", { name: /^Jan/ })).toBeVisible();
  // The first handle stops a month short of the last.
  for (let step = 0; step < 12; step++) await page.keyboard.press("ArrowLeft");
  await first.focus();
  for (let step = 0; step < 12; step++) await page.keyboard.press("ArrowRight");
  const ends = [
    await first.getAttribute("aria-valuetext"),
    await last.getAttribute("aria-valuetext"),
  ];
  expect(ends[0]).not.toBe(ends[1]);
});

test("a beeswarm's dots never overlap, and a histogram's bars count their bins", async ({
  frame,
  open,
  playground,
}) => {
  await open("chart");
  await playground.set("type", "Beeswarm");
  const dots = frame.locator(".x-govuk-ui-chart-plot .recharts-scatter-symbol");
  await expect(dots).toHaveCount(96);
  const centres = await dots.evaluateAll((all) =>
    all.map((dot) => {
      const box = dot.getBoundingClientRect();
      return [box.x + box.width / 2, box.y + box.height / 2, box.width / 2] as const;
    }),
  );
  const overlaps = centres.filter(([x, y, r], index) =>
    centres.some(([x2, y2], other) => other !== index && Math.hypot(x - x2, y - y2) < r * 2 - 0.5),
  );
  expect(overlaps).toEqual([]);
  await playground.set("type", "Histogram");
  await frame.locator(".x-govuk-ui-chart-plot .recharts-bar-rectangle").nth(1).hover();
  await expect(frame.locator(".x-govuk-ui-chart-tooltip-label")).toHaveText("5 to 7.5");
});

test("a choropleth map shows an area's figure under the pointer, and hatches one without", async ({
  page,
  frame,
  open,
  playground,
}) => {
  await open("choropleth-map");
  await frame.locator('[data-code="E12000009"]').hover();
  const label = frame.locator(".x-govuk-ui-chart-tooltip-label");
  await expect(label).toHaveText("South West");
  await expect(frame.locator(".x-govuk-ui-chart-tooltip-value")).toHaveText("23");
  await expect(frame.locator(".x-govuk-ui-choropleth-map-outline")).toHaveCount(1);
  // The card stands where the pointer entered the area, so the pointer can move onto it. Escape
  // puts it away until the pointer reaches another area.
  const card = (await frame.locator(".x-govuk-ui-chart-float").boundingBox())!;
  await page.mouse.move(card.x + card.width / 2, card.y + card.height / 2);
  await expect(label).toHaveText("South West");
  await page.keyboard.press("Escape");
  await expect(label).toHaveCount(0);
  await frame.locator('[data-code="E12000007"]').hover();
  await expect(label).toHaveText("London");
  await playground.set("missing", true);
  await expect(frame.locator('[data-code="E12000007"]')).toHaveAttribute("fill", /^url\(#/);
  await expect(frame.locator(".x-govuk-ui-chart-key")).toContainText("No figure");
});
