import {
  EmptyState,
  EmptyStateDescription,
  EmptyStateTitle,
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
  type TagColour,
} from "x-govuk-ui";
import { dateText, type Licence, money, useApplications } from "../workspace-data";

const colours: Record<Licence, TagColour> = {
  "1 day": "green",
  "8 days": "teal",
  "12 months": "blue",
};

/**
 * The applications that need a decision, oldest first. The table follows the data, so each one
 * leaves as it is decided.
 */
export default function Decisions() {
  const applications = useApplications("decision");
  if (applications.length === 0)
    return (
      <EmptyState size="small">
        <EmptyStateTitle level={2}>Nothing needs a decision</EmptyStateTitle>
        <EmptyStateDescription>
          Every application is decided, or waits for its applicant.
        </EmptyStateDescription>
      </EmptyState>
    );
  return (
    <Table>
      <TableCaption>
        {applications.length === 1
          ? "1 application needs a decision"
          : `${applications.length} applications need a decision`}
      </TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Applicant</TableHead>
          <TableHead>Licence</TableHead>
          <TableHead numeric>Fee</TableHead>
          <TableHead>Received</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {applications.map((application) => (
          <TableRow key={application.reference}>
            <TableCell>
              <strong>{application.name}</strong>
              <br />
              {`${application.reference}: ${application.note}`}
            </TableCell>
            <TableCell>
              <Tag variant="outline" colour={colours[application.licence]}>
                {application.licence}
              </Tag>
            </TableCell>
            <TableCell numeric>{money(application.fee)}</TableCell>
            <TableCell>{dateText(application.received, { short: true })}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
