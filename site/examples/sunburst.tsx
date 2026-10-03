import { type ChartNode, Sunburst } from "@x-govuk-ui/memetics";

// Where the money from rod fishing licences went in 2025, in millions of pounds. Made up.
const spending: ChartNode[] = [
  {
    name: "Enforcement",
    children: [
      { name: "Bailiffs", value: 9.8 },
      { name: "Patrols", value: 4.1 },
      { name: "Investigations", value: 2.3 },
    ],
  },
  {
    name: "Fish stocks",
    children: [
      { name: "Habitat", value: 5.9 },
      { name: "Hatcheries", value: 5.2 },
      { name: "Surveys", value: 3.1 },
    ],
  },
  {
    name: "Running the service",
    children: [
      { name: "Licensing", value: 3.6 },
      { name: "Digital", value: 2.2 },
      { name: "Contact centre", value: 1.4 },
    ],
  },
  {
    name: "Access",
    children: [
      { name: "Fisheries", value: 4.4 },
      { name: "Accessible pegs", value: 1.2 },
    ],
  },
];

export default function SunburstExample() {
  return (
    <Sunburst
      title="Over a third of licence money pays for enforcement"
      subtitle="Spending of rod fishing licence money, 2025, £ millions"
      source="Source: made-up figures for this example"
      description="Enforcement took £16.2 million of £43.2 million, most of it for bailiffs. Fish stocks took £14.2 million, running the service £7.2 million and access £5.6 million."
      data={spending}
      nameLabel="Spending"
      valueLabel="£ millions"
      format={(value) => `£${value.toFixed(1)}m`}
    />
  );
}
