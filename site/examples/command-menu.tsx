import { useState } from "react";
import {
  CommandMenu,
  CommandMenuGroup,
  CommandMenuItem,
  CommandMenuPage,
  shortcutKeys,
} from "x-govuk-ui";

type Props = {
  placeholder?: string;
  triggerLabel?: string;
  hotkey?: boolean;
  disabled?: boolean;
  /** Shows a shortcut beside the save command. */
  shortcuts?: boolean;
};

export default function CommandMenuExample({
  placeholder = "Search commands…",
  triggerLabel = "Open command menu",
  hotkey = true,
  disabled = false,
  shortcuts = true,
}: Props) {
  const [status, setStatus] = useState("");
  return (
    <>
      <CommandMenu
        placeholder={placeholder}
        triggerLabel={triggerLabel}
        hotkey={hotkey}
        disabled={disabled}
      >
        <CommandMenuGroup label="Your application">
          <CommandMenuItem
            description="Keep a draft for later."
            shortcut={shortcuts ? shortcutKeys("s") : undefined}
            keywords={["draft"]}
            onSelect={() => setStatus("Simulated save complete. No information was sent.")}
          >
            Save your progress
          </CommandMenuItem>
          <CommandMenuItem
            description="Check your contact information."
            onSelect={() => setStatus("You chose to review your details.")}
          >
            Review your details
          </CommandMenuItem>
        </CommandMenuGroup>
        <CommandMenuGroup label="Settings">
          <CommandMenuItem page="language" description="English or Welsh." keywords={["Cymraeg"]}>
            Change language
          </CommandMenuItem>
          <CommandMenuItem
            description="Find support with your application."
            onSelect={() => setStatus("You chose to get help with your application.")}
          >
            Get help
          </CommandMenuItem>
        </CommandMenuGroup>
        <CommandMenuPage id="language" label="Language" placeholder="Search languages…">
          <CommandMenuItem onSelect={() => setStatus("You chose English.")}>
            English
          </CommandMenuItem>
          <CommandMenuItem onSelect={() => setStatus("You chose Cymraeg.")} keywords={["Welsh"]}>
            Cymraeg
          </CommandMenuItem>
        </CommandMenuPage>
      </CommandMenu>
      <p className="preview-message" role="status">
        {status}
      </p>
    </>
  );
}
