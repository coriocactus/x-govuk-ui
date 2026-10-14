import { useMemo, useSyncExternalStore } from "react";

/*
 * The workspace's data, as a service's API would give it. It has the rod fishing licence
 * applications, what the licensing team did last, and the licences issued each week. The applicants
 * are prime ministers, at their dates of birth on Wikipedia. Everything else about them, and the
 * figures, is made up. Each applicant's age, and the fee it sets, are worked out by GOV.UK's
 * rules.
 *
 * The data is kept in memory, so a reload starts it again. Reading it is immediate. Each change
 * takes a moment, as a request to a server would. Every part that reads the data follows it, so a
 * view Piscine Assist composes and the Overview stay in step.
 */

export type Licence = "1 day" | "8 days" | "12 months";

/**
 * Where an application is. `decision` needs a caseworker, `waiting` waits for the applicant,
 * `ready` can be issued, and `issued` is done.
 */
export type Status = "decision" | "waiting" | "ready" | "issued";

export type Payment = {
  id: string;
  /** In pence. */
  amount: number;
  date: Date;
  /** The last 4 digits of the card it came from. */
  card: string;
  refunded?: boolean;
};

export type Application = {
  reference: string;
  name: string;
  dateOfBirth: Date;
  email: string;
  address: string[];
  licence: Licence;
  starts: Date;
  /** The applicant's age on the day the licence starts, from their date of birth. */
  age: number;
  /** Whether the licence is a senior one, which costs less, from `age`. */
  senior: boolean;
  /** In pence, from the licence and whether it is a senior one. */
  fee: number;
  received: Date;
  status: Status;
  /** What the application waits on, in a few words, such as "check a date of birth". */
  note: string;
  assigned: string[];
  payments: Payment[];
};

export type Activity = { id: string; title: string; by: string; date: Date; text: string };

/** Licences issued in a week, by length. */
export type Week = { week: string; day: number; eight: number; year: number };

/** The caseworker signed in, who makes every change. */
export const caseworker = { name: "Andy Burnham", role: "Licensing team" };

/** The age from which a 12-month licence costs less, as GOV.UK sets it. */
export const SENIOR_AGE = 66;

/**
 * What each licence costs, in pence, for up to 2 rods, from GOV.UK's prices. Only a 12-month
 * licence costs less, at `SENIOR_AGE` or over.
 */
export const prices = { "1 day": 730, "8 days": 1470, "12 months": 3680, senior: 2450 };

/** How old someone is on a day, from their date of birth. */
export function ageOn(birth: Date, day: Date) {
  const before =
    day.getMonth() < birth.getMonth() ||
    (day.getMonth() === birth.getMonth() && day.getDate() < birth.getDate());
  return day.getFullYear() - birth.getFullYear() - (before ? 1 : 0);
}

/** What an applicant gives. The rest of an application is worked out from it. */
type Given = Omit<Application, "age" | "senior" | "fee" | "payments"> & {
  payments: Omit<Payment, "amount">[];
};

/** An application, with the applicant's age when the licence starts, and the fee it sets. */
function application(given: Given): Application {
  const age = ageOn(given.dateOfBirth, given.starts);
  const senior = given.licence === "12 months" && age >= SENIOR_AGE;
  const fee = senior ? prices.senior : prices[given.licence];
  return {
    ...given,
    age,
    senior,
    fee,
    payments: given.payments.map((payment) => ({ ...payment, amount: fee })),
  };
}

const card = (id: string, date: Date, last: string) => ({ id, date, card: last });

const given: Given[] = [
  {
    reference: "RL-48213",
    name: "Theresa May",
    dateOfBirth: new Date(1956, 9, 1),
    email: "theresa.may@example.com",
    address: ["14 Wharf Road", "Stockport", "SK4 1AL"],
    licence: "12 months",
    starts: new Date(2026, 9, 1),
    received: new Date(2026, 8, 29, 9, 12),
    status: "decision",
    note: "check a date of birth",
    assigned: ["Andy Burnham"],
    payments: [card("p-48213", new Date(2026, 8, 29, 9, 12), "7730")],
  },
  {
    reference: "RL-48207",
    name: "Gordon Brown",
    dateOfBirth: new Date(1951, 1, 20),
    email: "gordon.brown@example.com",
    address: ["3 Mill Lane", "Bury", "BL9 6EX"],
    licence: "12 months",
    starts: new Date(2026, 9, 1),
    received: new Date(2026, 8, 29, 10, 2),
    status: "decision",
    note: "paid twice, refund one",
    assigned: ["Andy Burnham", "Harold Wilson"],
    payments: [
      card("p-48207-1", new Date(2026, 8, 29, 10, 2), "4421"),
      card("p-48207-2", new Date(2026, 8, 29, 10, 4), "4421"),
    ],
  },
  {
    reference: "RL-48199",
    name: "Liz Truss",
    dateOfBirth: new Date(1975, 6, 26),
    email: "liz.truss@example.com",
    address: ["Flat 2, 88 Castle Street", "Shrewsbury", "SY1 2BQ"],
    licence: "8 days",
    starts: new Date(2026, 8, 28),
    received: new Date(2026, 8, 28, 16, 40),
    status: "decision",
    note: "starts before payment",
    assigned: ["Harold Wilson"],
    payments: [card("p-48199", new Date(2026, 8, 28, 16, 40), "0912")],
  },
  {
    reference: "RL-48184",
    name: "John Major",
    dateOfBirth: new Date(1943, 2, 29),
    email: "john.major@example.com",
    address: ["27 Hollins Avenue", "Leeds", "LS6 3PN"],
    licence: "12 months",
    starts: new Date(2026, 9, 5),
    received: new Date(2026, 8, 26, 11, 5),
    status: "waiting",
    note: "proof of age asked for",
    assigned: ["Margaret Thatcher"],
    payments: [card("p-48184", new Date(2026, 8, 26, 11, 5), "5106")],
  },
  {
    reference: "RL-48171",
    name: "Boris Johnson",
    dateOfBirth: new Date(1964, 5, 19),
    email: "boris.johnson@example.com",
    address: ["5 Burnside Cottages", "Hexham", "NE46 3RT"],
    licence: "1 day",
    starts: new Date(2026, 9, 3),
    received: new Date(2026, 8, 25, 18, 22),
    status: "waiting",
    note: "address does not match",
    assigned: ["Margaret Thatcher", "Andy Burnham"],
    payments: [card("p-48171", new Date(2026, 8, 25, 18, 22), "3348")],
  },
  {
    reference: "RL-48160",
    name: "Tony Blair",
    dateOfBirth: new Date(1953, 4, 6),
    email: "tony.blair@example.com",
    address: ["The Old Forge", "Ludlow", "SY8 1PE"],
    licence: "12 months",
    starts: new Date(2026, 9, 1),
    received: new Date(2026, 8, 24, 8, 47),
    status: "ready",
    note: "all checks passed",
    assigned: ["Harold Wilson"],
    payments: [card("p-48160", new Date(2026, 8, 24, 8, 47), "8264")],
  },
  {
    reference: "RL-48152",
    name: "Rishi Sunak",
    dateOfBirth: new Date(1980, 4, 12),
    email: "rishi.sunak@example.com",
    address: ["41 Canal Street", "Nottingham", "NG1 7EH"],
    licence: "8 days",
    starts: new Date(2026, 9, 2),
    received: new Date(2026, 8, 24, 13, 30),
    status: "ready",
    note: "all checks passed",
    assigned: ["Margaret Thatcher"],
    payments: [card("p-48152", new Date(2026, 8, 24, 13, 30), "6017")],
  },
  {
    reference: "RL-48147",
    name: "David Cameron",
    dateOfBirth: new Date(1966, 9, 9),
    email: "david.cameron@example.com",
    address: ["9 Station Road", "Keswick", "CA12 4NE"],
    licence: "1 day",
    starts: new Date(2026, 8, 30),
    received: new Date(2026, 8, 23, 19, 55),
    status: "ready",
    note: "starts tomorrow",
    assigned: ["Andy Burnham"],
    payments: [card("p-48147", new Date(2026, 8, 23, 19, 55), "2290")],
  },
];

const applications = given.map(application);

const activity: Activity[] = [
  {
    id: "issued",
    title: "Licence issued",
    by: "Harold Wilson",
    date: new Date(2026, 8, 29, 16, 20),
    text: "RL-48139, a 12-month licence for Keir Starmer.",
  },
  {
    id: "refund",
    title: "Refund sent",
    by: "Andy Burnham",
    date: new Date(2026, 8, 29, 14, 5),
    text: `${money(prices["1 day"])} to an applicant who chose the wrong licence.`,
  },
  {
    id: "asked",
    title: "Proof of age asked for",
    by: "Margaret Thatcher",
    date: new Date(2026, 8, 28, 11, 30),
    text: "From John Major, for a senior concession.",
  },
];

const weeks: Week[] = (
  [
    ["w/c 11 Aug", 410, 180, 240],
    ["w/c 18 Aug", 460, 210, 230],
    ["w/c 25 Aug", 520, 240, 260],
    ["w/c 1 Sep", 380, 170, 310],
    ["w/c 8 Sep", 300, 140, 350],
    ["w/c 15 Sep", 250, 120, 390],
    ["w/c 22 Sep", 210, 90, 420],
    ["w/c 29 Sep", 190, 80, 460],
  ] as const
).map(([week, day, eight, year]) => ({ week, day, eight, year }));

type State = { applications: Application[]; activity: Activity[]; weeks: Week[] };

// The store. Each change makes a new state, so React sees it changed, and tells every reader.
let state: State = { applications, activity, weeks };
const readers = new Set<() => void>();
const subscribe = (reader: () => void) => {
  readers.add(reader);
  return () => {
    readers.delete(reader);
  };
};
const read = () => state;
const useData = () => useSyncExternalStore(subscribe, read, read);

/** How long a change takes, as a request to a server would. */
const LATENCY = 500;
const wait = () => new Promise((done) => setTimeout(done, LATENCY));

/** An application to change, which must be there. */
function existing(reference: string) {
  const found = state.applications.find((each) => each.reference === reference);
  if (!found) throw new Error(`There is no application ${reference}.`);
  return found;
}

let events = 0;
/** Changes an application, and records what the caseworker did, newest first. */
function change(found: Application, update: Partial<Application>, title: string, text: string) {
  state = {
    ...state,
    applications: state.applications.map((each) =>
      each === found ? { ...each, ...update } : each,
    ),
    activity: [
      { id: `event-${++events}`, title, by: caseworker.name, date: new Date(), text },
      ...state.activity,
    ],
  };
  for (const reader of readers) reader();
}

// Reading.

/** Every application, or only those with a status, oldest first. */
export function useApplications(status?: Status): Application[] {
  const { applications } = useData();
  return useMemo(
    () =>
      applications
        .filter((each) => !status || each.status === status)
        .sort((one, other) => one.received.getTime() - other.received.getTime()),
    [applications, status],
  );
}

/** One application, by its reference, or undefined if there is none. */
export function useApplication(reference: string): Application | undefined {
  return useData().applications.find((each) => each.reference === reference);
}

/** What the licensing team did, newest first. */
export const useActivity = (): Activity[] => useData().activity;

/** The licences issued each week, over the last eight. */
export const useLicenceWeeks = (): Week[] => useData().weeks;

// Changing. Each change takes a moment, and rejects for an application that is not there.

/** A licence's length as a kind of licence, such as "a 12-month licence". */
export const licenceKind = (licence: Licence) =>
  ({ "1 day": "a 1-day licence", "8 days": "an 8-day licence", "12 months": "a 12-month licence" })[
    licence
  ];

/** Issues an application's licence. */
export async function issueLicence(reference: string) {
  await wait();
  const found = existing(reference);
  change(
    found,
    { status: "issued", note: "licence issued" },
    "Licence issued",
    `${reference}, ${licenceKind(found.licence)} for ${found.name}.`,
  );
}

/** Asks the applicant for something the application needs, such as "proof of age". */
export async function askFor(reference: string, what: string) {
  await wait();
  const found = existing(reference);
  change(
    found,
    { status: "waiting", note: `${what} asked for` },
    `${what.charAt(0).toUpperCase()}${what.slice(1)} asked for`,
    `From ${found.name}, for ${reference}.`,
  );
}

/** Refunds one of an application's payments. The application is then ready to issue. */
export async function refundPayment(reference: string, payment: string) {
  await wait();
  const found = existing(reference);
  const paid = found.payments.find((each) => each.id === payment);
  if (!paid) throw new Error(`There is no payment ${payment} for ${reference}.`);
  if (paid.refunded) throw new Error("That payment has already been refunded.");
  change(
    found,
    {
      status: "ready",
      note: "refund sent",
      payments: found.payments.map((each) => (each === paid ? { ...each, refunded: true } : each)),
    },
    "Refund sent",
    `${money(paid.amount)} to ${found.name}, from ${reference}.`,
  );
}

// Writing it as GOV.UK does.

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

/** An amount in pence, as pounds, such as £36.80. */
export function money(pence: number) {
  return `£${(pence / 100).toFixed(2)}`;
}

/** A time as GOV.UK writes it, such as 10:02am, or midday. */
export function timeText(date: Date) {
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  if (hours === 12 && minutes === "00") return "midday";
  if (hours === 0 && minutes === "00") return "midnight";
  return `${hours % 12 || 12}:${minutes}${hours < 12 ? "am" : "pm"}`;
}

/** A date as GOV.UK writes it, such as 29 September 2026, or 29 Sep when `short`. */
export const dateText = (date: Date, { short = false } = {}) =>
  short
    ? `${date.getDate()} ${months[date.getMonth()]!.slice(0, 3)}`
    : `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
