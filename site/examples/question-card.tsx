import { useState } from "react";
import { QuestionCard } from "x-govuk-ui";

type Props = { markers?: "letters" | "numbers" | "none" };

export default function QuestionCardExample({ markers = "letters" }: Props) {
  const [done, setDone] = useState(false);
  return (
    <>
      <QuestionCard
        questions={[
          {
            name: "address",
            question: "Which address should I send your licence to?",
            hint: "I found two addresses on your application.",
            options: [
              { value: "home", label: "12 High Street, Leeds", hint: "Your home address" },
              { value: "work", label: "PO Box 34, Leeds", hint: "Your business address" },
            ],
            other: "A different address…",
            required: true,
          },
          {
            name: "moved",
            question: "When did you move to that address?",
            hint: "For example, 14 3 2024",
            type: "date",
            // A move has happened already, so the date is today or before, and the calendar
            // offers only those days.
            max: new Date(),
            calendar: true,
          },
          {
            name: "evidence",
            question: "Which of these can you send me?",
            hint: "Choose all that you have to hand.",
            options: [
              { value: "passport", label: "Passport" },
              { value: "driving-licence", label: "Driving licence" },
              { value: "bill", label: "A bill from the last 3 months" },
            ],
            multiple: true,
          },
          {
            name: "updates",
            question: "Should I email you when your licence is ready?",
            options: [
              { value: "yes", label: "Yes, email me" },
              { value: "no", label: "No, I will check the service" },
            ],
          },
        ]}
        markers={markers}
        onComplete={async () => {
          // The agent takes a moment to receive the answers, and the card waits for it.
          await new Promise((received) => setTimeout(received, 800));
          setDone(true);
        }}
      />
      <p className="preview-message" role="status">
        {done && "The agent carries on with your answers."}
      </p>
    </>
  );
}
