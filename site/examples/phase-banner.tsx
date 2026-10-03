import { PhaseBanner } from "x-govuk-ui";

type Props = { tag?: "Alpha" | "Beta" };

export default function PhaseBannerExample({ tag = "Beta" }: Props) {
  return (
    <PhaseBanner tag={tag}>
      This is a new service. Help us improve it and <a href="#feedback">give your feedback</a>.
    </PhaseBanner>
  );
}
