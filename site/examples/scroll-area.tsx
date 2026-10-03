import { ScrollArea } from "x-govuk-ui";

type Props = {
  orientation?: "vertical" | "horizontal" | "both";
  fade?: boolean;
  label?: string;
};

const updates = [
  ["12 June 2026", "Added guidance on applying for someone else."],
  ["3 June 2026", "Updated the list of documents you can use to prove your identity."],
  ["28 May 2026", "Changed how long it takes to get a decision to 3 weeks."],
  ["14 May 2026", "Added a Welsh translation of the application form."],
  ["2 May 2026", "Explained what to do if your circumstances change."],
  ["19 April 2026", "Added contact details for the helpline."],
  ["7 April 2026", "Updated the fee for 2026 to 2027."],
  ["24 March 2026", "Clarified who can sign the declaration."],
  ["11 March 2026", "Added information about appeals."],
  ["26 February 2026", "Removed the paper form. Apply online or by phone."],
  ["9 February 2026", "Updated eligibility for people living abroad."],
  ["21 January 2026", "First published."],
];

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export default function ScrollAreaExample({
  orientation = "vertical",
  fade = true,
  label = "Updates to this page",
}: Props) {
  return (
    <ScrollArea
      key={orientation}
      orientation={orientation}
      fade={fade}
      label={label}
      className={`preview-scroll preview-scroll--${orientation}`}
    >
      {orientation === "horizontal" ? (
        <ol className="preview-months">
          {months.map((month, index) => (
            <li key={month}>
              <span>{month}</span>
              <strong>{(1180 + ((index * 337) % 900)).toLocaleString("en-GB")}</strong>
              applications
            </li>
          ))}
        </ol>
      ) : (
        <ol className="preview-updates">
          {updates.map(([date, change]) => (
            <li key={date}>
              <time>{date}</time>
              {change}
            </li>
          ))}
        </ol>
      )}
    </ScrollArea>
  );
}
