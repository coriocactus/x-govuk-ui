import { Avatar, AvatarGroup } from "x-govuk-ui";

type Props = {
  name?: string;
  size?: "small" | "medium" | "large";
  shape?: "circle" | "square";
  group?: boolean;
};

const team = ["Margaret Thatcher", "James Callaghan", "Harold Wilson", "Edward Heath"];

export default function AvatarExample({
  name = "John Major",
  size = "medium",
  shape = "circle",
  group = true,
}: Props) {
  return (
    <div className="preview-avatars">
      <Avatar name={name} size={size} shape={shape} />
      {group && (
        <AvatarGroup more={3} aria-label="The licensing team">
          {team.map((person) => (
            <Avatar key={person} name={person} size="medium" shape={shape} />
          ))}
        </AvatarGroup>
      )}
    </div>
  );
}
