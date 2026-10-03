import { Marker } from "x-govuk-ui";

type Props = { colour?: "yellow" | "blue" | "green" | "pink" };

export default function MarkerExample({ colour = "yellow" }: Props) {
  // A new colour draws the highlight again.
  return (
    <p key={colour} className="preview-citation-text">
      You must apply <Marker colour={colour}>at least 3 weeks before you travel</Marker>, and your
      photo must be <Marker colour={colour}>taken in the last month</Marker>.
    </p>
  );
}
