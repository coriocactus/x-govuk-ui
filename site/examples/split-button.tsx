import { useState } from "react";
import {
  Button,
  DropdownMenu,
  MenuContent,
  MenuItem,
  SplitButton,
  SplitButtonTrigger,
} from "x-govuk-ui";

type Props = { variant?: "primary" | "secondary" | "outline" | "warning" | "quiet" };

export default function SplitButtonExample({ variant = "primary" }: Props) {
  const [message, setMessage] = useState("");
  return (
    <>
      <SplitButton aria-label="Save the view">
        <Button variant={variant} onClick={() => setMessage("Saved as a new view.")}>
          Save as a new view
        </Button>
        <DropdownMenu>
          <SplitButtonTrigger label="More ways to save" variant={variant} />
          <MenuContent align="end">
            <MenuItem onSelect={() => setMessage("Strategic accounts updated.")}>
              Update Strategic accounts
            </MenuItem>
            <MenuItem onSelect={() => setMessage("Changes discarded.")}>Discard changes</MenuItem>
          </MenuContent>
        </DropdownMenu>
      </SplitButton>
      <p className="preview-message" role="status">
        {message}
      </p>
    </>
  );
}
