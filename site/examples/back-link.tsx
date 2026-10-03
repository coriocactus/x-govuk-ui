import { BackLink } from "x-govuk-ui";

type Props = { children?: string };

export default function BackLinkExample({ children = "Back" }: Props) {
  return <BackLink href="#previous">{children}</BackLink>;
}
