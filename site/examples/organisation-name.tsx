import type { ReactNode } from "react";
import { OrganisationName } from "x-govuk-ui";

type Props = { children?: ReactNode; colour?: string; crest?: string };

// GOV.UK Frontend's colour for the department, its govuk-organisation-colour.
export default function OrganisationNameExample({
  children = "Department for Business, Innovation, Science and Trade",
  colour = "#ff4328",
  crest = "/assets/images/govuk-crest.svg",
}: Props) {
  return (
    <OrganisationName colour={colour} crest={crest || undefined}>
      {children}
    </OrganisationName>
  );
}
