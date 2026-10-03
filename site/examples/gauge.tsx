import { Gauge } from "@x-govuk-ui/memetics";

type Props = {
  value?: number;
  sentiment?: "good" | "bad" | "neutral";
  size?: number;
  /** Marks the target of 90%. */
  target?: boolean;
};

export default function GaugeExample({
  value = 82,
  sentiment = "neutral",
  size = 180,
  target = true,
}: Props) {
  return (
    <Gauge
      label="Applications decided within 10 days"
      description="Week to 4 October 2026"
      value={value}
      target={target ? 90 : undefined}
      sentiment={sentiment}
      size={size}
      format={(figure) => `${figure}%`}
    />
  );
}
