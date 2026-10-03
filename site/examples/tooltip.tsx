import { Button, Tooltip, TooltipGroup, TooltipProvider, type TooltipSide } from "x-govuk-ui";

type Props = { side?: TooltipSide; disabled?: boolean; arrow?: boolean; grouped?: boolean };

const actions = [
  { label: "Print this page", shortcut: "⌘ P", path: "M7 9V3h10v6M7 17H4V9h16v8h-3M7 14h10v7H7z" },
  { label: "Download as a PDF", path: "M12 3v12m-5-5 5 5 5-5M4 21h16" },
  { label: "Share by email", path: "M3 6h18v12H3zM3 7l9 6 9-6" },
  {
    label: "Report a problem with this page",
    path: "M12 9v4m0 4h.01M10.3 4 2.6 18a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4a2 2 0 0 0-3.4 0",
  },
];

export default function TooltipExample({
  side = "top",
  disabled = false,
  arrow = false,
  grouped = true,
}: Props) {
  const buttons = (
    <div className="preview-icon-buttons">
      {actions.map((action) => (
        <Tooltip
          key={action.label}
          content={action.label}
          shortcut={action.shortcut}
          side={side}
          disabled={disabled}
          arrow={arrow}
        >
          <Button variant="quiet" size="icon" aria-label={action.label}>
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d={action.path} />
            </svg>
          </Button>
        </Tooltip>
      ))}
    </div>
  );
  // In a group, one tooltip glides between the buttons. Without one, a TooltipProvider still opens
  // the next tooltip at once after the first.
  return grouped ? (
    <TooltipGroup side={side} arrow={arrow}>
      {buttons}
    </TooltipGroup>
  ) : (
    <TooltipProvider>{buttons}</TooltipProvider>
  );
}
