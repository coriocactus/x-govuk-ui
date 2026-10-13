import { createContext, useContext, useState } from "react";
import {
  Button,
  CommandMenu,
  CommandMenuBestMatches,
  CommandMenuContent,
  CommandMenuGroup,
  CommandMenuItem,
  CommandMenuPage,
  CommandMenuTrigger,
  rankCommandByName,
  shortcutKeys,
  useCommandMenu,
} from "x-govuk-ui";

/** The language the service is in, which the service keeps for every part of its page. */
const Language = createContext("English");

/** What shows when nothing matches, with a way on to the commands for help. */
function NothingFound() {
  const menu = useCommandMenu();
  return (
    <>
      No commands match “{menu?.search}”.{" "}
      <Button variant="link" onClick={() => menu?.setSearch("help")}>
        Look for help
      </Button>
    </>
  );
}

/** The language now, inside the command that changes it. */
function CurrentLanguage() {
  return <span className="preview-command-now">, now {useContext(Language)}</span>;
}

type Props = {
  placeholder?: string;
  triggerLabel?: string;
  keyboardShortcut?: boolean;
  disabled?: boolean;
  /** Shows a shortcut beside the save command. */
  shortcuts?: boolean;
  /** Ranks the best matches by their descriptions too. */
  ownRank?: boolean;
};

export default function CommandMenuExample({
  placeholder = "Search commands…",
  triggerLabel = "Open command menu",
  keyboardShortcut = true,
  disabled = false,
  shortcuts = true,
  ownRank = false,
}: Props) {
  const [status, setStatus] = useState("");
  const [language, setLanguage] = useState("English");
  return (
    <>
      <Language value={language}>
        <CommandMenu
          labels={{ trigger: triggerLabel }}
          keyboardShortcut={keyboardShortcut}
          disabled={disabled}
        >
          <CommandMenuTrigger />
          <CommandMenuContent placeholder={placeholder} empty={<NothingFound />}>
            <CommandMenuBestMatches
              rank={
                ownRank
                  ? // A name comes first, then a description that starts with the search.
                    (search, command) =>
                      rankCommandByName(search, command) ??
                      (command.description.toLowerCase().startsWith(search.trim().toLowerCase())
                        ? 2
                        : null)
                  : undefined
              }
            />
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
              <CommandMenuItem
                page="language"
                description="English or Welsh."
                keywords={["Cymraeg"]}
                textValue="Change language"
              >
                Change language
                <CurrentLanguage />
              </CommandMenuItem>
              <CommandMenuItem
                description="Find support with your application."
                onSelect={() => setStatus("You chose to get help with your application.")}
              >
                Get help
              </CommandMenuItem>
            </CommandMenuGroup>
            <CommandMenuPage id="language" label="Language" placeholder="Search languages…">
              <CommandMenuItem
                onSelect={() => {
                  setLanguage("English");
                  setStatus("You chose English.");
                }}
              >
                English
              </CommandMenuItem>
              <CommandMenuItem
                onSelect={() => {
                  setLanguage("Cymraeg");
                  setStatus("You chose Cymraeg.");
                }}
                keywords={["Welsh"]}
              >
                Cymraeg
              </CommandMenuItem>
            </CommandMenuPage>
          </CommandMenuContent>
        </CommandMenu>
      </Language>
      <p className="preview-message" role="status">
        {status}
      </p>
    </>
  );
}
