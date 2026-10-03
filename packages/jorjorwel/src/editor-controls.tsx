import type { ReactNode } from "react";
import { type CharacterCountWords, characterCountWords } from "x-govuk-ui/internal";

/**
 * The editor's own controls. The defaults are Lexxy's toolbar, which has files, the text's marks,
 * its formatting, colour and link, quotation and code, lists, a table and a divider, and history.
 * The rest are opt-in.
 */
export type EditorControlKind =
  | "image"
  | "file"
  | "bold"
  | "italic"
  | "strikethrough"
  | "underline"
  | "format"
  | "highlight"
  | "link"
  | "quote"
  | "code"
  | "bullet-list"
  | "numbered-list"
  | "table"
  | "divider"
  | "undo"
  | "redo"
  | "paragraph"
  | "heading-1"
  | "heading-2"
  | "heading-3"
  | "heading-4"
  | "heading-5"
  | "heading-6"
  | "clear-formatting"
  | "inline-code"
  | "code-block"
  | "subscript"
  | "superscript"
  | "check-list"
  | "indent"
  | "outdent"
  | "unlink"
  | "source";

/**
 * Every word the editor says, so a service can put them in Welsh, for example. A control's label
 * names it for screen readers and in its tooltip.
 */
export type EditorLabels = Record<EditorControlKind, string> & {
  /** Names the toolbar. */
  toolbar: string;
  /** Names More, which contains the controls a narrow toolbar has no space for. */
  more: string;
  /** The text style that is not a heading, in the formatting menu. */
  normal: string;
  /** Names a heading in the formatting menu by its place among the editor's `headings`. */
  heading: (tag: string, index: number) => string;
  colourText: string;
  colourBackground: string;
  /** Removes the text's colour and its background. */
  colourRemove: string;
  linkAddress: string;
  linkApply: string;
  linkRemove: string;
  /** The link's tools, under a link the pointer rests on or the caret is in. */
  linkTools: string;
  linkEdit: string;
  /** Said after the link's address, which opens in a new tab. */
  linkNewTab: string;
  /** Said when the address is not valid. */
  linkInvalid: string;
  /**
   * Names the document's source, after the field's label, while it shows in place of the document.
   */
  sourceText: string;
  /** Names the code block's language picker, and its first choice. */
  codeLanguage: string;
  plainText: string;
  /** The table's tools, over the table the caret is in. */
  tableTools: string;
  rows: (count: number) => string;
  columns: (count: number) => string;
  rowOptions: string;
  columnOptions: string;
  rowAdd: string;
  rowAddBefore: string;
  rowAddAfter: string;
  rowRemove: string;
  rowHeader: string;
  columnAdd: string;
  columnAddBefore: string;
  columnAddAfter: string;
  columnRemove: string;
  columnHeader: string;
  tableDelete: string;
  /** The attachment's tools, over the selected attachment. */
  attachmentTools: string;
  attachmentRemove: string;
  altText: string;
  altTextHint: string;
  altTextSave: string;
  altTextCancel: string;
  captionPlaceholder: string;
  imageCaption: string;
  videoCaption: string;
  /** Said of a file that could not be stored. */
  uploadFailed: (name: string) => string;
  /** Said while files are still uploading, when the form is sent. */
  uploadsBusy: string;
  /** What screen readers hear as an attachment moves. */
  moved: Record<
    "joined" | "formed" | "left" | "reordered" | "up" | "down" | "atStart" | "atEnd",
    string
  >;
  /** Said of a selected attachment that has no caption, name or description. */
  attachment: string;
  /** In a prompt's menu when nothing matches. */
  nothingFound: string;
  /** Names a prompt's menu, unless the prompt has a `label`. */
  suggestions: string;
  /** What the count beneath the document says, for a number of characters or words. */
  count: CharacterCountWords;
  /** An attachment's type, where its file's name has no extension to show. */
  imageType: string;
  fileType: string;
  /** The AI parts' words, which a part's own props override. */
  aiToolbar: string;
  /** What screen readers hear of the document while it offers suggestions. */
  aiInstructions: string;
  aiAsk: string;
  aiPrompt: string;
  aiPromptPlaceholder: string;
  aiSend: string;
  aiWorking: string;
  aiReplace: string;
  aiDiscard: string;
  aiClose: string;
  /** Said when a request fails without a message of its own. */
  aiFailed: string;
  /** Said when the text a suggestion is for changed while it was written. */
  aiChanged: string;
};

/** The editor's words in English. Give `labels` only the words that differ. */
export const defaultEditorLabels: EditorLabels = {
  image: "Add an image or video",
  file: "Attach a file",
  bold: "Bold",
  italic: "Italic",
  strikethrough: "Strikethrough",
  underline: "Underline",
  format: "Text formatting",
  highlight: "Colour",
  link: "Link",
  quote: "Quotation",
  code: "Code",
  "bullet-list": "Bulleted list",
  "numbered-list": "Numbered list",
  table: "Insert a table",
  divider: "Insert a divider",
  undo: "Undo",
  redo: "Redo",
  paragraph: "Normal text",
  "heading-1": "Heading 1",
  "heading-2": "Heading 2",
  "heading-3": "Heading 3",
  "heading-4": "Heading 4",
  "heading-5": "Heading 5",
  "heading-6": "Heading 6",
  "clear-formatting": "Clear formatting",
  "inline-code": "Inline code",
  "code-block": "Code block",
  subscript: "Subscript",
  superscript: "Superscript",
  "check-list": "Checklist",
  indent: "Indent",
  outdent: "Outdent",
  unlink: "Remove link",
  source: "Source",
  toolbar: "Formatting",
  more: "More formatting",
  normal: "Normal",
  heading: (tag, index) =>
    ["Large heading", "Medium heading", "Small heading"][index] ??
    `Heading ${tag.replace(/^h/, "")}`,
  colourText: "Text colour",
  colourBackground: "Background colour",
  colourRemove: "Remove all colouring",
  linkAddress: "Web address",
  linkApply: "Link",
  linkRemove: "Unlink",
  linkTools: "Link",
  linkEdit: "Edit link",
  linkNewTab: "(opens in new tab)",
  linkInvalid: "Enter a web address, like https://www.gov.uk",
  sourceText: "The document's source",
  codeLanguage: "Language",
  plainText: "Plain text",
  tableTools: "Table",
  rows: (count) => `${count} ${count === 1 ? "row" : "rows"}`,
  columns: (count) => `${count} ${count === 1 ? "column" : "columns"}`,
  rowOptions: "Row options",
  columnOptions: "Column options",
  rowAdd: "Add row",
  rowAddBefore: "Add row before",
  rowAddAfter: "Add row after",
  rowRemove: "Remove row",
  rowHeader: "Header row",
  columnAdd: "Add column",
  columnAddBefore: "Add column before",
  columnAddAfter: "Add column after",
  columnRemove: "Remove column",
  columnHeader: "Header column",
  tableDelete: "Delete table",
  attachmentTools: "Attachment",
  attachmentRemove: "Remove",
  altText: "Alternative text",
  altTextHint: "Describe the image for people who cannot see it. Keep it short.",
  altTextSave: "Save",
  altTextCancel: "Cancel",
  captionPlaceholder: "Add a caption…",
  imageCaption: "Image caption",
  videoCaption: "Video caption",
  uploadFailed: (name) => `${name} could not be uploaded`,
  uploadsBusy: "Wait for every file to finish uploading",
  moved: {
    joined: "Image added to gallery",
    formed: "Gallery created",
    left: "Image removed from gallery",
    reordered: "Image moved in gallery",
    up: "Attachment moved up",
    down: "Attachment moved down",
    atStart: "Already at the start",
    atEnd: "Already at the end",
  },
  attachment: "Attachment",
  nothingFound: "Nothing found",
  suggestions: "Suggestions",
  count: characterCountWords,
  imageType: "img",
  fileType: "file",
  aiToolbar: "Suggest an edit",
  aiInstructions:
    "Select text to show editing suggestions. Press Tab to reach them, and Escape to close them.",
  aiAsk: "Ask AI",
  aiPrompt: "Describe the change",
  aiPromptPlaceholder: "Describe the change…",
  aiSend: "Request suggestion",
  aiWorking: "Writing a suggestion…",
  aiReplace: "Replace",
  aiDiscard: "Discard",
  aiClose: "Close",
  aiFailed: "The suggestion could not be loaded. Try again.",
  aiChanged: "The text changed. Select it again to request a new suggestion.",
};

/** A colour the colour control offers, by the name screen readers hear. */
export type EditorColour = { name: string; value: string };

/**
 * The colours from GOV.UK's palette that read as text on white. Orange and yellow are left out,
 * because they do not.
 */
export const editorColours: readonly EditorColour[] = [
  { name: "Blue", value: "#1d70b8" },
  { name: "Green", value: "#0f7a52" },
  { name: "Teal", value: "#158187" },
  { name: "Purple", value: "#54319f" },
  { name: "Magenta", value: "#ca357c" },
  { name: "Red", value: "#ca3535" },
  { name: "Brown", value: "#99704a" },
];

/** GOV.UK's light tints, as backgrounds on which text in GOV.UK's black still reads. */
export const editorBackgrounds: readonly EditorColour[] = [
  { name: "Yellow", value: "#ffee80" },
  { name: "Green", value: "#cfe4dc" },
  { name: "Blue", value: "#d2e2f1" },
  { name: "Purple", value: "#ddd6ec" },
  { name: "Magenta", value: "#f4d7e5" },
  { name: "Red", value: "#f4d7d7" },
  { name: "Orange", value: "#fde4d7" },
];

const path = (d: string, stroke = 1.8) => (
  <svg
    viewBox="0 0 20 20"
    width="18"
    height="18"
    fill="none"
    stroke="currentColor"
    strokeWidth={stroke}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d={d} />
  </svg>
);

const glyph = (children: ReactNode, style?: "italic" | "underline" | "strike") => (
  <span className="x-govuk-ui-editor-glyph" data-style={style} aria-hidden="true">
    {children}
  </span>
);

const heading = (level: number) =>
  glyph(
    <>
      H<sub>{level}</sub>
    </>,
  );

/** Each control's icon. @internal */
export const controlIcons: Record<EditorControlKind, ReactNode> = {
  image: path("M3.5 4.5h13v11h-13zM3.5 13l4-4 3 3 2-2 4 4M13 8h.01"),
  file: path(
    "M14.5 9.5 9 15a3.5 3.5 0 0 1-5-5l6-6a2.3 2.3 0 0 1 3.3 3.3l-6 6a1.2 1.2 0 0 1-1.7-1.7l5.5-5.5",
  ),
  bold: glyph("B"),
  italic: glyph("I", "italic"),
  strikethrough: glyph("S", "strike"),
  underline: glyph("U", "underline"),
  format: glyph(
    <>
      T<small>t</small>
    </>,
  ),
  highlight: path("M5.5 13.5 10 4l4.5 9.5M7.2 10h5.6M3 17h14"),
  link: path(
    "M8.5 11.5a3.5 3.5 0 0 0 5 0l2.5-2.5a3.5 3.5 0 0 0-5-5l-1 1M11.5 8.5a3.5 3.5 0 0 0-5 0L4 11a3.5 3.5 0 0 0 5 5l1-1",
  ),
  quote: path(
    "M7 11.5H4V8.5a2 2 0 0 1 2-2h1M7 11.5v1a2.5 2.5 0 0 1-2.5 2.5M16 11.5h-3V8.5a2 2 0 0 1 2-2h1M16 11.5v1a2.5 2.5 0 0 1-2.5 2.5",
  ),
  code: path("M7 6 3 10l4 4M13 6l4 4-4 4"),
  "bullet-list": path("M7 5h10M7 10h10M7 15h10M3.5 5h.01M3.5 10h.01M3.5 15h.01", 2),
  "numbered-list": path("M8 5h9M8 10h9M8 15h9M3 4l1.2-.8V7.5M3 11.5h2.2L3 14h2.2"),
  table: path("M3 4.5h14v11H3zM3 9h14M3 12.5h14M8 4.5v11M13 4.5v11"),
  divider: path("M3 10h14M7 6.5 10 3.5l3 3M7 13.5l3 3 3-3"),
  undo: path("M7 7H3v-4M3.5 7a7 7 0 1 1-1 7"),
  redo: path("M13 7h4V3M16.5 7a7 7 0 1 0 1 7"),
  paragraph: path("M11 4v12M14 4v12M15.5 4H9a3.5 3.5 0 0 0 0 7h2"),
  "heading-1": heading(1),
  "heading-2": heading(2),
  "heading-3": heading(3),
  "heading-4": heading(4),
  "heading-5": heading(5),
  "heading-6": heading(6),
  "clear-formatting": path("M4 5h9M8.5 5v10M12.5 12.5l4 4m0-4-4 4"),
  "inline-code": path("M7 6 3 10l4 4M13 6l4 4-4 4M11 5l-2 10"),
  "code-block": path("M3 4.5h14v11H3zM7.5 8 5.5 10l2 2M12.5 8l2 2-2 2"),
  subscript: glyph(
    <>
      x<sub>2</sub>
    </>,
  ),
  superscript: glyph(
    <>
      x<sup>2</sup>
    </>,
  ),
  "check-list": path(
    "M3 5.5 4.5 7 7 4.5M3 11.5 4.5 13 7 10.5M3 17l1.5 1.5L7 16M9.5 5.5h7M9.5 11.5h7M9.5 17h7",
  ),
  indent: path("M3 5h14M8 10h9M3 15h14M3 8l2.5 2L3 12"),
  outdent: path("M3 5h14M8 10h9M3 15h14M5.5 8 3 10l2.5 2"),
  unlink: path(
    "M8.5 11.5a3.5 3.5 0 0 0 5 0l2.5-2.5a3.5 3.5 0 0 0-5-5l-1 1M11.5 8.5a3.5 3.5 0 0 0-5 0L4 11a3.5 3.5 0 0 0 5 5l1-1M4 4l12 12",
  ),
  source: path("M6 5 2.5 10 6 15M14 5l3.5 5L14 15M11.5 4l-3 12"),
};

/**
 * The keys that do what a control does, such as "Mod B", where Mod is the device's modifier.
 * @internal
 */
export const controlShortcuts: Partial<Record<EditorControlKind, string>> = {
  bold: "Mod B",
  italic: "Mod I",
  underline: "Mod U",
  link: "Mod K",
  undo: "Mod Z",
  redo: "Mod Shift Z",
  indent: "Tab",
  outdent: "Shift Tab",
};

/**
 * Every control, in the toolbar's groups and order. A toolbar given `controls` lays them out in
 * this order, with a keyline between groups, and history at the end of the row.
 */
export const editorToolbarGroups: readonly (readonly EditorControlKind[])[] = [
  ["image", "file"],
  ["bold", "italic", "strikethrough", "underline", "inline-code", "subscript", "superscript"],
  [
    "format",
    "paragraph",
    "heading-1",
    "heading-2",
    "heading-3",
    "heading-4",
    "heading-5",
    "heading-6",
    "clear-formatting",
    "highlight",
    "link",
    "unlink",
  ],
  [
    "quote",
    "code",
    "code-block",
    "bullet-list",
    "numbered-list",
    "check-list",
    "indent",
    "outdent",
  ],
  ["table", "divider"],
  ["source"],
  ["undo", "redo"],
];

/**
 * The toolbar's default controls, which are Lexxy's. They are images and files, when the editor
 * takes attachments, then bold, italic, strikethrough and underline, the formatting menu, colour
 * and a link, a quotation, code and lists, a table and a divider, and history.
 */
export const defaultEditorToolbar: readonly EditorControlKind[] = [
  "image",
  "file",
  "bold",
  "italic",
  "strikethrough",
  "underline",
  "format",
  "highlight",
  "link",
  "quote",
  "code",
  "bullet-list",
  "numbered-list",
  "table",
  "divider",
  "undo",
  "redo",
];
