import { GridColumn, GridRow, Inline, Stack, WidthContainer } from "x-govuk-ui";

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
    // The tinted band stands for the screen, and the dashed line marks the container's edges. A
    // stack sets the row and a line beneath it, as a page sets its parts.
    <div className="preview-screen">
      <WidthContainer width={width} gutters={gutters} className="preview-container">
        <Stack>
          <GridRow>
            {layouts[layout].map(([place, share]) => (
              <GridColumn key={`${layout}-${place}`} width={share}>
                <div className="preview-column">{names[share]}</div>
              </GridColumn>
            ))}
          </GridRow>
          <Inline>
            <div className="preview-column">Side</div>
            <div className="preview-column">by side</div>
          </Inline>
        </Stack>
      </WidthContainer>
    </div>
  );
}
