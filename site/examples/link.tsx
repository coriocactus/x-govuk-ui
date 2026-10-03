import { Link } from "x-govuk-ui";

type Props = {
  children?: string;
  colour?: "link" | "text" | "inverse";
  underline?: boolean;
  visited?: boolean;
  newTab?: boolean;
};

export default function LinkExample({
  children = "guidance on photos",
  colour = "link",
  underline = true,
  visited = true,
  newTab = false,
}: Props) {
  return (
    <p className="preview-link-text" data-inverse={colour === "inverse" || undefined}>
      Read the{" "}
      <Link
        href="#guidance-on-photos"
        colour={colour}
        underline={underline}
        visited={visited}
        newTab={newTab}
      >
        {children}
      </Link>{" "}
      before you apply.
    </p>
  );
}
