import { useState } from "react";
import { Header, ServiceNavigation, ServiceNavigationItem } from "x-govuk-ui";

type Props = { serviceName?: string };

const sections = ["Applications", "Payments", "Messages", "Your account"];

export default function ServiceNavigationExample({ serviceName = "Apply for a licence" }: Props) {
  const [current, setCurrent] = useState(sections[0]);
  return (
    <div className="preview-page-top">
      <Header homepageUrl="#home" />
      <ServiceNavigation serviceName={serviceName} serviceUrl="#service">
        {sections.map((section) => (
          <ServiceNavigationItem
            key={section}
            href={`#${section.toLowerCase().replaceAll(" ", "-")}`}
            current={section === current}
            // The example changes the section in place, as a single-page application would.
            render={
              <a
                href={`#${section}`}
                onClick={(event) => {
                  event.preventDefault();
                  setCurrent(section);
                }}
              />
            }
          >
            {section}
          </ServiceNavigationItem>
        ))}
      </ServiceNavigation>
    </div>
  );
}
