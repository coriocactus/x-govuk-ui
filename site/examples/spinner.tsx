import { Spinner } from "x-govuk-ui";

type Props = { size?: "small" | "medium" | "large"; label?: string };

export default function SpinnerExample({ size = "large", label = "Checking your details" }: Props) {
  return (
    <div className="preview-spinner">
      <Spinner size={size} label={label || undefined} />
    </div>
  );
}
