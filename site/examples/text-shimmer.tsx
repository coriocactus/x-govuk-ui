import { TextShimmer } from "x-govuk-ui";

export default function TextShimmerExample({ children = "Writing a suggestion…" }) {
  return (
    <p className="preview-shimmer" role="status">
      <TextShimmer>{children}</TextShimmer>
    </p>
  );
}
