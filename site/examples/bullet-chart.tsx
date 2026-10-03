import { BulletChart } from "@x-govuk-ui/memetics";

type Props = {
  /** Shades the bands behind each bar and names them in a key. */
  bands?: boolean;
  /** Marks each measure's target. */
  targets?: boolean;
};

const thousands = (value: number) => `${(value / 1000).toLocaleString("en-GB")}k`;

export default function BulletChartExample({ bands = true, targets = true }: Props) {
  return (
    <div style={{ display: "grid", gap: 28 }}>
      <BulletChart
        label="Licences sold this week"
        value={4200}
        target={targets ? 5000 : undefined}
        ranges={
          bands
            ? [
                { to: 3000, label: "Poor" },
                { to: 4500, label: "Fair" },
                { to: 6000, label: "Good" },
              ]
            : undefined
        }
        format={thousands}
      />
      <BulletChart
        label="Applications decided within 10 days"
        value={82}
        target={targets ? 90 : undefined}
        ranges={
          bands
            ? [
                { to: 70, label: "Poor" },
                { to: 85, label: "Fair" },
                { to: 100, label: "Good" },
              ]
            : undefined
        }
        max={100}
        format={(value) => `${value}%`}
      />
      <BulletChart
        label="Anglers satisfied with the service"
        description="Asked after buying a licence online"
        value={76}
        target={targets ? 80 : undefined}
        ranges={
          bands
            ? [
                { to: 60, label: "Poor" },
                { to: 75, label: "Fair" },
                { to: 100, label: "Good" },
              ]
            : undefined
        }
        max={100}
        format={(value) => `${value}%`}
      />
    </div>
  );
}
