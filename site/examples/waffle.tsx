import { Waffle } from "@x-govuk-ui/memetics";

type Props = {
  rows?: number;
  columns?: number;
  /** Counts everyone asked, so the 12 who did not answer leave their cells empty. */
  total?: boolean;
};

// How 100 anglers asked had heard about rod fishing licences. The figures are made up.
const answers = [
  { label: "Searching online", value: 34 },
  { label: "An angling club", value: 22 },
  { label: "A tackle shop", value: 15 },
  { label: "Friends or family", value: 12 },
  { label: "Somewhere else", value: 5 },
];

export default function WaffleExample({ rows = 10, columns = 10, total = true }: Props) {
  return <Waffle data={answers} total={total ? 100 : undefined} rows={rows} columns={columns} />;
}
