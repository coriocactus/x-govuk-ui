import { Tabs, TabsList, TabsPanel, TabsTrigger } from "x-govuk-ui";

const sections = [
  {
    value: "past-day",
    label: "Past day",
    cases: [
      ["Andy Burnham", "3"],
      ["Keir Starmer", "1"],
      ["Rishi Sunak", "2"],
    ],
  },
  {
    value: "past-week",
    label: "Past week",
    cases: [
      ["Andy Burnham", "24"],
      ["Keir Starmer", "16"],
      ["Rishi Sunak", "24"],
    ],
  },
  {
    value: "past-month",
    label: "Past month",
    cases: [
      ["Andy Burnham", "98"],
      ["Keir Starmer", "122"],
      ["Rishi Sunak", "126"],
    ],
  },
];

export default function TabsExample() {
  return (
    <Tabs defaultValue="past-day">
      <TabsList aria-label="Cases closed">
        {sections.map((section) => (
          <TabsTrigger key={section.value} value={section.value}>
            {section.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {sections.map((section) => (
        <TabsPanel key={section.value} value={section.value}>
          <h2 className="preview-panel-heading">{section.label}</h2>
          <dl className="preview-pairs">
            {section.cases.map(([caseworker, closed]) => (
              <div key={caseworker}>
                <dt>{caseworker}</dt>
                <dd>{closed} cases closed</dd>
              </div>
            ))}
          </dl>
        </TabsPanel>
      ))}
    </Tabs>
  );
}
