import { Heading, type HeadingProps } from "x-govuk-ui";

type Props = Pick<HeadingProps, "level" | "size"> & { children?: string };

export default function HeadingExample({
  level = 1,
  size,
  children = "Apply for a fishing licence",
}: Props) {
  return (
    <Heading level={level} size={size}>
      {children}
    </Heading>
  );
}
