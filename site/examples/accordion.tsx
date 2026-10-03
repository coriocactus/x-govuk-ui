import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionShowAll,
  AccordionTrigger,
} from "x-govuk-ui";

type Props = {
  multiple?: boolean;
  disabled?: boolean;
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  /** Shows GOV.UK's Show all sections above the sections. */
  showAll?: boolean;
  /** Gives each section a summary line beneath its title. */
  summaries?: boolean;
};

const sections = [
  {
    value: "before",
    title: "Before you start",
    summary: "What to have ready",
    content:
      "Have your National Insurance number and contact details ready. You can save your progress and return to your application later.",
  },
  {
    value: "documents",
    title: "What you will need",
    summary: "Documents that prove your income",
    content:
      "You may need a recent payslip or a letter from HMRC. We will explain which documents to provide when you apply.",
  },
  {
    value: "next",
    title: "What happens next",
    summary: "How we tell you about a decision",
    content:
      "We will send you a confirmation email when you submit your application. The email will explain the next steps.",
  },
];

export default function AccordionExample({
  multiple = true,
  disabled = false,
  headingLevel = 3,
  showAll = true,
  summaries = false,
}: Props) {
  return (
    <Accordion multiple={multiple} disabled={disabled} headingLevel={headingLevel}>
      {showAll && multiple && <AccordionShowAll />}
      {sections.map((section) => (
        <AccordionItem key={section.value} value={section.value}>
          <AccordionTrigger summary={summaries ? section.summary : undefined}>
            {section.title}
          </AccordionTrigger>
          <AccordionPanel>{section.content}</AccordionPanel>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
