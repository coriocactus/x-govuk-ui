import { useEffect, useRef, useState } from "react";
import {
  ChatInput,
  ChatInputAttach,
  ChatInputAttachment,
  ChatInputAttachments,
  ChatInputDictation,
  ChatInputModel,
  type ChatInputModelOption,
  type DictationRecogniser,
} from "x-govuk-ui";

type Props = {
  placeholder?: string;
  maxRows?: number;
  layout?: "stacked" | "inline";
  framed?: boolean;
  disabled?: boolean;
  /** Adds ChatInputAttach to the tools. */
  attach?: boolean;
  /** Adds ChatInputModel beside Send. */
  model?: boolean;
  /** Adds ChatInputDictation beside Send. */
  dictation?: boolean;
  /** Sends documents chosen from the service's store with the message, beside its files. */
  documents?: boolean;
  /**
   * Dictates through a recogniser of the example's own, as a service's own transcription would.
   */
  transcriber?: boolean;
};

// A recogniser of the example's own, standing in for a service's transcription. It hears one
// phrase a moment after it starts listening, then stops.
const transcription: DictationRecogniser = {
  start: (_options, { onPhrase, onEnd }) => {
    const timer = setTimeout(() => {
      onPhrase("Can I renew my licence online?");
      onEnd();
    }, 600);
    return () => {
      clearTimeout(timer);
      onEnd();
    };
  },
};

// Each model's mark is a four-pointed star in one of GOV.UK's colours. They are not real services.
const mark = (colour: string) => (
  <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
    <path
      d="M8 1c.6 3.6 3.4 6.4 7 7-3.6.6-6.4 3.4-7 7-.6-3.6-3.4-6.4-7-7 3.6-.6 6.4-3.4 7-7z"
      fill={colour}
    />
  </svg>
);
const models: ChatInputModelOption[] = [
  {
    value: "atlas-pro",
    label: "Atlas 2 Pro",
    description: "Most thorough, for complex questions",
    icon: mark("var(--x-govuk-ui-blue)"),
  },
  {
    value: "atlas",
    label: "Atlas 2",
    description: "Balanced, for most questions",
    icon: mark("var(--x-govuk-ui-teal)"),
  },
  {
    value: "atlas-mini",
    label: "Atlas 2 Mini",
    description: "Fastest, for quick answers",
    icon: mark("var(--x-govuk-ui-green)"),
  },
  {
    value: "beacon",
    label: "Beacon 1.5",
    description: "Short replies in plain English",
    icon: mark("var(--x-govuk-ui-purple)"),
  },
];

export default function ChatInputExample({
  placeholder = "Write a message…",
  maxRows = 6,
  layout = "stacked",
  framed = true,
  disabled = false,
  attach = true,
  model = true,
  dictation = true,
  documents = false,
  transcriber = false,
}: Props) {
  const [sent, setSent] = useState("");
  // With documents, the example keeps the files itself, and lists them with the documents chosen.
  const [files, setFiles] = useState<File[]>([]);
  const [chosen, setChosen] = useState(["Rod fishing byelaws", "Fishing licence guidance"]);
  const attachments =
    documents && chosen.length + files.length > 0 ? (
      <ChatInputAttachments label="Sent with the message">
        {chosen.map((name) => (
          <ChatInputAttachment
            key={name}
            name={name}
            kind="Document"
            onRemove={() => setChosen((previous) => previous.filter((one) => one !== name))}
          />
        ))}
        {files.map((file, index) => (
          <ChatInputAttachment
            key={`${file.name}-${file.size}-${file.lastModified}`}
            name={file.name}
            kind="File"
            onRemove={() => setFiles(files.filter((_, at) => at !== index))}
          />
        ))}
      </ChatInputAttachments>
    ) : undefined;
  // The example pretends to reply for a moment, so Send turns to Stop.
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <div className="preview-chat-input">
      <ChatInput
        placeholder={placeholder}
        maxRows={maxRows}
        layout={layout}
        framed={framed}
        disabled={disabled}
        busy={busy}
        files={documents ? files : undefined}
        onFilesChange={documents ? setFiles : undefined}
        attachments={attachments}
        onSubmit={(message, sentFiles) => {
          const attached = sentFiles.length
            ? ` with ${sentFiles.length} ${sentFiles.length === 1 ? "file" : "files"}`
            : "";
          setSent(`Sent “${message}”${attached}. The assistant is replying.`);
          setBusy(true);
          timer.current = setTimeout(() => {
            setBusy(false);
            setSent("The reply arrived.");
          }, 3000);
        }}
        onStop={() => {
          clearTimeout(timer.current);
          setBusy(false);
          setSent("You stopped the reply.");
        }}
        tools={attach && <ChatInputAttach />}
      >
        {model && <ChatInputModel models={models} defaultValue="atlas" />}
        {dictation && <ChatInputDictation recogniser={transcriber ? transcription : undefined} />}
      </ChatInput>
      <p className="preview-message" role="status">
        {sent}
      </p>
    </div>
  );
}
