import { ChoroplethMap } from "@x-govuk-ui/memetics";
import { regions } from "./geography/england-regions";

type Props = {
  /** Leaves London without a figure, as an area the figures do not cover. */
  missing?: boolean;
};

// Rod fishing licences sold in 2025 for every 1,000 people in each region. The figures are made up.
const licences: Record<string, number> = {
  E12000001: 13.3,
  E12000002: 9.9,
  E12000003: 13.3,
  E12000004: 13.5,
  E12000005: 9.5,
  E12000006: 14.2,
  E12000007: 2.5,
  E12000008: 11.7,
  E12000009: 23.0,
};

export default function ChoroplethMapExample({ missing = false }: Props) {
  const data = missing
    ? Object.fromEntries(Object.entries(licences).filter(([code]) => code !== "E12000007"))
    : licences;
  return (
    <ChoroplethMap
      title="The South West sells the most licences for its people, London the fewest"
      subtitle="Rod fishing licences sold in 2025 for every 1,000 people, by region"
      source="Source: made-up figures. Boundaries from the Office for National Statistics, under the Open Government Licence v3.0. Contains OS data © Crown copyright and database right 2024."
      description="The South West sold 23 licences for every 1,000 people, the most of any region. London sold 2.5, the fewest. Most regions sold between 10 and 14."
      areas={regions}
      data={data}
      label="Licences per 1,000 people"
      nameLabel="Region"
      format={(value) => value.toLocaleString("en-GB", { maximumFractionDigits: 1 })}
    />
  );
}
