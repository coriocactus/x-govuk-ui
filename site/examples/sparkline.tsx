import { Sparkline } from "@x-govuk-ui/memetics";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "x-govuk-ui";

type Props = {
  area?: boolean;
  curve?: "smooth" | "straight" | "step";
  sentiment?: "good" | "bad" | "neutral";
};

// Rod fishing licences sold each month in 2025 in five regions, in thousands. The figures are
// made up, and the North East's July is missing.
const regions = [
  ["South West", [3, 4, 9, 14, 19, 24, 29, 31, 21, 12, 5, 4]],
  ["South East", [2, 3, 7, 12, 16, 20, 25, 27, 18, 10, 4, 3]],
  ["North West", [1, 2, 5, 8, 11, 14, 18, 19, 13, 7, 3, 2]],
  ["North East", [1, 1, 2, 4, 5, 6, null, 8, 5, 3, 1, 1]],
  ["London", [1, 1, 2, 3, 4, 5, 6, 6, 4, 2, 1, 1]],
] as const;

export default function SparklineExample({
  area = true,
  curve = "smooth",
  sentiment = "neutral",
}: Props) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Region</TableHead>
          <TableHead numeric>Sold in 2025</TableHead>
          <TableHead>Each month</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {regions.map(([region, months]) => {
          const sold = months.reduce<number>((sum, month) => sum + (month ?? 0), 0);
          const peak = Math.max(...months.map((month) => month ?? 0));
          return (
            <TableRow key={region}>
              <TableHead>{region}</TableHead>
              <TableCell numeric>{sold}k</TableCell>
              <TableCell>
                <Sparkline
                  data={months}
                  area={area}
                  curve={curve}
                  sentiment={sentiment}
                  description={`Sales rose from ${months[0]} thousand in January to ${peak} thousand in August, and fell to ${months[11]} thousand in December.`}
                />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
