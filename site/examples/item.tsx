import {
  Avatar,
  Button,
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "x-govuk-ui";

type Props = { outline?: boolean; actions?: boolean };

const people = [
  { name: "Alec Douglas-Home", role: "Caseworker, licensing team" },
  { name: "Harold Macmillan", role: "Team leader" },
  { name: "Anthony Eden", role: "Inspector, north region" },
];

export default function ItemExample({ outline = false, actions = true }: Props) {
  const item = (person: (typeof people)[number]) => (
    <Item variant={outline ? "outline" : "plain"}>
      <ItemMedia>
        <Avatar name={person.name} />
      </ItemMedia>
      <ItemContent>
        <ItemTitle>{person.name}</ItemTitle>
        <ItemDescription>{person.role}</ItemDescription>
      </ItemContent>
      {actions && (
        <ItemActions>
          <Button variant="outline" size="small">
            Message<span className="x-govuk-ui-visually-hidden"> {person.name}</span>
          </Button>
        </ItemActions>
      )}
    </Item>
  );
  return outline ? (
    <div className="preview-items">
      {people.map((person) => (
        <div key={person.name}>{item(person)}</div>
      ))}
    </div>
  ) : (
    <ItemGroup>
      {people.map((person) => (
        <li key={person.name}>{item(person)}</li>
      ))}
    </ItemGroup>
  );
}
