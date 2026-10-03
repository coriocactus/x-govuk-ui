import {
  Editor,
  EditorAI,
  EditorAIAction,
  EditorAIAsk,
  EditorAIPrompt,
  type EditorAIRequest,
  EditorAISeparator,
  EditorAISuggestion,
  EditorAIToolbar,
  EditorAITools,
  EditorContent,
  type EditorControlKind,
  EditorPrompt,
  type EditorPromptItem,
  EditorToolbar,
  type EditorUploadHelpers,
  type EditorValueFormat,
  useEditor,
  useEditorAI,
} from "@x-govuk-ui/jorjorwel";
import { useEffect, useState } from "react";
import { Button, Callout, Form } from "x-govuk-ui";

type Props = {
  label?: string;
  hint?: string;
  hideLabel?: boolean;
  placeholder?: string;
  /** Read once. The example starts again with a document in the format. */
  format?: EditorValueFormat;
  /** The toolbar's controls, which it lays out in its groups. */
  controls?: EditorControlKind[];
  rows?: number;
  /** 0 lets the box grow with the document. */
  maxRows?: number;
  /** 0 leaves the count out. */
  characterLimit?: number;
  errorMessage?: string;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  richText?: boolean;
  multiLine?: boolean;
  markdown?: boolean;
  checkLists?: boolean;
  /** Takes images and files, which this example keeps in the page. */
  attachments?: boolean;
  /** Typing @ mentions a member of the team. */
  mentions?: boolean;
  /** Typing `:` and a word puts in an emoji, as text. */
  emoji?: boolean;
  /** Selecting text offers suggestions from a model. */
  ai?: boolean;
  /** Puts the editor in a Form, which checks and sends it. */
  form?: boolean;
  /** A Callout points at Source, until the source is shown or the tip is closed. */
  tip?: boolean;
};

// A caseworker's note, in the two formats the editor reads and writes.
const notes: Record<EditorValueFormat, string> = {
  html: `<h2>Visit on 4 October</h2><p>The applicant <strong>confirmed</strong> their address and gave a phone number. They asked about:</p><ul><li>the <a href="https://www.gov.uk/">eligibility rules</a></li><li>when a decision will come</li></ul><p>In order to process the claim, please provide the evidence by Friday.</p>`,
  markdown: `## Visit on 4 October

The applicant **confirmed** their address and gave a phone number. They asked about:

- the [eligibility rules](https://www.gov.uk/)
- when a decision will come

In order to process the claim, please provide the evidence by Friday.`,
};

// The team, whom @ mentions, named after prime ministers as site/names.md records.
const team: EditorPromptItem[] = [
  {
    value: "chamberlain",
    label: "Neville Chamberlain",
    search: "Neville Chamberlain caseworker",
  },
  { value: "baldwin", label: "Stanley Baldwin", search: "Stanley Baldwin team leader" },
  { value: "macdonald", label: "Ramsay MacDonald", search: "Ramsay MacDonald decision maker" },
  { value: "law", label: "Bonar Law", search: "Bonar Law caseworker" },
].map((person) => ({
  ...person,
  content: (
    <span className="preview-team-member">
      <strong>{person.label}</strong> <span>{person.search.replace(person.label, "").trim()}</span>
    </span>
  ),
}));

// The emoji that `:` puts in, found by their names, as Lexxy's sandbox offers them.
const emojis: EditorPromptItem[] = [
  ["👍", "Thumbs up", "like yes agree"],
  ["👎", "Thumbs down", "dislike no"],
  ["✅", "Check", "tick done mark"],
  ["❌", "Cross", "no wrong"],
  ["❤️", "Heart", "love red"],
  ["🎉", "Party", "celebrate congratulations"],
  ["👏", "Clap", "applause well done"],
  ["🙏", "Thank you", "pray please hands"],
  ["💡", "Light bulb", "idea"],
  ["🤔", "Thinking", "thought question"],
  ["⚠️", "Warning", "caution"],
  ["📎", "Paper clip", "attachment"],
  ["📅", "Calendar", "date appointment"],
  ["📞", "Telephone", "phone call"],
].map(([character, name, words]) => ({
  value: name.toLowerCase(),
  label: character,
  search: `${name} ${words}`,
  content: `${character} ${name}`,
}));

/**
 * This example keeps a file in the page, as a data address, a little at a time. A service would
 * send it to its storage, and return the address it is kept at.
 */
function upload(file: File, { signal, onProgress }: EditorUploadHelpers) {
  return new Promise<string>((resolve, reject) => {
    let sent = 0;
    const timer = setInterval(() => {
      sent = Math.min(100, sent + 20);
      onProgress(sent);
      if (sent < 100) return;
      clearInterval(timer);
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    }, 250);
    signal.addEventListener("abort", () => clearInterval(timer), { once: true });
  });
}

const shorter: [RegExp, string][] = [
  [/\bin order to\b/gi, "to"],
  [/\bplease\s+/gi, ""],
  [/\bat this point in time\b/gi, "now"],
  [/\bregarding\b/gi, "about"],
];
const plainer: [RegExp, string][] = [
  [/\butilise\b/gi, "use"],
  [/\bprovide\b/gi, "give"],
  [/\bregarding\b/gi, "about"],
  [/\bcommence\b/gi, "start"],
  [/\bprocess\b/gi, "deal with"],
];

/** Waits like a network request, and stops early if the request is aborted. */
function delay(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) return reject(signal.reason);
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(signal.reason);
      },
      { once: true },
    );
  });
}

/** This example edits text locally. A service would send the request to a model. */
async function suggest({ instruction, text, signal }: EditorAIRequest) {
  await delay(900, signal);
  let rules: [RegExp, string][] | null = null;
  if (/short|concise|brief|fewer/i.test(instruction)) rules = shorter;
  else if (/plain|simple|clear|easy/i.test(instruction)) rules = plainer;
  if (!rules)
    throw new Error(
      "This example can only shorten text or use plain English. Try asking it to make the text shorter.",
    );
  let edited = text;
  for (const [pattern, replacement] of rules) edited = edited.replace(pattern, replacement);
  if (/^[A-Z]/.test(text)) edited = edited.replace(/^./, (first) => first.toUpperCase());
  if (edited === text) throw new Error("There is nothing to change in this text.");
  return edited;
}

/**
 * A tip of the example's own, pointing at Source until the source is first shown or the tip is
 * closed, reading the editor through useEditor.
 */
function SourceTip() {
  const { source } = useEditor();
  const [done, setDone] = useState(false);
  if (source && !done) setDone(true);
  // The toolbar measures its controls before it lays them out, so the tip comes after, at Source,
  // or at More where Source waits behind it, as on a phone.
  const [laidOut, setLaidOut] = useState(false);
  useEffect(() => setLaidOut(true), []);
  return (
    laidOut && (
      <Callout
        anchor='.x-govuk-ui-editor-toolbar :is([aria-label="Source"], [aria-label="More formatting"])'
        open={!done}
        onOpenChange={(open) => setDone(!open)}
        title="See what it submits"
      >
        Source shows what the field sends, and you can change it there.
      </Callout>
    )
  );
}

/** A tool of your own, reading the selection through useEditorAI. */
function WordCount() {
  const { selection } = useEditorAI();
  const words = selection?.text.split(/\s+/).filter(Boolean).length ?? 0;
  return <span className="preview-word-count">{words === 1 ? "1 word" : `${words} words`}</span>;
}

export default function EditorExample({
  label = "Notes for the caseworker",
  hint = "Do not include personal or financial information, like a National Insurance number.",
  hideLabel = false,
  placeholder = "What was said, and what happens next",
  format = "html",
  controls,
  rows = 15,
  maxRows = 15,
  characterLimit = 0,
  errorMessage = "",
  disabled = false,
  readOnly = false,
  required = false,
  richText = true,
  multiLine = true,
  markdown = true,
  checkLists = false,
  attachments = true,
  mentions = true,
  emoji = true,
  ai = false,
  form = false,
  tip = true,
}: Props) {
  const [value, setValue] = useState(notes[format]);
  const [saved, setSaved] = useState(false);

  const editor = (
    <Editor
      name="notes"
      label={label}
      hint={hint || undefined}
      hideLabel={hideLabel}
      placeholder={placeholder || undefined}
      format={format}
      rows={rows}
      maxRows={maxRows || null}
      value={value}
      onValueChange={setValue}
      characterLimit={characterLimit || undefined}
      errorMessage={errorMessage || undefined}
      disabled={disabled}
      readOnly={readOnly}
      required={required}
      richText={richText}
      multiLine={multiLine}
      markdown={markdown}
      checkLists={checkLists}
      attachments={attachments}
      onUpload={upload}
    >
      {richText && <EditorToolbar controls={controls} />}
      <EditorContent />
      {tip && richText && <SourceTip />}
      {mentions && <EditorPrompt trigger="@" name="person" label="Team members" items={team} />}
      {emoji && (
        <EditorPrompt trigger=":" name="emoji" label="Emoji" insert="text" items={emojis} />
      )}
      {ai && (
        <EditorAI onRequestEdit={suggest}>
          <EditorAIToolbar>
            <EditorAITools>
              <EditorAIAsk />
              <EditorAISeparator />
              <EditorAIAction instruction="Make this shorter">Shorten</EditorAIAction>
              <EditorAIAction instruction="Rewrite this in plain English">
                Plain English
              </EditorAIAction>
              <EditorAISeparator />
              <WordCount />
            </EditorAITools>
            <EditorAIPrompt />
            <EditorAISuggestion />
          </EditorAIToolbar>
        </EditorAI>
      )}
    </Editor>
  );

  return form ? (
    <Form
      errorSummary={false}
      validate={(data) =>
        String(data.get("notes") ?? "").trim() ? {} : { notes: "Enter notes for the caseworker" }
      }
      onSubmit={() => setSaved(true)}
      onInput={() => setSaved(false)}
    >
      {editor}
      <div className="preview-editor-actions">
        <Button type="submit">Save notes</Button>
        {/* The value is the example's own, so it can put the notes back as they started. */}
        <Button type="button" variant="secondary" onClick={() => setValue(notes[format])}>
          Start again
        </Button>
        {/* Said beside the button, so it takes no space of its own. */}
        <span className="preview-saved" role="status">
          {saved ? "Saved" : ""}
        </span>
      </div>
    </Form>
  ) : (
    editor
  );
}
