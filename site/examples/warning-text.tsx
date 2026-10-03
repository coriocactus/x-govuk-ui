import { WarningText } from "x-govuk-ui";

type Props = { children?: string; iconFallbackText?: string };

export default function WarningTextExample({
  children = "You can be fined up to £5,000 if you do not register.",
  iconFallbackText = "Warning",
}: Props) {
  return <WarningText iconFallbackText={iconFallbackText}>{children}</WarningText>;
}
