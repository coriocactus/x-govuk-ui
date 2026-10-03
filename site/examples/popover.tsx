import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from "x-govuk-ui";

type Props = {
  side?: "top" | "bottom" | "left" | "right";
  arrow?: boolean;
  closeButton?: boolean;
};

export default function PopoverExample({
  side = "bottom",
  arrow = true,
  closeButton = false,
}: Props) {
  return (
    <Popover>
      <PopoverTrigger variant="link">Where do I find my reference number?</PopoverTrigger>
      <PopoverContent side={side} arrow={arrow} closeButton={closeButton}>
        <PopoverTitle>Your reference number</PopoverTitle>
        <PopoverDescription>
          It’s 12 characters long and starts with LIC. It’s at the top of the letter or email we
          sent you.
        </PopoverDescription>
        <PopoverClose size="small">Got it</PopoverClose>
      </PopoverContent>
    </Popover>
  );
}
