import { Avatar, AvatarGroup } from "x-govuk-ui";

type Props = { name?: string; size?: "small" | "medium" | "large"; group?: boolean };

const team = ["Margaret Thatcher", "James Callaghan", "Harold Wilson", "Edward Heath"];

export default function AvatarExample({
  name = "John Major",
  size = "medium",
  group = true,
}: Props) {
  return (
    <div className="preview-avatars">
      <Avatar name={name} size={size} />
      {group && (
        <AvatarGroup more={3} aria-label="The licensing team">
          {team.map((person) => (
            <Avatar key={person} name={person} size="medium" />
          ))}
        </AvatarGroup>
      )}
    </div>
  );
}
