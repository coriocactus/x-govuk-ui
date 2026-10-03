import { BarList } from "@x-govuk-ui/memetics";

type Props = { caption?: string };

// Rod fishing licences sold by region in 2025, in thousands, ranked. The figures are made up.
const regions = [
  ["South West", 131],
  ["South East", 109],
  ["East of England", 91],
  ["North West", 74],
  ["Yorkshire and the Humber", 73],
  ["East Midlands", 66],
  ["West Midlands", 57],
  ["North East", 36],
  ["London", 22],
] as const;

export default function BarListExample({ caption = "Licences sold by region, 2025" }: Props) {
  return (
    <BarList
      caption={caption || undefined}
      nameLabel="Region"
      valueLabel="Licences sold"
      data={regions.map(([label, value]) => ({ label, value }))}
      format={(value) => `${value}k`}
    />
  );
}
