import {
  Button,
  EmptyState,
  EmptyStateActions,
  EmptyStateDescription,
  EmptyStateMedia,
  EmptyStateTitle,
} from "x-govuk-ui";

type Props = {
  size?: "medium" | "small";
  /** Shows an icon above the title. */
  media?: boolean;
  /** Shows the ways forward. */
  actions?: boolean;
};

export default function EmptyStateExample({
  size = "medium",
  media = true,
  actions = true,
}: Props) {
  return (
    <EmptyState size={size}>
      {media && (
        <EmptyStateMedia>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            aria-hidden="true"
          >
            <path d="M6 3h8l4 4v14H6zM14 3v4h4M9 12h6M9 16h4" strokeLinejoin="round" />
          </svg>
        </EmptyStateMedia>
      )}
      <EmptyStateTitle>You have no applications yet</EmptyStateTitle>
      <EmptyStateDescription>
        Applications you start will appear here, so you can come back to them.
      </EmptyStateDescription>
      {actions && (
        <EmptyStateActions>
          <Button>Start an application</Button>
          <Button variant="secondary">Find a saved application</Button>
        </EmptyStateActions>
      )}
    </EmptyState>
  );
}
