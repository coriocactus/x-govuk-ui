import { Avatar, DataTable, type DataTableColumn, Tag, type TagColour } from "x-govuk-ui";

type Props = { selectable?: boolean; pinned?: number };

type Partner = {
  name: string;
  kind: string;
  stage: "Applied" | "Reviewing" | "Funded";
  team: string;
  projects: number;
  funding: number;
  likelihood: number;
  review: string;
};

const partners: Partner[] = [
  ["Northfield Borough Council", "Council", "Funded", "Grants", 7, 612400, 84, "12 Mar"],
  ["Westmere NHS Trust", "NHS", "Applied", "Partnerships", 6, 548900, 27, "11 Sep"],
  ["Ashby Community Trust", "Charity", "Applied", "Grants", 4, 497210, 46, "9 Sep"],
  ["Kingsbridge University", "University", "Reviewing", "Research", 3, 451030, 39, "14 Jun"],
  ["Harbour Water", "Utility", "Funded", "Partnerships", 8, 438000, 71, "21 Feb"],
  ["Fenwick Parish Council", "Council", "Reviewing", "Grants", 5, 402560, 22, "12 Aug"],
  ["Moorland Fire Service", "Emergency", "Funded", "Operations", 9, 389120, 88, "15 Mar"],
  ["Riverside Housing", "Housing", "Applied", "Partnerships", 4, 356800, 53, "22 Feb"],
  ["Eastgate College", "Education", "Reviewing", "Research", 6, 331470, 36, "8 Aug"],
  ["Coastal Transport Board", "Transport", "Funded", "Operations", 5, 308300, 62, "28 Mar"],
  ["Hillcrest Library Service", "Library", "Applied", "Grants", 2, 287910, 79, "17 Mar"],
  ["Brookvale Police", "Emergency", "Reviewing", "Operations", 3, 276440, 68, "18 Jun"],
  ["Southwold Museum Trust", "Charity", "Funded", "Grants", 3, 259700, 50, "18 Sep"],
  ["Greenacre Farms Network", "Rural", "Applied", "Partnerships", 5, 241150, 57, "1 Jul"],
  ["Thornbury Health Board", "NHS", "Reviewing", "Partnerships", 7, 236980, 74, "3 Apr"],
  ["Lowfield Arts Council", "Arts", "Applied", "Grants", 2, 214600, 31, "19 May"],
].map(([name, kind, stage, team, projects, funding, likelihood, review]) => ({
  name,
  kind,
  stage,
  team,
  projects,
  funding,
  likelihood,
  review,
})) as Partner[];

const stages: Record<Partner["stage"], TagColour> = {
  Applied: "blue",
  Reviewing: "yellow",
  Funded: "green",
};
const pounds = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});
const icon = (path: string) => (
  <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
    <path d={path} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const columns: DataTableColumn<Partner>[] = [
  {
    id: "name",
    header: "Organisation",
    icon: icon("M3 14V3.5L8 2l5 1.5V14M2 14h12M6 6h1M9 6h1M6 9h1M9 9h1"),
    width: 240,
    minWidth: 140,
    sortBy: (partner) => partner.name,
    cell: (partner) => (
      <span className="preview-organisation">
        <span className="preview-organisation-mark" aria-hidden="true">
          {partner.name[0]}
        </span>
        {partner.name}
      </span>
    ),
  },
  {
    id: "kind",
    header: "Type and stage",
    icon: icon("M2.5 2.5h5.5l5.5 5.5-5.5 5.5-5.5-5.5zM5.5 5.5h.1"),
    width: 210,
    cell: (partner) => (
      <span className="preview-tags">
        <Tag colour="grey">{partner.kind}</Tag>
        <Tag colour={stages[partner.stage]}>{partner.stage}</Tag>
      </span>
    ),
    summary: {
      label: "Types",
      value: (rows) => new Set(rows.map((partner) => partner.kind)).size,
    },
  },
  {
    id: "team",
    header: "Lead team",
    icon: icon(
      "M5.5 7a2.5 2.5 0 1 0 0-.1M1.5 14c0-2.5 2-4 4-4s4 1.5 4 4M11 4.5a2 2 0 1 1 0 4M12 10c1.5.4 2.5 1.8 2.5 4",
    ),
    width: 170,
    sortBy: (partner) => partner.team,
    cell: (partner) => (
      <span className="preview-person">
        <Avatar name={partner.team} size="small" />
        {partner.team}
      </span>
    ),
  },
  {
    id: "projects",
    header: "Projects",
    icon: icon("M2 4.5h12v9H2zM5.5 4.5V2.5h5v2"),
    width: 116,
    numeric: true,
    sortBy: (partner) => partner.projects,
    cell: (partner) => partner.projects,
    summary: {
      label: "Sum",
      value: (rows) => rows.reduce((sum, partner) => sum + partner.projects, 0),
    },
  },
  {
    id: "funding",
    header: "Funding",
    icon: icon("M10.5 4.5A3 3 0 0 0 5.5 6.5v6.5h6M3.5 9h5"),
    width: 140,
    numeric: true,
    sortBy: (partner) => partner.funding,
    cell: (partner) => pounds.format(partner.funding),
    summary: {
      label: "Sum",
      value: (rows) => pounds.format(rows.reduce((sum, partner) => sum + partner.funding, 0)),
    },
  },
  {
    id: "likelihood",
    header: "Likelihood",
    icon: icon("M2 13.5h12M4 11V8M8 11V4.5M12 11V6.5"),
    width: 150,
    sortBy: (partner) => partner.likelihood,
    cell: (partner) => (
      <span className="preview-likelihood">
        <span className="preview-likelihood-bar" aria-hidden="true">
          <span style={{ width: `${partner.likelihood}%` }} />
        </span>
        {partner.likelihood}%
      </span>
    ),
    summary: {
      label: "Average",
      value: (rows) =>
        `${Math.round(rows.reduce((sum, partner) => sum + partner.likelihood, 0) / rows.length)}%`,
    },
  },
  {
    id: "review",
    header: "Next review",
    icon: icon("M2.5 4h11v9.5h-11zM2.5 7h11M5.5 2.5v3M10.5 2.5v3"),
    width: 130,
    cell: (partner) => partner.review,
  },
];

export default function DataTableExample({ selectable = true, pinned = 1 }: Props) {
  return (
    <DataTable
      label="Partner organisations"
      columns={columns}
      rows={partners}
      rowKey={(partner) => partner.name}
      rowName={(partner) => partner.name}
      pinned={pinned}
      selectable={selectable}
      count={(count) => `${count} organisations`}
    />
  );
}
