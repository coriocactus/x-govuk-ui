import { Fragment } from "react";
import { type ComponentName, catalogue, componentOrder } from "./catalogue";
import { Icon } from "./icon";

/** The systems the components owe something to, each named once, with where to find it. */
const systems = {
  govuk: { name: "GOV.UK Design System", href: "https://design-system.service.gov.uk/" },
  kobra: { name: "Kobra", href: "https://kobra.systems/" },
  mantine: { name: "Mantine", href: "https://mantine.dev/" },
  superlogical: { name: "Superlogical", href: "https://www.superlogical.com/" },
  lexxy: { name: "Lexxy", href: "https://github.com/basecamp/lexxy" },
  lexical: { name: "Lexical", href: "https://lexical.dev/" },
  recharts: { name: "Recharts", href: "https://recharts.github.io/" },
  mosaic: { name: "react-mosaic", href: "https://github.com/nomcopter/react-mosaic" },
};

/**
 * What a component owes a system. That is the idea, the design and behaviour taken and reworked,
 * or the code it runs on.
 */
type Debt = "inspired" | "adapted" | "built";

const charts = componentOrder.filter((name) => catalogue[name].group === "Charts");

/** Which components owe each system what. */
const debts: Record<keyof typeof systems, Partial<Record<Debt, readonly ComponentName[]>>> = {
  // The ground every component stands on, which the README credits, so no component's own credits
  // need name it.
  govuk: {},
  kobra: {
    inspired: [
      "sound",
      "grouped-table",
      "input-otp",
      "toast",
      "data-table",
      "lightbox",
      "radios",
      "qr-code",
      "logo-carousel",
    ],
  },
  // The charts as a family, each set the same way, as Mantine's are.
  mantine: { inspired: charts },
  // Date input's and Time input's fields, which turn like dials.
  superlogical: { inspired: ["date-input", "time-input"] },
  lexxy: { adapted: ["editor"] },
  lexical: { built: ["editor"] },
  // The charts Recharts draws. The rest of the family are drawn by the library itself.
  recharts: { built: ["chart", "chart-set", "treemap", "sunburst", "sankey"] },
  mosaic: { built: ["tiles"] },
};

/** How each debt reads, in the order a component's credits give them. */
const debtWords: Record<Debt, string> = {
  inspired: "Inspired by",
  adapted: "Adapted from",
  built: "Built on",
};

/** Every system the library owes something to, each once, for the README to name and link. */
export function everySystem() {
  return Object.values(systems);
}

/** A component's credits, which are each debt it has, in order, with the systems it owes it to. */
function creditsFor(name: ComponentName) {
  return (Object.keys(debtWords) as Debt[])
    .map((debt) => ({
      debt,
      owed: (Object.keys(debts) as (keyof typeof systems)[])
        .filter((system) => debts[system][debt]?.includes(name))
        .map((system) => systems[system]),
    }))
    .filter(({ owed }) => owed.length > 0);
}

/**
 * Each debt's mark, drawn small in front of its words. A spark marks an idea, a turned arrow a
 * design brought over, and laid bricks the code beneath.
 */
const marks: Record<Debt, string> = {
  inspired: "M7 1.5c.4 3 1.9 4.6 5 5-3.1.4-4.6 2-5 5-.4-3-1.9-4.6-5-5 3.1-.4 4.6-2 5-5Z",
  adapted: "M2.5 3.5v2.5a3 3 0 0 0 3 3h6M9 6.5l2.5 2.5L9 11.5",
  built: "M1.5 7h11v4h-11zM7 7v4M4.25 3h5.5v4h-5.5z",
};

function Mark({ debt }: { debt: Debt }) {
  return (
    <svg
      className="inspector-credit-mark"
      viewBox="0 0 14 14"
      width="14"
      height="14"
      aria-hidden="true"
      fill={debt === "inspired" ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={debt === "inspired" ? 0 : 1.3}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={marks[debt]} />
    </svg>
  );
}

/**
 * What a component owes to other systems, under its name in the playground, as a book's colophon
 * credits its type. That is an idea it was inspired by, a design adapted from another, and the code
 * it is built on, each with a link to the system. A component that owes nothing has no credits.
 */
export function Credits({ name }: { name: ComponentName }) {
  const credits = creditsFor(name);
  if (!credits.length) return null;
  return (
    <dl className="inspector-credits">
      {credits.map(({ debt, owed }) => (
        <div key={debt} className="inspector-credit" data-debt={debt}>
          <dt>
            <Mark debt={debt} />
            {debtWords[debt]}
          </dt>
          <dd>
            {owed.map((system, index) => (
              <Fragment key={system.name}>
                {index > 0 && (index === owed.length - 1 ? " and " : ", ")}
                <a href={system.href} target="_blank" rel="noreferrer">
                  {system.name}
                  <Icon name="external" size={11} />
                </a>
              </Fragment>
            ))}
          </dd>
        </div>
      ))}
    </dl>
  );
}
