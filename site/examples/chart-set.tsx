import { ChartSet } from "@x-govuk-ui/memetics";

type Props = { type?: "line" | "bar"; columns?: number; stacked?: boolean };

// Rod fishing licences sold each month in four regions, in thousands. The figures are made up.
const regions = {
  "South West": [3, 4, 9, 14, 19, 24, 29, 31, 21, 12, 5, 4],
  "South East": [2, 3, 7, 12, 16, 20, 25, 27, 18, 10, 4, 3],
  "North West": [1, 2, 5, 8, 11, 14, 18, 19, 13, 7, 3, 2],
  London: [1, 1, 2, 3, 4, 5, 6, 6, 4, 2, 1, 1],
};
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Each region's sales, with a third of them short licences and the rest for the year.
const dataFor = (sales: number[]) =>
  sales.map((sold, index) => ({
    month: months[index] ?? "",
    short: Math.round(sold / 3),
    year: sold - Math.round(sold / 3),
  }));

const series = [
  { key: "short", label: "1 or 8 days" },
  { key: "year", label: "12 months" },
];

export default function ChartSetExample({ type = "line", columns = 2, stacked = true }: Props) {
  return (
    <ChartSet
      columns={columns}
      title="Every region peaks in August, and the South West sells most"
      subtitle="Rod fishing licences sold each month in 2025, thousands"
      source="Source: made-up figures for this example"
      description="Sales in every region rise through spring to a peak in August and fall away by winter. The South West sells the most each month, and London the fewest."
      panels={Object.entries(regions).map(([region, sales]) => ({
        type,
        stacked,
        title: region,
        description: `Sales in ${region} peak in August at ${Math.max(...sales)} thousand.`,
        data: dataFor(sales),
        category: "month",
        series,
        format: (value: number) => `${value}k`,
      }))}
    />
  );
}
