import { GridColumn, GridRow, WidthContainer } from "x-govuk-ui";

type Layout = "two-thirds" | "halves" | "thirds" | "quarters";
type Props = { width?: number; gutters?: boolean; layout?: Layout };

const layouts = {
  "two-thirds": [
    ["main", "two-thirds"],
    ["aside", "one-third"],
  ],
  halves: [
    ["first", "one-half"],
    ["second", "one-half"],
  ],
  thirds: [
    ["first", "one-third"],
    ["second", "one-third"],
    ["third", "one-third"],
  ],
  quarters: [
    ["first", "one-quarter"],
    ["second", "one-quarter"],
    ["third", "one-quarter"],
    ["fourth", "one-quarter"],
  ],
} as const;

const names = {
  "two-thirds": "Two-thirds",
  "one-third": "One-third",
  "one-half": "One-half",
  "one-quarter": "One-quarter",
};

export default function WidthContainerExample({
  width = 960,
  gutters = true,
  layout = "two-thirds",
}: Props) {
  return (
    // The tinted band stands for the screen, and the dashed line marks the container's edges.
    <div className="preview-screen">
      <WidthContainer width={width} gutters={gutters} className="preview-container">
        <GridRow>
          {layouts[layout].map(([place, share]) => (
            <GridColumn key={`${layout}-${place}`} width={share}>
              <div className="preview-column">{names[share]}</div>
            </GridColumn>
          ))}
        </GridRow>
      </WidthContainer>
    </div>
  );
}
