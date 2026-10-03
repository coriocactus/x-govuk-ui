import { Details } from "x-govuk-ui";

type Props = { summary?: string; defaultOpen?: boolean };

export default function DetailsExample({
  summary = "Help with nationality",
  defaultOpen = false,
}: Props) {
  return (
    <Details summary={summary} defaultOpen={defaultOpen}>
      <p>
        We need to know your nationality so we can work out which elections you’re entitled to vote
        in. If you cannot provide your nationality, you’ll have to send copies of identity documents
        through the post.
      </p>
    </Details>
  );
}
