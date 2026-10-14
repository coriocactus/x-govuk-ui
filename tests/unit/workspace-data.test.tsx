import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ageOn, money, useApplications } from "../../site/workspace-data";

test("an age counts whole years from the birthday, which it reaches on the day itself", () => {
  const born = new Date(1956, 9, 1);
  expect(ageOn(born, new Date(2026, 8, 30))).toBe(69);
  expect(ageOn(born, new Date(2026, 9, 1))).toBe(70);
  expect(ageOn(new Date(2000, 1, 29), new Date(2026, 1, 28))).toBe(25);
});

test("each applicant's age is worked out when the licence starts, and sets a senior 12-month fee", () => {
  let found: string[] = [];
  function Read() {
    found = useApplications().map(
      (each) => `${each.name}, ${each.age}, ${each.licence}, ${each.senior}, ${money(each.fee)}`,
    );
    return null;
  }
  renderToStaticMarkup(<Read />);
  // A 12-month licence at 66 or over is a senior one. A short licence costs the same at any age.
  expect(found).toContain("Theresa May, 70, 12 months, true, £24.50");
  expect(found).toContain("Gordon Brown, 75, 12 months, true, £24.50");
  expect(found).toContain("Boris Johnson, 62, 1 day, false, £7.30");
  expect(found).toContain("Rishi Sunak, 46, 8 days, false, £14.70");
});

test("money is written as GOV.UK writes it, with pence only when there are some", () => {
  expect(money(7500)).toBe("£75");
  expect(money(2450)).toBe("£24.50");
  expect(money(123450)).toBe("£1,234.50");
});
