import {
  Figure,
  FigureCaption,
  FigureData,
  FigureSource,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "x-govuk-ui";

type Props = {
  /** Says what is measured, beneath the headline. */
  subtitle?: boolean;
  /** Says where the figures come from, at the foot. */
  source?: boolean;
  /** Adds the figures as a table beneath, as a drawing needs. */
  figures?: boolean;
};

const ways = [
  { name: "Online", share: 0.71 },
  { name: "By phone", share: 0.18 },
  { name: "At a Post Office", share: 0.11 },
];

export default function FigureExample({ subtitle = true, source = true, figures = true }: Props) {
  return (
    <Figure>
      <FigureCaption
        title="Most licences are bought online"
        subtitle={
          subtitle ? "Rod fishing licences sold in 2025, by how they were bought" : undefined
        }
      />
      {/* A service's own drawing, a picture for screen readers, described in a sentence. */}
      <svg
        role="img"
        aria-label="Seven in ten licences were bought online, and fewer than one in five by phone."
        viewBox="0 0 480 96"
        width="100%"
        style={{ maxWidth: 480, display: "block", fontFamily: "inherit" }}
      >
        {ways.map((way, index) => (
          <g key={way.name} transform={`translate(0 ${index * 32})`}>
            <rect width={way.share * 320} height={22} rx={2} fill="var(--x-govuk-ui-brand)" />
            <text x={way.share * 320 + 8} y={16} fontSize={16} fill="currentColor">
              {way.name}
            </text>
          </g>
        ))}
      </svg>
      {source && <FigureSource>Source: made-up figures for this example</FigureSource>}
      {figures && (
        <FigureData>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>How bought</TableHead>
                <TableHead numeric>Share</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ways.map((way) => (
                <TableRow key={way.name}>
                  <TableHead>{way.name}</TableHead>
                  <TableCell numeric>{Math.round(way.share * 100)}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </FigureData>
      )}
    </Figure>
  );
}
