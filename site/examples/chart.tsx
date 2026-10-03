import {
  Chart,
  ChartBrush,
  ChartKey,
  ChartPlot,
  ChartTable,
  type ChartType,
} from "@x-govuk-ui/memetics";
import { FigureCaption, FigureSource } from "x-govuk-ui";

type Props = {
  type?: ChartType;
  stacked?: boolean;
  normalise?: boolean;
  /**
   * Which way bars and dots run. `auto` is each type's own way, with vertical bars and horizontal
   * dots.
   */
  orientation?: "auto" | "vertical" | "horizontal";
  direct?: boolean;
  curve?: "smooth" | "straight" | "step";
  references?: boolean;
  /** A diverging stack shows ages by sex, as a population pyramid. */
  diverging?: boolean;
  /** Picks out one series, or one region in a slope chart. */
  focus?: boolean;
  /** Draws the 12-month licences as a line over the bars. */
  composite?: boolean;
  /** Projects the year's last three months, dashed, with a band for their range. */
  projection?: boolean;
  brush?: boolean;
  /** Lays the chart out from its parts, with the key beneath the plot. */
  parts?: boolean;
};

// Rod fishing licences sold each month, in thousands. The figures are made up.
const months = [
  ["Jan", 4, 2, 21],
  ["Feb", 5, 2, 24],
  ["Mar", 11, 5, 48],
  ["Apr", 18, 9, 62],
  ["May", 24, 12, 55],
  ["Jun", 31, 15, 41],
  ["Jul", 38, 19, 33],
  ["Aug", 41, 21, 29],
  ["Sep", 27, 13, 22],
  ["Oct", 15, 7, 18],
  ["Nov", 7, 3, 14],
  ["Dec", 5, 2, 16],
].map(([month, day, week, year]) => ({ month, day, week, year }));

const series = [
  { key: "day", label: "1 day" },
  { key: "week", label: "8 days" },
  { key: "year", label: "12 months" },
];

// The same year with its last three months still to come, and 12-month sales projected with a
// range.
const projected = months.map((month, index) => {
  const ahead = index >= 9;
  const year = Number(month.year);
  return {
    ...month,
    year: ahead ? null : year,
    projected: index >= 8 ? year : null,
    low: index >= 8 ? year - (index - 8) * 3 : null,
    high: index >= 8 ? year + (index - 8) * 3 : null,
  };
});

// The same sales by quarter. Bars side by side need few categories, while a line takes many.
const quarters = ["Jan to Mar", "Apr to Jun", "Jul to Sep", "Oct to Dec"].map((quarter, index) => {
  const sum = (key: "day" | "week" | "year") =>
    months.slice(index * 3, index * 3 + 3).reduce((total, month) => total + Number(month[key]), 0);
  return { quarter, day: sum("day"), week: sum("week"), year: sum("year") };
});

const totals = series.map(({ key, label }) => ({
  licence: label,
  sold: months.reduce((sum, month) => sum + Number(month[key as "day" | "week" | "year"]), 0),
}));

// Licences sold by region in each of two years, in thousands, ranked by the latest.
const regions = [
  ["South West", 118, 131],
  ["South East", 102, 109],
  ["East of England", 84, 91],
  ["North West", 77, 74],
  ["Yorkshire and the Humber", 69, 73],
  ["East Midlands", 61, 66],
  ["West Midlands", 58, 57],
  ["North East", 31, 36],
  ["London", 24, 22],
].map(([region, before, latest]) => ({ region, before, latest }));

// Each region's anglers, in thousands, against the licences they bought, with its population.
const uptake = [
  ["South West", 176, 131, 5.7],
  ["South East", 198, 109, 9.3],
  ["East of England", 142, 91, 6.4],
  ["North West", 151, 74, 7.5],
  ["Yorkshire and the Humber", 128, 73, 5.5],
  ["East Midlands", 109, 66, 4.9],
  ["West Midlands", 116, 57, 6.0],
  ["North East", 54, 36, 2.7],
  ["London", 71, 22, 8.9],
].map(([region, anglers, licences, people]) => ({ region, anglers, licences, people }));

// Licence holders by age and sex, in thousands. One sex runs the other way from the baseline.
const ages = [
  ["Under 16", 48, 21],
  ["16 to 24", 61, 19],
  ["25 to 34", 89, 27],
  ["35 to 44", 112, 31],
  ["45 to 54", 134, 29],
  ["55 to 64", 141, 24],
  ["65 and over", 97, 12],
].map(([age, men, women]) => ({ age, men: -Number(men), women }));

// The licensing budget, in millions of pounds, from one year's total to the next.
const budget = [
  ["2024", 41.2],
  ["Higher fees", 3.1],
  ["More anglers", 2.4],
  ["Concessions", -1.6],
  ["Refunds", -0.8],
  ["Enforcement", -1.1],
  ["2025", 43.2],
].map(([step, change]) => ({ step, change }));

// Days to issue a licence by post in each region, with the quickest, the quartiles and the slowest.
const waits = [
  ["South West", 2, 4, 6, 9, 17],
  ["South East", 3, 5, 7, 10, 21],
  ["North West", 2, 3, 5, 8, 14],
  ["North East", 1, 3, 4, 6, 11],
  ["London", 4, 7, 9, 13, 26],
].map(([region, quickest, lower, median, upper, slowest]) => ({
  region,
  quickest,
  lower,
  median,
  upper,
  slowest,
}));

// Applications waiting each week, on Monday, at the week's most and fewest, and on Friday.
const queue = [
  ["2 Jun", 820, 1140, 760, 1010],
  ["9 Jun", 1010, 1320, 940, 1260],
  ["16 Jun", 1260, 1410, 1080, 1120],
  ["23 Jun", 1120, 1190, 860, 900],
  ["30 Jun", 900, 1240, 880, 1180],
  ["7 Jul", 1180, 1210, 970, 990],
  ["14 Jul", 990, 1050, 720, 760],
  ["21 Jul", 760, 980, 700, 940],
].map(([week, monday, most, fewest, friday]) => ({ week, monday, most, fewest, friday }));

// Licences bought online, in thousands, by day of the week and time of day.
const hours = [
  ["Monday", 3.1, 6.2, 5.4, 4.8, 7.9],
  ["Tuesday", 2.8, 5.9, 5.1, 4.6, 7.2],
  ["Wednesday", 2.9, 5.7, 5.3, 4.9, 7.6],
  ["Thursday", 3.3, 6.1, 5.6, 5.8, 9.4],
  ["Friday", 4.6, 7.4, 8.1, 9.9, 12.8],
  ["Saturday", 9.8, 11.2, 6.3, 3.9, 2.7],
  ["Sunday", 7.1, 8.4, 5.2, 3.1, 2.2],
].map(([day, early, morning, afternoon, evening, night]) => ({
  day,
  early,
  morning,
  afternoon,
  evening,
  night,
}));

// People through each step of applying online.
const steps = [
  ["Started", 48200],
  ["Checked eligibility", 41900],
  ["Entered details", 37300],
  ["Paid", 33800],
  ["Licence issued", 33500],
].map(([step, people]) => ({ step, people }));

// How buyers of each licence rated the service, out of 100.
const ratings = [
  ["Ease", 82, 78, 88],
  ["Speed", 74, 71, 69],
  ["Clarity", 66, 72, 81],
  ["Price", 58, 63, 71],
  ["Support", 61, 68, 77],
].map(([measure, day, week, year]) => ({ measure, day, week, year }));

// How licences were paid for online, as a share of payments.
const payments = [
  ["Card", 61],
  ["Apple Pay", 18],
  ["Google Pay", 11],
  ["Direct Debit", 7],
  ["Post Office", 3],
].map(([method, payments]) => ({ method, payments }));

// The same figures, made up the same way every time, from a seed.
const random = (seed: number) => () => {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
};

// Days to issue each of 420 licences applied for by post in 2025. Most take a week, and a few take
// far longer.
const next = random(7);
const issued = Array.from({ length: 420 }, (_, index) => {
  const days = 2 + (next() + next() + next()) * 3 + (next() < 0.12 ? next() * 18 : 0);
  return { application: `Application ${index + 1}`, days: Math.round(days) };
});

// The share of anglers who bought a licence, in each of 48 council areas, in 2024 and 2025.
const share = random(11);
const areas = [
  "Cornwall",
  "Devon",
  "Somerset",
  "Dorset",
  "Wiltshire",
  "Gloucestershire",
  "Herefordshire",
  "Shropshire",
  "Worcestershire",
  "Warwickshire",
  "Staffordshire",
  "Derbyshire",
  "Nottinghamshire",
  "Leicestershire",
  "Lincolnshire",
  "Rutland",
  "North Northamptonshire",
  "Cambridgeshire",
  "Norfolk",
  "Suffolk",
  "Essex",
  "Hertfordshire",
  "Bedford",
  "Buckinghamshire",
  "Oxfordshire",
  "West Berkshire",
  "Hampshire",
  "Isle of Wight",
  "West Sussex",
  "East Sussex",
  "Kent",
  "Surrey",
  "Cumberland",
  "Westmorland and Furness",
  "Lancashire",
  "Cheshire East",
  "North Yorkshire",
  "East Riding of Yorkshire",
  "Northumberland",
  "County Durham",
  "Leeds",
  "Sheffield",
  "Bradford",
  "Manchester",
  "Liverpool",
  "Birmingham",
  "Bristol",
  "Plymouth",
].map((area) => {
  const before = Math.round(52 + share() * 30 + (share() - 0.5) * 10);
  return { area, before, latest: Math.min(98, Math.round(before + (share() - 0.35) * 14)) };
});

const thousands = (value: number) => `${value}k`;
const target = (references: boolean) => (references ? [{ at: 100, label: "Target" }] : undefined);
const source = "Source: made-up figures for this example";

export default function ChartExample({
  type = "line",
  stacked = false,
  normalise = false,
  orientation: chosen = "auto",
  direct = false,
  curve = "smooth",
  references = false,
  diverging = false,
  focus = false,
  composite = false,
  projection = false,
  brush = false,
  parts = false,
}: Props) {
  const orientation = chosen === "auto" ? undefined : chosen;
  if (type === "bar" && stacked && orientation === "horizontal" && diverging)
    return (
      <Chart
        type="bar"
        orientation="horizontal"
        stacked
        diverging
        direct={direct}
        references={references ? [{ at: "45 to 54", label: "Median age" }] : undefined}
        title="Most licence holders are men in their forties and fifties"
        subtitle="Rod fishing licence holders by age and sex, thousands"
        source={source}
        description="Men hold most licences at every age, and most of all between 45 and 64. Women hold most between 25 and 54."
        data={ages}
        category="age"
        series={[
          { key: "men", label: "Men" },
          { key: "women", label: "Women" },
        ]}
        format={thousands}
      />
    );
  if (type === "pie" || type === "donut")
    return (
      <Chart
        type={type}
        direct={direct}
        title="Most anglers buy a licence for the whole year"
        subtitle="Rod fishing licences sold in 2025, thousands"
        source={source}
        description="Licences for 12 months were the most sold, then 1-day licences, then 8-day licences."
        data={totals}
        category="licence"
        series={[{ key: "sold", label: "Licences sold, thousands" }]}
        format={thousands}
      />
    );
  if (type === "histogram")
    return (
      <Chart
        type="histogram"
        references={references ? [{ at: 10, label: "10-day promise" }] : undefined}
        title="Most licences by post take under a week, a few take three"
        subtitle="Days to issue each licence applied for by post, 2025, number of applications"
        source={source}
        description="Most of 420 licences applied for by post were issued in 4 to 9 days. A few took more than 15, the longest 26."
        data={issued}
        category="application"
        series={[{ key: "days", label: "Days to issue" }]}
        format={(value) => `${value}`}
      />
    );
  if (type === "beeswarm")
    return (
      <Chart
        type="beeswarm"
        highlight={focus ? "Cornwall" : undefined}
        references={references ? [{ at: 75, label: "Target" }] : undefined}
        title="Most council areas sold licences to more of their anglers"
        subtitle="Anglers who bought a licence, by council area, 2024 and 2025, per cent"
        source={source}
        description="In most of 48 council areas, between 55% and 85% of anglers bought a licence, and the share rose in most areas from 2024 to 2025."
        data={areas}
        category="area"
        series={[
          { key: "before", label: "2024" },
          { key: "latest", label: "2025" },
        ]}
        format={(value) => `${value}%`}
      />
    );
  if (type === "stream")
    return (
      <Chart
        type="stream"
        curve={curve}
        brush={brush}
        title="Short licences swell in summer, yearly ones in spring"
        subtitle="Rod fishing licences sold each month in 2025, thousands"
        source={source}
        description="Sales of all licences rise from winter to a peak between April and August. Yearly licences make up most sales in spring, and short licences most in summer."
        data={months}
        category="month"
        series={series}
        format={thousands}
      />
    );
  if (type === "dot")
    return (
      <Chart
        type="dot"
        orientation={orientation}
        direct={direct}
        highlight={focus ? "latest" : undefined}
        references={target(references)}
        title="Sales grew in most regions, and fell in three"
        subtitle="Rod fishing licences sold by region, 2024 and 2025, thousands"
        source={source}
        description="Sales grew in six of the nine regions, most in the South West. They fell in the North West, the West Midlands and London."
        data={regions}
        category="region"
        series={[
          { key: "before", label: "2024" },
          { key: "latest", label: "2025" },
        ]}
        format={thousands}
      />
    );
  if (type === "slope")
    return (
      <Chart
        type="slope"
        highlight={focus ? "London" : undefined}
        title="Sales grew in six regions, and fell in three"
        subtitle="Rod fishing licences sold by region, 2024 and 2025, thousands"
        source={source}
        description="Sales grew in six of the nine regions, most in the South West. They fell in the North West, the West Midlands and London."
        data={regions}
        category="region"
        series={[
          { key: "before", label: "2024" },
          { key: "latest", label: "2025" },
        ]}
        format={thousands}
      />
    );
  if (type === "lollipop")
    return (
      <Chart
        type="lollipop"
        orientation={orientation}
        direct={direct}
        references={target(references)}
        title="The South West sells the most licences"
        subtitle="Rod fishing licences sold by region, 2025, thousands"
        source={source}
        description="The South West sold 131 thousand licences, then the South East with 109 thousand. London sold the fewest, 22 thousand."
        data={regions}
        category="region"
        series={[{ key: "latest", label: "2025" }]}
        format={thousands}
      />
    );
  if (type === "waterfall")
    return (
      <Chart
        type="waterfall"
        orientation={orientation}
        direct={direct}
        totals={["2024", "2025"]}
        title="Higher fees and more anglers outweighed the year's costs"
        subtitle="The licensing budget, 2024 to 2025, £ millions"
        source={source}
        description="The budget rose from £41.2 million to £43.2 million. Higher fees and more anglers added £5.5 million, and concessions, refunds and enforcement took away £3.5 million."
        data={budget}
        category="step"
        series={[{ key: "change", label: "Change" }]}
        format={(value) => `£${value.toFixed(1)}m`}
      />
    );
  if (type === "box")
    return (
      <Chart
        type="box"
        orientation={orientation}
        references={references ? [{ at: 10, label: "10-day promise" }] : undefined}
        title="Licences by post take longest in London"
        subtitle="Days to issue a licence applied for by post, by region, 2025"
        source={source}
        description="Half of London's licences took 9 days or more, and the slowest took 26. Elsewhere the median was 4 to 7 days."
        data={waits}
        category="region"
        series={[
          { key: "quickest", label: "Quickest" },
          { key: "lower", label: "Lower quartile" },
          { key: "median", label: "Median" },
          { key: "upper", label: "Upper quartile" },
          { key: "slowest", label: "Slowest" },
        ]}
        format={(value) => `${value} days`}
      />
    );
  if (type === "candlestick")
    return (
      <Chart
        type="candlestick"
        references={references ? [{ at: 1000, label: "Target" }] : undefined}
        title="The queue grew through June, and has fallen since"
        subtitle="Applications waiting each week, from Monday to Friday, 2025"
        source={source}
        description="The queue rose from 820 to a peak of 1,410 in mid June. It has fallen in four of the five weeks since, to 940."
        data={queue}
        category="week"
        series={[
          { key: "monday", label: "Monday" },
          { key: "most", label: "Most" },
          { key: "fewest", label: "Fewest" },
          { key: "friday", label: "Friday" },
        ]}
      />
    );
  if (type === "heatmap")
    return (
      <Chart
        type="heatmap"
        title="Anglers buy on Friday evenings and Saturday mornings"
        subtitle="Licences bought online by day and time, 2025, thousands"
        source={source}
        description="Most licences are bought on Friday after 6pm, then on Saturday morning before the day's fishing. Few are bought on weekend evenings."
        data={hours}
        category="day"
        series={[
          { key: "early", label: "Before 9am" },
          { key: "morning", label: "9am to noon" },
          { key: "afternoon", label: "Noon to 3pm" },
          { key: "evening", label: "3pm to 6pm" },
          { key: "night", label: "After 6pm" },
        ]}
        format={thousands}
      />
    );
  if (type === "funnel")
    return (
      <Chart
        type="funnel"
        title="Most people who start applying online finish"
        subtitle="People through each step of applying online, 2025"
        source={source}
        description="Of 48,200 people who started, 33,500 were issued a licence, 70%. The most left while checking whether they were eligible."
        data={steps}
        category="step"
        series={[{ key: "people", label: "People" }]}
      />
    );
  if (type === "radar")
    return (
      <Chart
        type="radar"
        highlight={focus ? "year" : undefined}
        title="Buyers of yearly licences rate the service highest"
        subtitle="How buyers of each licence rated the service, 2025, out of 100"
        source={source}
        description="Buyers of 12-month licences rated clarity, price and support highest. Buyers of 1-day licences rated speed highest."
        data={ratings}
        category="measure"
        series={series}
        domain={[0, 100]}
      />
    );
  if (type === "radial")
    return (
      <Chart
        type="radial"
        direct={direct}
        title="Most anglers pay by card"
        subtitle="How licences were paid for online, 2025, share of payments"
        source={source}
        description="61% of payments were by card, then 18% by Apple Pay and 11% by Google Pay."
        data={payments}
        category="method"
        series={[{ key: "payments", label: "Share of payments" }]}
        format={(value) => `${value}%`}
        domain={[0, 100]}
      />
    );
  if (type === "scatter")
    return (
      <Chart
        type="scatter"
        direct={direct}
        references={target(references)}
        title="More anglers buy licences where fewer live"
        subtitle="Anglers and the licences they bought, by region, 2025, thousands. Each point's size is the region's population."
        source={source}
        description="Regions with more anglers sold more licences, apart from London and the North West, which sold fewer than their anglers would suggest."
        data={uptake}
        category="region"
        series={[
          { key: "anglers", label: "Anglers, thousands" },
          { key: "licences", label: "Licences sold, thousands" },
          { key: "people", label: "Population, millions", format: (value) => `${value}m` },
        ]}
        format={thousands}
      />
    );
  // A horizontal bar chart ranks the regions. Vertical and stacked, it shows the months. Side by
  // side, it shows the quarters, because three bars a month would be too many and too thin to read.
  if (type === "bar" && orientation === "horizontal")
    return (
      <Chart
        type="bar"
        orientation="horizontal"
        stacked={stacked}
        normalise={normalise}
        direct={direct}
        highlight={focus && !stacked ? "latest" : undefined}
        references={target(references)}
        title="The South West sells the most licences"
        subtitle="Rod fishing licences sold by region, 2025, thousands"
        source={source}
        description="The South West sold 131 thousand licences, then the South East with 109 thousand. London sold the fewest, 22 thousand."
        data={regions}
        category="region"
        series={
          stacked || focus
            ? [
                { key: "before", label: "2024" },
                { key: "latest", label: "2025" },
              ]
            : [{ key: "latest", label: "2025" }]
        }
        format={thousands}
      />
    );
  if (type === "bar" && !stacked)
    return (
      <Chart
        type="bar"
        direct={direct}
        brush={brush}
        highlight={focus ? "year" : undefined}
        references={target(references)}
        title="Short licences sell in summer, yearly ones in spring"
        subtitle="Rod fishing licences sold each quarter in 2025, thousands"
        source={source}
        description="Most 1-day and 8-day licences were sold from July to September. Most 12-month licences were sold from April to June, as the season opened."
        data={quarters}
        category="quarter"
        series={composite ? [...series.slice(0, 2), { ...series[2]!, as: "line" }] : series}
        format={thousands}
      />
    );
  if (projection && (type === "line" || type === "area"))
    return (
      <Chart
        type={type}
        direct={direct}
        curve={curve}
        brush={brush}
        title="Yearly licences should sell as well as last year"
        subtitle="Rod fishing licences sold each month in 2025, thousands, with October to December projected"
        source={source}
        description="Sales of 12-month licences are projected to fall to between 7 and 25 thousand in December, as in most years."
        data={projected}
        category="month"
        series={[
          { key: "year", label: "12 months" },
          {
            key: "projected",
            label: "Projected",
            dashed: true,
            continues: "year",
            range: ["low", "high"],
          },
        ]}
        format={thousands}
      />
    );
  // A chart can be laid out from its parts, in any order. Here its key sits beneath the plot.
  if (parts)
    return (
      <Chart
        type={type}
        stacked={stacked}
        normalise={normalise}
        curve={curve}
        brush={brush}
        highlight={focus ? "year" : undefined}
        description="Sales of 1-day and 8-day licences rise to a peak in August. Sales of 12-month licences peak in April, at the start of the season."
        data={months}
        category="month"
        series={series}
        format={thousands}
      >
        <FigureCaption
          title="Short licences peak in summer, yearly ones in spring"
          subtitle="Rod fishing licences sold each month in 2025, thousands"
        />
        <ChartPlot />
        <ChartBrush />
        <ChartKey />
        <FigureSource>{source}</FigureSource>
        <ChartTable />
      </Chart>
    );
  return (
    <Chart
      type={type}
      stacked={stacked}
      normalise={normalise}
      direct={direct}
      curve={curve}
      brush={brush}
      highlight={focus ? "year" : undefined}
      references={
        references
          ? [
              { at: "Mar", to: "Jun", label: "Close season" },
              { at: 30, label: "Target" },
            ]
          : undefined
      }
      title="Short licences peak in summer, yearly ones in spring"
      subtitle="Rod fishing licences sold each month in 2025, thousands"
      source={source}
      description="Sales of 1-day and 8-day licences rise to a peak in August. Sales of 12-month licences peak in April, at the start of the season."
      data={months}
      category="month"
      series={series}
      format={thousands}
    />
  );
}
