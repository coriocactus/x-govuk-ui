import { InsetText } from "x-govuk-ui";

export default function InsetTextExample({
  children = "It can take up to 8 weeks to register a lasting power of attorney if there are no mistakes in the application.",
}) {
  return <InsetText>{children}</InsetText>;
}
