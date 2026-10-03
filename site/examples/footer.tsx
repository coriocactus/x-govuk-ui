import { Footer, FooterLink, FooterLinks, FooterSection, Link } from "x-govuk-ui";

type Props = {
  crown?: boolean;
  /** Adds GOV.UK's navigation above the support links. */
  sections?: boolean;
};

const topics = [
  "Benefits",
  "Births, deaths, marriages and care",
  "Business and self-employed",
  "Childcare and parenting",
  "Citizenship and living in the UK",
  "Crime, justice and the law",
  "Disabled people",
  "Driving and transport",
  "Education and learning",
  "Employing people",
  "Environment and countryside",
  "Housing and local services",
  "Money and tax",
  "Passports, travel and living abroad",
  "Visas and immigration",
  "Working, jobs and pensions",
];

const government = [
  "How government works",
  "Departments",
  "Worldwide",
  "Policies",
  "Publications",
  "Announcements",
];

const support = ["Help", "Cookies", "Contact", "Terms and conditions"];

const anchor = (name: string) => `#${name.toLowerCase().replaceAll(/[^a-z]+/g, "-")}`;

/** GOV.UK's own footer, with its topics in two columns beside the government's sections. */
export default function FooterExample({ crown = true, sections = true }: Props) {
  return (
    <Footer crown={crown}>
      {sections && (
        <FooterSection title="Services and information" width="two-thirds" columns={2}>
          {topics.map((name) => (
            <FooterLink key={name} href={anchor(name)}>
              {name}
            </FooterLink>
          ))}
        </FooterSection>
      )}
      {sections && (
        <FooterSection title="Departments and policy" width="one-third">
          {government.map((name) => (
            <FooterLink key={name} href={anchor(name)}>
              {name}
            </FooterLink>
          ))}
        </FooterSection>
      )}
      <FooterLinks>
        {support.map((name) => (
          <FooterLink key={name} href={anchor(name)}>
            {name}
          </FooterLink>
        ))}
        <FooterLink href="#cymraeg" lang="cy" hrefLang="cy">
          Rhestr o Wasanaethau Cymraeg
        </FooterLink>
      </FooterLinks>
      <p>
        Built by the <Link href="#gds">Government Digital Service</Link>
      </p>
    </Footer>
  );
}
