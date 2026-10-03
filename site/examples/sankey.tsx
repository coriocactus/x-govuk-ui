import { Sankey } from "@x-govuk-ui/memetics";

// How 34,600 applications for a rod fishing licence arrived and were decided in 2025. Made up.
const applications = [
  { from: "Online", to: "Issued at once", value: 26400 },
  { from: "Online", to: "Checked by a caseworker", value: 3700 },
  { from: "By phone", to: "Issued at once", value: 2100 },
  { from: "By phone", to: "Checked by a caseworker", value: 800 },
  { from: "By post", to: "Checked by a caseworker", value: 1600 },
  { from: "Checked by a caseworker", to: "Issued after checks", value: 5000 },
  { from: "Checked by a caseworker", to: "Refused", value: 1100 },
];

export default function SankeyExample() {
  return (
    <Sankey
      title="Most licences are issued at once, and few are refused"
      subtitle="Applications for a rod fishing licence, by how they arrived and were decided, 2025"
      source="Source: made-up figures for this example"
      description="Of 34,600 applications, 28,500 were issued at once. Caseworkers checked 6,100, every one sent by post among them, and refused 1,100."
      links={applications}
      valueLabel="Applications"
    />
  );
}
