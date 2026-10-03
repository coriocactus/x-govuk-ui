import { Link, Prose } from "x-govuk-ui";

export default function ProseExample() {
  return (
    <Prose>
      <h2>Before you apply</h2>
      <p>You can apply for a rod fishing licence if you are 13 or over.</p>
      <p>You will need:</p>
      <ul>
        <li>your date of birth</li>
        <li>a debit or credit card</li>
      </ul>
      <h3>After you apply</h3>
      <p>
        Your licence lasts for 12 months. <Link href="https://www.gov.uk/">Read the byelaws</Link>{" "}
        before you fish.
      </p>
    </Prose>
  );
}
