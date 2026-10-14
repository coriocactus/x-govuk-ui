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
} from "x-govuk-ui";
import { licenceColours, money, shortDate, useApplications } from "../workspace-data";

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
              <Tag variant="outline" colour={licenceColours[application.licence]}>
                {application.licence}
              </Tag>
            </TableCell>
            <TableCell numeric>{money(application.fee)}</TableCell>
            <TableCell>{shortDate(application.received)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
