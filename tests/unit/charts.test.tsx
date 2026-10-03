import { expect, test } from "bun:test";
import {
  BarList,
  BulletChart,
  CalendarHeatmap,
  Chart,
  ChartKey,
  ChartPlot,
  ChartSet,
  ChartTable,
  ChoroplethMap,
  Gauge,
  Sankey,
  Sparkline,
  Sunburst,
  Treemap,
  Waffle,
} from "@x-govuk-ui/memetics";
import { renderToStaticMarkup } from "react-dom/server";
import { FigureCaption, FigureSource } from "x-govuk-ui";
import { waffleCells } from "../../packages/memetics/src/waffle";

test("charts keep their figures in a table, and a set shares one key", () => {
  const chart = renderToStaticMarkup(
    <Chart
      type="bar"
      title="Sales"
      description="Sales rose."
      data={[{ month: "Jan", sold: 4 }]}
      category="month"
      series={[{ key: "sold", label: "Sold" }]}
      format={(value) => `${value}k`}
    />,
  );
  expect(chart).toContain('role="img" aria-label="Sales rose."');
  expect(chart).toContain("Show the figures as a table");
  expect(chart).toContain(">4k</td>");
  // A diverging chart's figures are sizes, and a scatter's series are its axes, so the table names
  // each as a column.
  const pyramid = renderToStaticMarkup(
    <Chart
      type="bar"
      orientation="horizontal"
      stacked
      diverging
      title="Ages"
      description="Most are men."
      data={[{ age: "Under 16", men: -48, women: 21 }]}
      category="age"
      series={[
        { key: "men", label: "Men" },
        { key: "women", label: "Women" },
      ]}
    />,
  );
  expect(pyramid).toContain(">48</td>");
  expect(pyramid).not.toContain(">-48</td>");
  const scatter = renderToStaticMarkup(
    <Chart
      type="scatter"
      title="Uptake"
      description="More anglers, more licences."
      data={[{ region: "London", anglers: 71, licences: 22 }]}
      category="region"
      series={[
        { key: "anglers", label: "Anglers" },
        { key: "licences", label: "Licences" },
      ]}
    />,
  );
  expect(scatter).toContain('class="x-govuk-ui-chart-axis-title">Licences<');
  expect(scatter).toContain('data-axis="x">Anglers<');
  expect(scatter).not.toContain("x-govuk-ui-chart-key");
  // A set has one headline, one key and one table of tables, and each panel keeps its title and
  // point.
  const set = renderToStaticMarkup(
    <ChartSet
      title="Regions"
      description="Every region peaks in August."
      panels={["North", "South"].map((region) => ({
        type: "line" as const,
        title: region,
        description: `${region} peaks in August.`,
        data: [{ month: "Aug", sold: 9 }],
        category: "month",
        series: [
          { key: "sold", label: "Sold" },
          { key: "kept", label: "Kept" },
        ],
      }))}
    />,
  );
  expect(set).toContain("Show the figures as tables");
  expect(set.match(/<caption/g)).toHaveLength(2);
  expect(set.match(/x-govuk-ui-chart-key"/g)).toHaveLength(1);
  expect(set).toContain('role="img" aria-label="North peaks in August."');
  expect(set).toContain("Every region peaks in August.");
});

test("a chart's table gives what its type adds, and a missing figure is said to be missing", () => {
  const figures = [
    { step: "2024", change: 40 },
    { step: "Fees", change: 3 },
    { step: "Costs", change: -1 },
  ];
  const waterfall = renderToStaticMarkup(
    <Chart
      type="waterfall"
      title="Budget"
      description="The budget grew."
      data={figures}
      category="step"
      totals={["2024"]}
      series={[{ key: "change", label: "Change" }]}
    />,
  );
  // Each step is signed, with the total after it, and the key names the kinds of step.
  expect(waterfall).toContain(">+3</td>");
  expect(waterfall).toContain(">−1</td>");
  expect(waterfall).toContain(">42</td>");
  expect(waterfall).toContain("Running total");
  expect(waterfall).toContain(">Increase</li>");
  const donut = renderToStaticMarkup(
    <Chart
      type="donut"
      title="Licences"
      description="Most are yearly."
      data={[
        { licence: "Day", sold: 1 },
        { licence: "Year", sold: 3 },
      ]}
      category="licence"
      series={[{ key: "sold", label: "Sold" }]}
    />,
  );
  expect(donut).toContain(">75%</td>");
  expect(donut).toContain('x-govuk-ui-chart-centre-figure">4<');
  const gap = renderToStaticMarkup(
    <Chart
      type="line"
      title="Sales"
      description="Sales rose, with a gap."
      data={[
        { month: "Jan", sold: 4, low: 3, high: 5 },
        { month: "Feb", sold: null, low: null, high: null },
      ]}
      category="month"
      series={[{ key: "sold", label: "Sold", range: ["low", "high"] }]}
    />,
  );
  expect(gap).toContain(">4 (3 to 5)</td>");
  expect(gap).toContain('<span class="x-govuk-ui-visually-hidden">No figure</span>');
});

test("a heat map is its table, each cell shaded by the class its figure falls in", () => {
  const heat = renderToStaticMarkup(
    <Chart
      type="heatmap"
      title="When anglers buy"
      description="Most buy on Fridays."
      data={[
        { day: "Friday", morning: 2, evening: 10 },
        { day: "Sunday", morning: 6, evening: null },
      ]}
      category="day"
      series={[
        { key: "morning", label: "Morning" },
        { key: "evening", label: "Evening" },
      ]}
    />,
  );
  // No picture and no second table. The figures are in the cells, described by the chart's point.
  expect(heat).not.toContain('role="img"');
  expect(heat).not.toContain("Show the figures");
  expect(heat).toMatch(/aria-describedby="[^"]+"/);
  expect(heat).toMatch(/data-step="5"[^>]*>10</);
  expect(heat).toMatch(/data-step="2"[^>]*>2</);
  expect(heat).toContain(">0 to 2</li>");
});

test("the figures set alone say what they show in words", () => {
  const list = renderToStaticMarkup(
    <BarList
      nameLabel="Region"
      valueLabel="Sold"
      data={[
        { label: "South West", value: 120 },
        { label: "London", value: 30 },
      ]}
    />,
  );
  // A table, with each name heading its row, and its bar a quarter of the longest.
  expect(list).toContain('<th scope="row"');
  expect(list).toContain("--x-govuk-ui-bar-list-share:0.25");
  const gauge = renderToStaticMarkup(
    <Gauge label="Decided in time" value={82} target={90} format={(value) => `${value}%`} />,
  );
  expect(gauge).toContain('role="meter"');
  expect(gauge).toContain('aria-valuetext="82%, from 0% to 100%, against a target of 90%"');
  expect(gauge).toMatch(/aria-labelledby="([^"]+)"[\s\S]*id="\1"[^>]*>Decided in time</);
  const bullet = renderToStaticMarkup(
    <BulletChart
      label="Sold"
      value={4200}
      target={5000}
      ranges={[
        { to: 3000, label: "Poor" },
        { to: 6000, label: "Good" },
      ]}
    />,
  );
  expect(bullet).toContain("Target 5,000");
  expect(bullet).toContain(", 3,000 to 6,000");
  const waffle = renderToStaticMarkup(
    <Waffle
      total={100}
      data={[
        { label: "Online", value: 34 },
        { label: "Club", value: 22 },
      ]}
    />,
  );
  expect(waffle).toContain(">Online<");
  expect(waffle).toContain("(34%)");
  expect(waffle.match(/data-empty="true"/g)).toHaveLength(44);
  const spark = renderToStaticMarkup(
    <Sparkline data={[1, null, 3, 2]} description="Sales rose." />,
  );
  expect(spark).toContain('role="img" aria-label="Sales rose."');
  // A gap breaks the line in two.
  expect(spark.match(/M/g)?.length).toBeGreaterThanOrEqual(2);
});

test("a waffle's cells add up, and no part gains or loses more than one by rounding", () => {
  expect(waffleCells([1, 1, 1], 3, 100)).toEqual([34, 33, 33]);
  expect(waffleCells([34, 22], 100, 100)).toEqual([34, 22]);
  expect(waffleCells([2, 1], 3, 10).reduce((a, b) => a + b)).toBe(10);
});

test("calendars, trees and flows keep their figures in a table", () => {
  const calendar = renderToStaticMarkup(
    <CalendarHeatmap
      title="Sales"
      description="Most on Fridays."
      label="Sold"
      start="2025-03-01"
      end="2025-03-31"
      data={{ "2025-03-14": 9, "2025-03-15": 2 }}
    />,
  );
  expect(calendar).toContain(">24 February 2025</th>");
  expect(calendar).toContain(">Friday</th>");
  expect(calendar).toContain('data-date="2025-03-14"');
  expect(calendar).toContain(">Mar</span>");
  const tree = [
    {
      name: "Enforcement",
      children: [
        { name: "Bailiffs", value: 9 },
        { name: "Patrols", value: 3 },
      ],
    },
    { name: "Access", value: 4 },
  ];
  for (const Part of [Treemap, Sunburst]) {
    const html = renderToStaticMarkup(
      <Part
        title="Spending"
        description="Most on enforcement."
        data={tree}
        nameLabel="Area"
        valueLabel="£m"
      />,
    );
    expect(html).toContain(">Enforcement › Bailiffs</th>");
    expect(html).toContain(">12</td>");
    expect(html).toContain(">75%</td>");
  }
  const flow = renderToStaticMarkup(
    <Sankey
      title="Applications"
      description="Most are issued."
      valueLabel="Applications"
      links={[{ from: "Online", to: "Issued", value: 30 }]}
    />,
  );
  expect(flow).toContain(">From</th>");
  expect(flow).toContain(">Issued</td>");
});

test("a histogram counts its figures in bins of round width, and its table counts them too", () => {
  const html = renderToStaticMarkup(
    <Chart
      type="histogram"
      title="Waits"
      description="Most waits are short."
      data={[1, 2, 2, 3, 7, 9].map((days, index) => ({ application: `A${index}`, days }))}
      category="application"
      series={[{ key: "days", label: "Days" }]}
      bins={[0, 5, 10]}
    />,
  );
  // Each bin runs from its lower edge up to its upper, and the last includes its upper edge too.
  expect(html).toContain(">Days</th>");
  expect(html).toContain(">0 to 5</th>");
  expect(html).toMatch(/>0 to 5<\/th><td[^>]*>4<\/td>/);
  expect(html).toMatch(/>5 to 10<\/th><td[^>]*>2<\/td>/);
});

test("a beeswarm, a stream and a brush keep every figure in the table", () => {
  const months = ["Jan", "Feb", "Mar", "Apr"].map((month, index) => ({
    month,
    short: index + 1,
    year: 4 - index,
  }));
  const series = [
    { key: "short", label: "Short" },
    { key: "year", label: "Yearly" },
  ];
  const stream = renderToStaticMarkup(
    <Chart
      type="stream"
      brush
      title="Sales"
      description="Sales swap."
      data={months}
      category="month"
      series={series}
    />,
  );
  // The brush is two sliders, each named and heard as the category it stops at.
  expect(stream).toContain('aria-label="First month shown"');
  expect(stream).toContain('aria-valuetext="Jan"');
  expect(stream).toContain('aria-label="Last month shown"');
  expect(stream).toContain('aria-valuetext="Apr"');
  expect(stream.match(/scope="row"/g)).toHaveLength(4);
  const swarm = renderToStaticMarkup(
    <Chart
      type="beeswarm"
      highlight="Cornwall"
      title="Areas"
      description="Most areas sell to most anglers."
      data={[
        { area: "Cornwall", share: 51 },
        { area: "Devon", share: 64 },
      ]}
      category="area"
      series={[{ key: "share", label: "2025" }]}
    />,
  );
  expect(swarm).toContain(">Cornwall</th>");
  expect(swarm).not.toContain("x-govuk-ui-chart-key");
});

test("a choropleth map shades each area by its class, and hatches one without a figure", () => {
  const square = (x: number) => ({
    type: "Polygon" as const,
    coordinates: [
      [
        [x, 50],
        [x + 1, 50],
        [x + 1, 51],
        [x, 51],
        [x, 50],
      ],
    ],
  });
  const html = renderToStaticMarkup(
    <ChoroplethMap
      title="Licences"
      description="The west sells most."
      areas={[
        { code: "W", name: "West", geometry: square(-3) },
        { code: "E", name: "East", geometry: square(-2) },
        { code: "N", name: "North", geometry: square(-1) },
      ]}
      data={{ W: 20, E: 3 }}
      label="Licences per 1,000 people"
      nameLabel="Region"
    />,
  );
  expect(html).toContain('role="img" aria-label="The west sells most."');
  expect(html).toMatch(/data-code="W" data-step="5"/);
  expect(html).toMatch(/data-code="E" data-step="1"/);
  expect(html).toMatch(/data-code="N" fill="url\(#x-govuk-ui-hatch-/);
  expect(html).toContain(">No figure</li>");
  expect(html).toContain(">Region</th>");
});

test("the charts write their own words in the language they are given", () => {
  const welsh = {
    showTable: "Dangos y ffigurau fel tabl",
    total: "Cyfanswm",
    share: "Cyfran",
    noFigure: "Dim ffigur",
    range: (from: string, to: string) => `${from} i ${to}`,
    weekBeginning: "Wythnos yn dechrau",
    locale: "cy",
  };
  const donut = renderToStaticMarkup(
    <Chart
      type="donut"
      labels={welsh}
      title="Trwyddedau"
      description="Mae'r rhan fwyaf yn flynyddol."
      data={[
        { licence: "Diwrnod", sold: 1 },
        { licence: "Blwyddyn", sold: null },
      ]}
      category="licence"
      series={[{ key: "sold", label: "Gwerthwyd" }]}
    />,
  );
  expect(donut).toContain(">Dangos y ffigurau fel tabl<");
  expect(donut).toContain('x-govuk-ui-chart-centre-label">Cyfanswm<');
  expect(donut).toContain(">Cyfran</th>");
  expect(donut).toContain(">Dim ffigur</span>");
  const calendar = renderToStaticMarkup(
    <CalendarHeatmap
      labels={welsh}
      title="Gwerthiant"
      description="Mwy ar ddydd Gwener."
      label="Trwyddedau"
      start="2025-03-03"
      end="2025-03-09"
      data={{ "2025-03-07": 9 }}
    />,
  );
  // Welsh names the days, and writes the dates, in its own way.
  expect(calendar).toContain(">Wythnos yn dechrau</th>");
  expect(calendar).toContain(">Dydd Llun</th>");
  expect(calendar).toContain(">3 Mawrth 2025</th>");
  const gauge = renderToStaticMarkup(
    <Gauge
      label="Penderfynwyd mewn pryd"
      value={82}
      labels={{ meter: ({ value, max }) => `${value} o ${max}` }}
    />,
  );
  expect(gauge).toContain('aria-valuetext="82 o 100"');
});

test("a chart with no figures, one row or rows sharing a category still writes a sound table", () => {
  const errors: unknown[] = [];
  const error = console.error;
  console.error = (...args: unknown[]) => errors.push(args);
  try {
    const types = ["line", "bar", "heatmap", "beeswarm", "radar", "radial", "pie", "waterfall"];
    const datasets = {
      none: [],
      empty: [{ month: "Jan", sold: null }],
      one: [{ month: "Jan", sold: 4 }],
      same: [
        { month: "Jan", sold: 4 },
        { month: "Jan", sold: 4 },
      ],
      negative: [
        { month: "Jan", sold: -4 },
        { month: "Feb", sold: -9 },
      ],
    };
    for (const type of types)
      for (const [name, data] of Object.entries(datasets)) {
        const markup = renderToStaticMarkup(
          <Chart
            type={type as "line"}
            title="Sales"
            description="Sales."
            data={data}
            category="month"
            series={[{ key: "sold", label: "Sold" }]}
          />,
        );
        expect(markup, `${type} with ${name}`).not.toContain("NaN");
        expect(markup, `${type} with ${name}`).not.toContain("Infinity");
        // Two rows of one name are two rows of the table, each with its figure, as a waterfall's
        // second step is too, though its running total has moved on.
        if (name === "same" && type !== "heatmap")
          expect(markup.match(/>\+?4<\/td>/g)?.length).toBeGreaterThanOrEqual(2);
      }
    // A heat map with every figure missing hatches its cells and names them in its key.
    const empty = renderToStaticMarkup(
      <Chart
        type="heatmap"
        title="Sales"
        description="Sales."
        data={[{ month: "Jan", sold: null }]}
        category="month"
        series={[{ key: "sold", label: "Sold" }]}
      />,
    );
    expect(empty).toContain("data-missing");
    expect(empty).toMatch(/x-govuk-ui-chart-key[\s\S]*No figure/);
  } finally {
    console.error = error;
  }
  // No row is keyed twice, though two share a category.
  expect(errors).toEqual([]);
});

test("a chart's parts can be set out as its children, and a set takes only charts", () => {
  const props = {
    type: "line" as const,
    description: "Sales rose.",
    data: [
      { month: "Jan", sold: 4, kept: 2 },
      { month: "Feb", sold: 5, kept: 3 },
    ],
    category: "month",
    categoryLabel: "Month of sale",
    series: [
      { key: "sold", label: "Sold" },
      { key: "kept", label: "Kept" },
    ],
  };
  const composed = renderToStaticMarkup(
    <Chart {...props}>
      <FigureCaption title="Sales rose" />
      <ChartPlot />
      <FigureSource>Source: the shop</FigureSource>
      <ChartKey className="own" />
      <ChartTable summary="Sales by month" />
    </Chart>,
  );
  // Named by its caption's headline, and in the order its children give.
  const title = composed.match(/aria-labelledby="([^"]+)"/)?.[1];
  expect(composed).toContain(`id="${title}" class="x-govuk-ui-figure-title">Sales rose<`);
  expect(composed.indexOf("x-govuk-ui-figure-source")).toBeLessThan(
    composed.indexOf("x-govuk-ui-chart-key own"),
  );
  expect(composed).toContain("Sales by month");
  expect(composed).toContain(">Month of sale</th>");
  // A key given its own entries shows them anywhere, and a series that continues a missing series
  // keeps a colour of its own.
  expect(
    renderToStaticMarkup(
      <ChartKey entries={[{ label: "Target", mark: "dashed", colour: "red" }]} />,
    ),
  ).toContain('data-mark="dashed"');
  const projected = renderToStaticMarkup(
    <Chart
      {...props}
      title="Sales"
      series={[
        { key: "sold", label: "Sold" },
        { key: "kept", label: "Kept", continues: "gone" },
      ]}
    />,
  );
  expect(projected).not.toContain("chart-0)");
  // A set's own parts can be laid out as its children, with its panels as ChartPlot, and its words
  // are its panels' too.
  const set = renderToStaticMarkup(
    <ChartSet
      description="Sales rose everywhere."
      labels={{ noFigure: "Dim ffigur", showTables: "Dangos y ffigurau" }}
      panels={[
        {
          ...props,
          title: "North",
          data: [{ month: "Jan", sold: null, kept: 2 }],
        },
      ]}
    >
      <FigureCaption title="Sales rose" />
      <ChartTable />
      <ChartPlot />
    </ChartSet>,
  );
  expect(set.indexOf("Dangos y ffigurau")).toBeLessThan(set.indexOf("x-govuk-ui-chart-set-panels"));
  expect(set).toContain("Dim ffigur");
  expect(set).toContain("<caption");
});

test("a missing figure is said to be missing, and no figure is made up in its place", () => {
  const sold = [{ key: "sold", label: "Sold" }];
  const render = (type: "donut" | "waterfall" | "funnel" | "pie", data: ChartDatumRow[]) =>
    renderToStaticMarkup(
      <Chart
        type={type}
        title="Sales"
        description="Sales."
        data={data}
        category="month"
        series={sold}
      />,
    );
  // A donut of nothing has no total, and none of its parts has a share.
  const empty = render("donut", [{ month: "Jan", sold: null }]);
  expect(empty).not.toContain(">1<");
  expect(empty).toContain("No figure");
  const zeroes = render("pie", [
    { month: "Jan", sold: 0 },
    { month: "Feb", sold: 0 },
  ]);
  expect(zeroes).not.toContain("NaN");
  expect(zeroes).not.toContain(">0%<");
  // A waterfall's missing change is missing, and so is the running total until the next total.
  const steps = render("waterfall", [
    { month: "Jan", sold: 4 },
    { month: "Feb", sold: null },
    { month: "Mar", sold: 2 },
  ]);
  expect(steps).not.toContain("+0");
  expect(steps.match(/No figure/g)).toHaveLength(3);
  // A funnel whose first stage is missing gives no shares of it.
  const funnel = render("funnel", [
    { month: "Seen", sold: null },
    { month: "Kept", sold: 3 },
  ]);
  expect(funnel).not.toContain("Infinity");
  expect(funnel).not.toContain("NaN");
});

test("children set a chart out even as nothing, and the parts take figures of a service's own", () => {
  const nothing = renderToStaticMarkup(
    <Chart
      type="bar"
      description="Sales."
      data={[{ month: "Jan", sold: 4 }]}
      category="month"
      series={[{ key: "sold", label: "Sold" }]}
    >
      {null}
    </Chart>,
  );
  expect(nothing).not.toContain("figcaption");
  expect(nothing).not.toContain("Show the figures");
  // Outside a chart, a key and a table show what they are given, in the charts' words.
  const own = renderToStaticMarkup(
    <ChartTable
      tables={[{ head: ["Region", "Anglers"], rows: [{ key: "n", name: "North", cells: ["4"] }] }]}
    />,
  );
  expect(own).toContain("Show the figures as a table");
  expect(own).toContain(">North</th>");
  expect(renderToStaticMarkup(<ChartTable />)).toBe("");
  const key = renderToStaticMarkup(
    <ChartKey
      entries={[
        { label: "North", colour: "red" },
        { label: "North", colour: "blue" },
      ]}
    />,
  );
  expect(key.match(/<li>/g)).toHaveLength(2);
});

test("a gauge keeps the figure it reports within its range, and a waffle writes its language", () => {
  const over = renderToStaticMarkup(<Gauge label="Decided" value={120} />);
  expect(over).toContain('aria-valuenow="100"');
  expect(over).toContain("120");
  const backwards = renderToStaticMarkup(<Gauge label="Decided" value={5} min={10} max={0} />);
  expect(backwards).toContain('aria-valuemin="0"');
  expect(backwards).toContain('aria-valuemax="100"');
  const welsh = renderToStaticMarkup(
    <Waffle
      labels={{ locale: "de" }}
      data={[
        { label: "Online", value: 1234.5 },
        { label: "Phone", value: 0 },
      ]}
    />,
  );
  expect(welsh).toContain("1.234,5");
  const nothing = renderToStaticMarkup(<Waffle data={[{ label: "Online", value: 0 }]} />);
  expect(nothing).not.toContain("%");
});

type ChartDatumRow = Record<string, string | number | null>;
