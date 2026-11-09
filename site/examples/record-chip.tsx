import { Avatar, RecordChip, RecordChipGroup, Stack } from "x-govuk-ui";

type Props = { links?: boolean; more?: number };

const contacts = ["Henry Campbell-Bannerman", "Arthur Balfour", "Lord Salisbury"];

export default function RecordChipExample({ links = true, more = 2 }: Props) {
  // Each chip links to its person's page, as in a list of a company's contacts.
  const href = (name: string) =>
    links ? `#${name.toLowerCase().replaceAll(" ", "-")}` : undefined;
  return (
    <Stack gap={4}>
      <RecordChip
        href={href("Tamar Valley Foundry")}
        media={<Avatar name="Tamar Valley Foundry" shape="square" />}
      >
        Tamar Valley Foundry
      </RecordChip>
      <RecordChipGroup aria-label="Contacts at Tamar Valley Foundry" more={more}>
        {contacts.map((name) => (
          <RecordChip key={name} href={href(name)} media={<Avatar name={name} />}>
            {name}
          </RecordChip>
        ))}
      </RecordChipGroup>
    </Stack>
  );
}
