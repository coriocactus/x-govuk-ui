import {
  defaultEditorLabels,
  defaultEditorToolbar,
  editorToolbarGroups,
} from "@x-govuk-ui/jorjorwel";
import { toastPositions } from "x-govuk-ui";
import {
  checklist,
  choice,
  number,
  type Preset,
  type PropDoc,
  range,
  reference,
  text,
  toggle,
  when,
  whenAbove0,
  whenOff,
  whenOn,
} from "./props";

/** The groups that organise the library, in the order the sidebar shows them. */
export const groups = [
  "Actions",
  "Form controls",
  "Fields and validation",
  "Navigation",
  "Page structure",
  "Layout",
  "Messages and status",
  "Data display",
  "Charts",
  "Media",
  "Overlays",
  "AI and agents",
  "Utilities",
] as const;
export type Group = (typeof groups)[number];

/** Where an example sits in the preview. */
export type Placement = {
  /**
   * Every example starts in the middle, both ways.
   *
   * - `"top"` then keeps its top edge still while it grows, as a field showing an error must, so
   *   nothing moves when feedback appears.
   * - `"bottom"` keeps its foot still, so a card's footer buttons stay under the pointer as it
   *   changes.
   * - `"foot"` is the foot of a page, such as a footer. It reaches the preview's edges and sits at
   *   its foot. As it grows, it takes the free space above it first, so the footer stays put, then
   *   the preview scrolls.
   * - `"fill"` gives a full-page example, such as a chat, the whole preview to lay out and scroll
   *   itself.
   */
  anchor?: "top" | "bottom" | "foot" | "fill";
  /**
   * The height a pinned example can grow to, such as a form that opens beneath it. It starts as
   * near the middle as leaves it space to grow that tall without the preview scrolling.
   */
  grows?: number;
  /**
   * Space kept above the example for something that opens there, such as an error summary. A
   * bottom-pinned example grows into it.
   */
  roomAbove?: number;
  /**
   * The space at the preview's sides. It is a little for an example as wide as it can be, such as a
   * gallery, or none for a band that reaches the edges.
   */
  sides?: "narrow" | "none";
  /**
   * The widest the example grows in the preview, in pixels, or "100%" for the whole width. The
   * preview places it in a WidthContainer. Without it, the example is 390 pixels wide at most.
   */
  width?: number | "100%";
  /**
   * The example's column shrinks to its content, up to `width`, so something narrower, such as a
   * sentence or a row of avatars, sits in the middle. Only for content that keeps its width as
   * people use it, since the column would follow it.
   */
  fit?: boolean;
};

type Entry = Placement & {
  name: string;
  /**
   * A first version whose API may still change. The workbench marks it in the sidebar, beside its
   * name and on its own page, and the documentation for language models says so.
   */
  experimental?: boolean;
  description: string;
  /**
   * What it follows in the GOV.UK Design System, as a component's name, such as "text-input", or
   * the page's place on the site, such as "styles/section-break". Empty where it follows none.
   */
  upstream: string;
  dependencies: string;
  changes: string;
  props: readonly PropDoc[];
  /**
   * Settings that change the example instead of the component, such as which parts it shows.
   * The playground shows each only while the settings it needs are met.
   */
  example?: readonly PropDoc[];
  /** Named starting points, each the settings for one use of the component. */
  presets?: readonly Preset[];
  /**
   * Where the example sits for its current settings, over the placement above, such as a page for
   * one example and a card for another.
   */
  placement?: (args: Record<string, unknown>) => Placement;
};

const entries = {
  input: {
    name: "Input",
    anchor: "top",
    description:
      "A familiar field, with clear guidance and feedback that stays close to the input.",
    upstream: "text-input",
    dependencies: "React · Motion",
    changes:
      "Compact spacing, rounded corners, a field that takes its container's colour, and an error message that opens between the hint and the input, where GOV.UK places it. A prefix or suffix, such as an icon, a currency or a shortcut, sits inside the field's border. With type password, it is GOV.UK's password input. Show reveals the password and Hide covers it, screen readers hear which, and it is covered again when the form is sent. A strength meter can fill beneath it, four bars coloured from red to green with a word.",
    props: [
      text("label", "Email address", { type: "ReactNode", default: "Required" }),
      text("hint", "We’ll only use this to contact you about your application.", {
        type: "ReactNode",
        rows: 2,
      }),
      toggle("hideLabel"),
      text("placeholder", "you@example.com"),
      text("prefix", "", { type: "ReactNode" }),
      text("suffix", "", { type: "ReactNode" }),
      text("errorMessage", "", { note: "The example also checks the address when you continue." }),
      toggle("disabled"),
      toggle("readOnly"),
      reference("type", '"text" | "email" | "password" | …', "text"),
      reference("strength", "boolean", "false"),
      reference("ref", "HTMLInputElement"),
    ],
    example: [
      choice(
        "password",
        [
          ["off", "No password"],
          ["show", "Password"],
          ["strength", "Password with strength"],
        ],
        "off",
        { note: "Adds a password field, as a sign-up form has." },
      ),
    ],
    presets: [
      {
        name: "With an error",
        args: {
          errorMessage: "Enter an email address in the correct format, like name@example.com",
        },
      },
      { name: "Sign up with a password", args: { password: "strength" } },
      { name: "Label hidden", args: { hideLabel: true, hint: "" } },
      { name: "Read only", args: { readOnly: true } },
    ],
  },
  "date-input": {
    name: "Date input",
    width: 640,
    description: "Ask for a date as day, month and year, with a calendar to pick it from.",
    upstream: "date-input",
    dependencies: "React · Base UI",
    changes:
      "GOV.UK's date input, three short numeric fields in a fieldset with GOV.UK's ids, merged with a Calendar. Each field is also a dial, as Time input's are. Drag it up or down, scroll over it, or press the arrow keys, and it turns a step at a time from today's date. A button beside the fields, as tall as they are with its bottom edge, opens the calendar in a popover, and choosing a day fills the fields in. The calendar's month and year are Selects, so a date of birth decades back is two choices away. The calendar also stands alone, for one date, a range across two months or several days. Its arrow keys move a day or a week, Page Up and Page Down a month, a chosen day grows into place, and the month slides the way it turns.",
    props: [
      text("legend", "When do you want your licence to start?", {
        type: "ReactNode",
        default: "Required",
      }),
      text("hint", "For example, 27 3 2026", { type: "ReactNode" }),
      text("errorMessage", ""),
      toggle("calendar", true, {
        default: "false",
        note: "Adds the button that opens a Calendar.",
        needs: [when("show", "input")],
      }),
      toggle("disabled"),
      reference("value / onValueChange", "{ day, month, year } / (value) => void"),
      reference("id / name", "string", "Each field adds -day, -month or -year"),
      reference("min / max", "Date"),
      reference("errorFields", '("day" | "month" | "year")[]', "All three"),
      reference("autoCompleteBirthday", "boolean", "false"),
      reference(
        "Calendar",
        '{ mode: "single" | "range" | "multiple", value, onValueChange, months, min, max, isDateDisabled, locale }',
        "Part",
      ),
      reference("dateFromParts", "(value) => Date | null", "Helper"),
    ],
    example: [
      choice(
        "show",
        [
          ["input", "Date input"],
          ["single", "Calendar, one date"],
          ["range", "Calendar, a range"],
          ["multiple", "Calendar, several dates"],
        ],
        "input",
        { note: "Shows the date input, or the calendar on its own." },
      ),
      choice(
        "disabledDates",
        [
          ["none", "None"],
          ["future", "Future"],
          ["past", "Past"],
        ],
        "none",
        {
          note: "Dates the calendar will not offer, set by min or max.",
          needs: [
            {
              test: (args: Record<string, unknown>) =>
                args.show !== "input" || Boolean(args.calendar),
              says: "a calendar showing, from `calendar` on or `show`",
            },
          ],
        },
      ),
    ],
    presets: [
      {
        name: "With an error",
        args: { errorMessage: "The date your licence starts must be today or in the future" },
      },
      { name: "Calendar, one date", args: { show: "single" } },
      { name: "Calendar, a range", args: { show: "range" } },
      { name: "Calendar, several dates", args: { show: "multiple" } },
      { name: "No past dates", args: { show: "single", disabledDates: "past" } },
    ],
  },
  "time-input": {
    name: "Time input",
    width: 520,
    anchor: "top",
    description: "Ask for a time as hours and minutes, typed or turned like a dial.",
    upstream: "",
    dependencies: "React · Motion",
    changes:
      "GOV.UK has no time input. Ours asks as its date input does, with Hour and Minute as short fields in a row, each labelled above, and on a 12-hour clock a Toggle group for am or pm. Each field can be typed into, or turned like a dial. A faint shade at its top and bottom and the grab cursor invite a drag. Drag it up or down, scroll over it once it has focus, or press the arrow keys, Up for the value above on the drum and Down for the one below, and a drum rises out of the field as the values click past one step at a time, ticking as each passes, then fades. A press without a drag selects the value, ready to type over. The values wrap around, so 59 minutes turns to 00, and the dial can stop every 5 or 15 minutes while typing takes any minute. The fields stay text fields, as GOV.UK's date fields are, so screen readers hear what is typed. Each field submits as its own name, and an error summary links to the hour.",
    props: [
      text("legend", "What time does your appointment start?", {
        type: "ReactNode",
        default: "Required",
      }),
      choice(
        "hourCycle",
        [
          [24, "24 hours"],
          [12, "12 hours, with am or pm"],
        ],
        24,
      ),
      choice(
        "minuteStep",
        [
          [1, "Every minute"],
          [5, "Every 5 minutes"],
          [15, "Every 15 minutes"],
        ],
        5,
        { note: "Where the dial stops. Typing takes any minute." },
      ),
      text("errorMessage", ""),
      toggle("disabled"),
      reference("hint", "ReactNode"),
      reference("value / onValueChange", "{ hour, minute, period? }"),
      reference("id / name", "string"),
      reference("errorFields", '("hour" | "minute" | "period")[]', "All"),
    ],
  },
  "file-upload": {
    name: "File upload",
    width: 520,
    anchor: "top",
    description: "Let people choose a file, or drop one onto the page.",
    upstream: "file-upload",
    dependencies: "React",
    changes:
      "GOV.UK's file upload as a drop zone. The native file input lies over the whole zone, so pressing anywhere opens the picker and dropping works as the browser's own does. Dragged over, the zone turns brand blue and its contents lean towards the pointer, as if drawn by a magnet. Each chosen file is listed with its size and a Remove button, and choosing plays a sound.",
    props: [
      text("label", "Upload a photo of your passport", { type: "ReactNode", default: "Required" }),
      text("hint", "It must be a JPG, PNG or PDF, and smaller than 10 MB.", { type: "ReactNode" }),
      toggle("multiple"),
      text("errorMessage", "", { note: "The example also asks for a file when you continue." }),
      toggle("disabled"),
      reference("accept / name", "string"),
      reference("onFilesChange", "(files: File[]) => void"),
      reference("chooseText / dropText / noFileText", "string", "GOV.UK's"),
    ],
  },
  combobox: {
    name: "Combobox",
    width: 460,
    anchor: "top",
    description: "Let people choose from a long list by typing, such as a country.",
    upstream: "",
    dependencies: "React · Base UI",
    changes:
      "GOV.UK's accessible autocomplete pattern, built on Base UI's Combobox with Input's field. Options narrow as people type, the part that matches is bold, and one highlight glides between them as the menus' does. Buttons in the field clear it and show every option. It submits the chosen value with a form.",
    props: [
      text("label", "Which country do you live in?", { type: "ReactNode", default: "Required" }),
      text("hint", "Start typing, then choose from the list.", { type: "ReactNode" }),
      text("placeholder", ""),
      toggle("disabled"),
      reference("items", "(string | { value, label })[]", "Required"),
      reference("value / onValueChange", "string | null / (value) => void"),
      reference("emptyText", "string", "No results found"),
      reference("name / errorMessage", "string"),
    ],
  },
  "multi-select": {
    name: "Multi-select",
    width: 460,
    anchor: "top",
    description: "Let people choose several options from a long list by typing.",
    upstream: "",
    dependencies: "React · Base UI",
    changes:
      "Built on Base UI's Combobox, sharing Combobox's list. Each choice becomes a chip in the field with a button to remove it, and Backspace in an empty field removes the last. Chips grow in, the list stays open with ticks by the choices, and the field wraps onto more lines as it fills. For a short list, GOV.UK's Checkboxes are clearer.",
    props: [
      text("label", "Which languages do you speak?", { type: "ReactNode", default: "Required" }),
      text("hint", "Choose all that apply.", { type: "ReactNode" }),
      text("placeholder", "Start typing a language"),
      toggle("disabled"),
      reference("items", "(string | { value, label })[]", "Required"),
      reference("value / onValueChange", "string[] / (value: string[]) => void"),
      reference("emptyText", "string", "No results found"),
      reference("name / errorMessage", "string"),
    ],
  },
  "search-box": {
    name: "Search box",
    width: 460,
    description: "Let people search a site or a list, with the button attached to the field.",
    upstream: "",
    dependencies: "React",
    changes:
      "GOV.UK's site search, which is Input's field joined to a brand-blue button with a magnifying glass. It is a search landmark, so screen readers can go straight to it. Without onSearch it submits to its action, as a site search does.",
    props: [
      text("label", "Search GOV.UK", { type: "ReactNode", default: "Search" }),
      text("placeholder", ""),
      toggle("showLabel", false, {
        note: "The label is hidden by default, as the button names the search.",
      }),
      reference("onSearch", "(query: string) => void"),
      reference("action / name", "string", "q"),
      reference("value / onValueChange", "string / (value: string) => void"),
      reference("buttonLabel", "string", "Search"),
    ],
  },
  textarea: {
    name: "Textarea",
    width: 460,
    anchor: "top",
    description: "Let people give a longer answer, such as a description of a problem.",
    upstream: "textarea",
    dependencies: "React",
    changes:
      "Input's field, built from the same Field parts, so its error opens above the field. It has GOV.UK's character count. With a character or word limit, a line beneath says how many are left, turns red once there are too many, and screen readers hear it when typing pauses. It can grow with its text where the browser supports it. Its text scrolls with the thin scrollbar of a Scroll area, which follows the textarea's edge as its corner is dragged.",
    props: [
      text("label", "Can you provide more detail?", { type: "ReactNode", default: "Required" }),
      text(
        "hint",
        "Do not include personal or financial information, like your National Insurance number or credit card details.",
        { type: "ReactNode", rows: 2 },
      ),
      toggle("hideLabel"),
      text("placeholder", "For example, what happened and when it started"),
      number("rows", 5, { min: 2, default: "5" }),
      number("characterLimit", 200, {
        min: 0,
        default: "None",
        note: "Counts what is left, as GOV.UK's character count. 0 for none.",
      }),
      choice(
        "resize",
        [
          ["both", "Both"],
          ["vertical", "Vertical"],
          ["horizontal", "Horizontal"],
          ["none", "None"],
        ],
        "both",
        { note: "It never gets shorter than its rows or wider than its container." },
      ),
      toggle("autoResize", false, { note: "Grows with its text where the browser supports it." }),
      text("errorMessage", "", { note: "The example also asks for detail when you continue." }),
      toggle("disabled"),
      reference("wordLimit", "number", "None"),
      reference("threshold", "number from 0 to 1", "0"),
      reference("ref", "HTMLTextAreaElement"),
    ],
    presets: [
      { name: "Grows as you type", args: { autoResize: true, resize: "none", rows: 3 } },
      { name: "No character count", args: { characterLimit: 0 } },
      { name: "With an error", args: { errorMessage: "Enter more detail about what happened" } },
    ],
  },
  editor: {
    name: "Editor",
    width: 720,
    anchor: "top",
    description:
      "Let people write formatted text, such as a note or a letter, with headings, lists, links and attachments.",
    upstream: "",
    dependencies: "React · Base UI · Lexical · Motion",
    changes:
      "Textarea's field, built from the same Field parts, around a Lexical editor, after 37signals' Lexxy, with its defaults. The toolbar is Lexxy's, with images and files, bold, italic, strikethrough and underline, a formatting menu of normal text, the headings and Clear formatting, colour for the text and its background from GOV.UK's palette, a link, a quotation, code, bulleted and numbered lists, a table and a divider, with history at the end of the row. It is WAI-ARIA's toolbar, one Tab stop with the arrow keys moving between its controls. Each is a quiet icon Button, pressed where its formatting is on, with its name and shortcut in a Tooltip, and what has no space waits behind More. Markdown turns into formatting as it is typed, and pasted Markdown, links, Word's lists and other pages' HTML are made good. Code is a block, or inline around words on one line, coloured by its syntax with sugar-high as Code block colours code, with its language in a list at its corner. A table's tools come up over it, to add, remove and head rows and columns, and Enter and Backspace move through it as Lexxy's do. A link shows its address, which opens it in a new tab, with Edit and Unlink, under it while the pointer rests on it or the caret is in it, where Alt F10 reaches them. Each of these floating tools is a part EditorContent shows, which can be left out or joined by tools of a service's own, made with EditorTools. Given onUpload, images, video and files go in from the toolbar, a paste or a drop, drawn from the file with a progress bar while they are stored. Several images make a gallery, an image has a caption and a description, and an attachment can be dragged, or moved with Alt, Shift and the arrows, as screen readers hear. Typing with an attachment, a divider or a mention selected types after it. EditorPrompt opens a menu of suggestions on a trigger, such as `@` for mentions or `:` for emoji, filtered as people type, from a list or a service's search, and puts in a mention or text. EditorAI offers a model's suggestions for selected text, in a toolbar over it. The selection is kept while the suggestion is written, moving with the text, and the suggestion replaces the selection once approved. The model is sent the selection as plain text and as Markdown. A suggestion of text is fitted in word by word, so the words it keeps keep their formatting, links and colours, while one of Markdown comes in as written, shown formatted. A form around the editor waits while files upload. The Source control shows what the field submits in the document's place, in an editable Code block with the rest of the toolbar greyed, its HTML laid out one block on each line, and reads it back as the document. The field submits as HTML, or as Markdown, takes part in a Form by its name, and counts characters or words as the Textarea does. The box grows with the document, as Lexxy's does, the toolbar sticking to the top of the page, or with maxRows scrolls inside with the thin scrollbar. It can be plain text, or one line. Every word it says can be changed with labels.",
    props: [
      text("label", "Notes for the caseworker", { type: "ReactNode", default: "Required" }),
      text(
        "hint",
        "Do not include personal or financial information, like a National Insurance number.",
        { type: "ReactNode", rows: 2 },
      ),
      toggle("hideLabel"),
      text("placeholder", "What was said, and what happens next"),
      choice(
        "format",
        [
          ["html", "HTML"],
          ["markdown", "Markdown"],
        ],
        "html",
        {
          restart: true,
          note: "What value is read and written as. Markdown leaves out what it has no way to write, such as colour and attachments. The example starts again.",
        },
      ),
      number("rows", 15, { min: 1, note: "The document's least height, in lines of its text." }),
      number("maxRows", 15, {
        min: 0,
        default: "null",
        note: "Lines before the document scrolls inside its box. null lets the box grow, as Lexxy's does, and 0 does so here.",
      }),
      number("characterLimit", 0, {
        min: 0,
        default: "None",
        note: "Counts what is left, as GOV.UK's character count. 0 for none.",
      }),
      text("errorMessage", ""),
      toggle("disabled"),
      toggle("readOnly"),
      toggle("required", false, { note: "A blank document stops the form being sent." }),
      toggle("richText", true, {
        restart: true,
        note: "Without it, plain text, with no toolbar. The example starts again.",
      }),
      toggle("multiLine", true, {
        note: "Without it, the editor takes one line, and Enter does nothing.",
      }),
      toggle("markdown", true, { note: "Markdown shortcuts as people type, and pasted Markdown." }),
      toggle("checkLists", false, {
        restart: true,
        note: "Lists with boxes to tick. Add the Checklist control to see it. The example starts again.",
      }),
      reference("value / defaultValue / onValueChange", "string, in the format"),
      reference("name", "string", "Submits the document, and finds its Form error"),
      reference("wordLimit", "number", "None"),
      reference("threshold", "number from 0 to 1", "0"),
      reference("headings", "HeadingTagType[]", '["h2", "h3", "h4"]'),
      reference("colours / permittedColours", "{ text, background }", "GOV.UK's palette"),
      reference("onUpload", "(file, { signal, onProgress }) => Promise<string | EditorUpload>"),
      toggle("attachments", true, {
        restart: true,
        note: "Takes files, such as images, video and anything else. On by default whenever there is onUpload, as the example gives it, which keeps each file in the page. The example starts again.",
        needs: [whenOn("richText")],
      }),
      reference("permittedAttachmentTypes", "string[]", "Any"),
      reference("onFileAccept", "(file) => boolean"),
      reference("onLinkPaste", "({ url, replaceWith, insertBelow }) => void"),
      reference("onMarkdownPaste", "({ markdown, document, addBlockSpacing }) => void"),
      reference("nodes", "Lexical nodes", "The editor's own"),
      reference("labels", "Partial<EditorLabels>", "English"),
      reference("editorRef", "Ref<LexicalEditor>", "The Lexical editor"),
      checklist(
        "controls",
        editorToolbarGroups.flat().map((kind) => [kind, defaultEditorLabels[kind]] as const),
        [...defaultEditorToolbar, "source"],
        {
          default: "defaultEditorToolbar",
          note: "On EditorToolbar, the editor's own controls, laid out in their groups with history at the end. Lexxy's are its defaults, and the example adds Source.",
        },
      ),
      reference("EditorToolbar", "{ label, controls, sticky, stickyOffset, children }", "Part"),
      reference(
        "EditorControl",
        "{ kind | label, action, active, enabled, shortcut, children }",
        "Part",
      ),
      reference(
        "EditorPrompt",
        "{ trigger, name, items | search, insert, spaceInSearch, onlyAt, placement, renderMention }",
        "Part",
      ),
      reference(
        "EditorAI",
        "{ onRequestEdit: ({ instruction, text, markdown, document, signal }) => Promise<string | { text } | { markdown }>, disabled, children }",
        "Part",
      ),
      reference(
        "EditorAIToolbar / EditorAITools / EditorAIAsk / EditorAIAction / EditorAIPrompt / EditorAISuggestion",
        "",
        "Part",
      ),
      reference("EditorContent", "{ tools: the floating tools, or null for none }", "Part"),
      reference(
        "EditorTableTools / EditorLinkTools / EditorCodeLanguage / EditorAttachmentTools",
        "",
        "Part",
      ),
      reference("EditorTools", "{ label, anchor, placement, children }", "Part"),
      reference(
        "MentionNode / $createMentionNode / $isMentionNode",
        "A mention, for a service to put in itself",
        "Lexical node",
      ),
      reference("EditorTool", "{ label, icon, destructive, onClick }", "Part"),
      reference("EditorSeparator / EditorAISeparator", "", "Part"),
      reference(
        "useEditor / useEditorRead / useEditorAnchor / useEditorAltF10 / useEditorAI",
        "The Lexical editor with announce, uploadFiles, insertAttachment, source and toggleSource, its state, an element's place, Alt F10, and the suggestions' state",
        "Hook",
      ),
      reference(
        "defaultEditorToolbar / editorToolbarGroups / defaultEditorLabels / editorColours / editorBackgrounds",
        "",
        "Constant",
      ),
    ],
    example: [
      toggle("mentions", true, {
        note: "An EditorPrompt. Typing `@` mentions a member of the team.",
      }),
      toggle("emoji", true, {
        note: "An EditorPrompt that puts in text. Typing `:` and a word, such as `:thumbs`, puts in an emoji.",
      }),
      toggle("ai", false, {
        note: "EditorAI. Select text for suggestions, Shorten and Plain English, and a tool of the example's own that counts words.",
      }),
      toggle("form", false, {
        note: "Puts the editor in a Form, which checks it is filled in and stops while files are on their way.",
      }),
      toggle("tip", true, {
        note: "A Callout, reading the editor through useEditor, points at Source until the source is shown or the tip is closed.",
        needs: [
          whenOn("richText"),
          {
            prop: "controls",
            test: (value: unknown) => Array.isArray(value) && value.includes("source"),
            says: "Source among the `controls`",
          },
        ],
      }),
    ],
  },
  select: {
    name: "Select",
    anchor: "top",
    description: "Let people choose one option from a list that opens over the field.",
    upstream: "select",
    dependencies: "React · Base UI",
    changes:
      "Built on Base UI's Select and the Field parts. The field looks like Input. The list grows from it and opens with the chosen option over the field, as a native select does on a Mac. A list of more than 8 options, such as of years, opens beneath the field instead, at most 320 pixels tall with the chosen option in the middle, and scrolls in a Scroll area that fades its edges. Keys move through the options and type-ahead finds one. The tick stays on the earlier choice while the list closes, and is on the new one next time it opens. GOV.UK advises Radios for short lists.",
    props: [
      text("label", "Sort by", { type: "ReactNode", default: "Required" }),
      text("hint", "", { type: "ReactNode" }),
      toggle("hideLabel"),
      text("errorMessage", ""),
      toggle("disabled"),
      choice(
        "size",
        [
          ["medium", "Medium"],
          ["small", "Small"],
        ],
        "medium",
      ),
      reference("value / onValueChange", "string / (value: string) => void"),
      reference("placeholder", "ReactNode"),
      reference("SelectItem", "{ value, disabled, children }", "Part"),
    ],
  },
  checkboxes: {
    name: "Checkboxes",
    width: 460,
    anchor: "top",
    description: "Let people choose any number of answers from a list.",
    upstream: "checkboxes",
    dependencies: "React",
    changes:
      "GOV.UK's checkboxes, as native inputs in a fieldset, with large targets, a hover ring and GOV.UK's ids. The tick grows in. An exclusive answer such as None of these clears the others, and a follow-up question opens smoothly beneath its answer.",
    props: [
      text("legend", "Which types of waste do you transport?", {
        type: "ReactNode",
        default: "Required",
      }),
      choice(
        "legendSize",
        [
          ["small", "Small"],
          ["medium", "Medium"],
          ["large", "Large"],
        ],
        "medium",
        { default: "small" },
      ),
      text("hint", "Select all that apply.", { type: "ReactNode" }),
      text("errorMessage", ""),
      toggle("small"),
      toggle("disabled"),
      reference("name", "string", "Required"),
      reference("value / onValueChange", "string[] / (value: string[]) => void"),
      reference("Checkbox", "{ value, hint, exclusive, conditional, children }", "Part"),
      reference("ChoiceDivider", '{ children = "or" }', "Part"),
    ],
    example: [
      toggle("exclusive", true, { note: "Adds None of these, which clears the other answers." }),
      toggle("conditional", true, { note: "Asks for a farm name when farm waste is chosen." }),
    ],
    presets: [
      { name: "Without follow-ups", args: { exclusive: false, conditional: false } },
      {
        name: "Small, as filters",
        args: { small: true, legendSize: "small", hint: "", exclusive: false, conditional: false },
      },
      {
        name: "With an error",
        args: { errorMessage: "Select which types of waste you transport" },
      },
    ],
  },
  radios: {
    name: "Radios",
    width: 460,
    anchor: "top",
    description: "Let people choose one answer from a short list.",
    upstream: "radios",
    dependencies: "React",
    changes:
      "GOV.UK's radios, as native inputs in a fieldset, with large targets, a hover ring and GOV.UK's ids. The dot grows in. Short answers can sit side by side, and a follow-up question opens smoothly beneath its answer.",
    props: [
      text("legend", "How would you like to be contacted?", {
        type: "ReactNode",
        default: "Required",
      }),
      choice(
        "legendSize",
        [
          ["small", "Small"],
          ["medium", "Medium"],
          ["large", "Large"],
        ],
        "medium",
        { default: "small" },
      ),
      text("hint", "Select one option.", { type: "ReactNode" }),
      text("errorMessage", ""),
      toggle("inline", false, { note: "Follow-up questions do not show on inline radios." }),
      toggle("small"),
      toggle("disabled"),
      reference("name", "string", "Required"),
      reference("value / onValueChange", "string / (value: string) => void"),
      reference("Radio", "{ value, hint, conditional, children }", "Part"),
      reference("ChoiceDivider", '{ children = "or" }', "Part"),
    ],
    example: [
      toggle("conditional", true, {
        note: "Asks for the address or number once a way is chosen. GOV.UK keeps them out of inline radios.",
        needs: [whenOff("inline")],
      }),
    ],
    presets: [
      { name: "Inline", args: { inline: true } },
      { name: "Small", args: { small: true, legendSize: "small" } },
      { name: "As the page's heading", args: { legendSize: "large" } },
      {
        name: "With an error",
        args: { errorMessage: "Select how you would like to be contacted" },
      },
    ],
  },
  switch: {
    name: "Switch",
    description: "Turn a setting on or off straight away.",
    upstream: "",
    dependencies: "React",
    changes:
      "GOV.UK has no switch. Ours is a native checkbox with the switch role, set out as a settings row with the label on the left. The thumb fills the track to 1px inside its border, so its curve follows the track's ends. Under the pointer it reaches towards the other side, and it stretches as it slides across, its leading edge first. Use Checkboxes for answers that are submitted later.",
    props: [
      text("label", "Email notifications", { type: "ReactNode", default: "Required" }),
      text("hint", "We’ll email you when your application changes.", { type: "ReactNode" }),
      toggle("hideLabel"),
      toggle("disabled"),
      reference("checked / onCheckedChange", "boolean / (checked: boolean) => void"),
    ],
  },
  slider: {
    name: "Slider",
    description: "Pick a number from a range by dragging, or with the arrow keys.",
    upstream: "",
    dependencies: "React · Base UI",
    changes:
      "Base UI provides the behaviour and the Field parts label it. The value shows beside the label, formatted for the locale. The thumb and fill glide from step to step, and the thumb overshoots a little as it comes to rest. Each step ticks.",
    props: [
      text("label", "Search radius", { type: "ReactNode", default: "Required" }),
      text("hint", "How far from your postcode to look.", { type: "ReactNode" }),
      toggle("hideLabel"),
      number("min", 5, { default: "0" }),
      number("max", 50, { default: "100" }),
      number("step", 5, { min: 1, default: "1" }),
      toggle("showValue", true),
      toggle("disabled"),
      reference("value / onValueChange", "number / (value: number) => void"),
      reference("format", "Intl.NumberFormatOptions"),
    ],
  },
  choices: {
    name: "Choices",
    width: 480,
    anchor: "top",
    description: "Offer answers to pick from quickly, each with a letter or a number to press.",
    upstream: "",
    dependencies: "React",
    changes:
      "Answers as rows, each with a letter, a number from 1 to 9, or nothing, for a question that should be quick to answer, such as an agent's. Pressing an answer's letter or number chooses it, anywhere on the page while they are the only choices on show and nobody is typing, or only within their form, or not at all. Enter on a chosen answer sends the form, and a last row can take any words, which choose it as they are typed. One answer or several. They are native radios or checkboxes in a Fieldset, so they submit with a form, take part in a Form by their name, show its error, and start with an answer it kept. LetteredChoices and NumberedChoices are Choices with their markers set. Question card asks with them. For a service's own questions, Radios and Checkboxes are GOV.UK's.",
    props: [
      reference("name", "string", "Required"),
      reference("legend", "ReactNode", "Required"),
      reference("options", "{ value, label, hint? }[]", "Required"),
      choice(
        "markers",
        [
          ["letters", "Letters"],
          ["numbers", "Numbers"],
          ["none", "None"],
        ],
        "letters",
      ),
      toggle("multiple", false, { note: "Checkboxes, for more than one answer." }),
      choice(
        "shortcuts",
        [
          ["page", "Anywhere on the page"],
          ["form", "Within its form"],
          ["none", "None"],
        ],
        "page",
        {
          note: "Where pressing a marker's key chooses it.",
          needs: [when("markers", "letters", "numbers")],
        },
      ),
      reference("other", "string, the words shown in the last row", "None"),
      reference("value / defaultValue / onValueChange", "string[]", "Optional"),
      reference("LetteredChoices / NumberedChoices", "Choices props", "Part"),
    ],
    example: [toggle("other", true, { note: "Adds a last row to type another answer into." })],
    presets: [
      { name: "Numbers", args: { markers: "numbers" } },
      { name: "Several answers", args: { multiple: true } },
      { name: "No markers", args: { markers: "none" } },
    ],
  },
  "toggle-group": {
    name: "Toggle group",
    description: "Switch between a few views or options pressed in place.",
    upstream: "",
    dependencies: "React · Base UI · Motion",
    changes:
      "Base UI provides the behaviour. With one choice, a raised highlight glides to the pressed item, and one item always stays pressed. With several, each pressed item is shaded.",
    props: [
      toggle("multiple"),
      choice(
        "size",
        [
          ["medium", "Medium"],
          ["small", "Small"],
        ],
        "medium",
      ),
      toggle("disabled"),
      reference("value / onValueChange", "string[] / (value: string[]) => void"),
      reference("aria-label", "string", "Required"),
      reference("ToggleGroupItem", "{ value, children }", "Part"),
    ],
  },
  field: {
    name: "Field",
    // As wide as the question, so the example sits in the middle of the preview.
    width: 300,
    anchor: "top",
    description: "Connect any control to its label, hint and error message, in GOV.UK's way.",
    upstream: "error-message",
    dependencies: "React",
    changes:
      "Field, Label, Hint and ErrorMessage are the parts every field in the library is built from, and useField connects a control to them with GOV.UK's ids. The example builds a field the library does not have yet around Base UI's NumberField.",
    props: [
      text("label", "How many people live in your home?", { type: "ReactNode" }),
      text("hint", "Include yourself and any children.", { type: "ReactNode" }),
      text("errorMessage", "", { note: "Clearing the number shows an error too." }),
      reference("Field", "{ invalid, children }", "Part"),
      reference("Label", "{ htmlFor, visuallyHidden }", "Part"),
      reference("Hint", "{ id, children }", "Part"),
      reference("ErrorMessage", "{ id, children }", "Part"),
      reference("useField", "{ id, hint, errorMessage } → { id, controlProps, … }", "Hook"),
    ],
  },
  fieldset: {
    name: "Fieldset",
    width: 460,
    anchor: "top",
    description: "Group related fields under one question, such as the parts of an address.",
    upstream: "fieldset",
    dependencies: "React",
    changes:
      "GOV.UK's fieldset, with three legend sizes and a legend that can be the page's heading. Its hint and error follow GOV.UK's ids, and Radios and Checkboxes are built on it.",
    props: [
      text("legend", "What is your address?", { type: "ReactNode", default: "Required" }),
      choice(
        "legendSize",
        [
          ["small", "Small"],
          ["medium", "Medium"],
          ["large", "Large"],
        ],
        "large",
        { default: "small" },
      ),
      toggle("pageHeading"),
      text("hint", "", { type: "ReactNode" }),
      text("errorMessage", ""),
    ],
  },
  "error-summary": {
    roomAbove: 236,
    name: "Error summary",
    width: 460,
    anchor: "top",
    description: "List the errors on a page, each linking to its field.",
    upstream: "error-summary",
    dependencies: "React",
    changes:
      "GOV.UK's summary, with rounder corners and an entrance. It takes focus when it appears. Pressing an error scrolls its field's label or legend into view and focuses the field. Form shows one for its own checks. On its own, it lists errors found elsewhere, such as by a server or another form library. The example opens as a page does when the server has found problems, with the summary taking focus. It checks its answers by the same rule as Form. An answer that now passes loses its line, and one that still fails keeps its message until the form is sent again.",
    props: [
      text("title", "There is a problem", { type: "ReactNode", default: "There is a problem" }),
      reference("description", "ReactNode"),
      toggle("autoFocus", true, { default: "true" }),
      reference("ErrorSummaryItem", "{ href, children }", "Part"),
    ],
  },
  form: {
    name: "Form",
    width: 560,
    anchor: "top",
    // One page is a service's page, read from the top left. The survey in stages sits in the
    // middle and keeps its answers and buttons still. A page of questions keeps space above for its
    // error summary and messages, which open there.
    placement: ({ example, layout }) => {
      if (example !== "stages") return { anchor: "fill", width: "100%" };
      return layout === "page" ? { anchor: "bottom", roomAbove: 180 } : { anchor: "bottom" };
    },
    description: "Check a page of answers when it is sent, and show what to fix.",
    upstream: "",
    dependencies: "React · Motion",
    changes:
      "GOV.UK's way with a question page, as one component. FormSteps asks a form a step at a time, and the In stages example is a short survey asked that way. Each field takes part by its name, so Input, Textarea, Select, Radios, Checkboxes, Date input, Combobox, File upload and One-time code need nothing more. When the form is sent, one function checks every answer. If any need fixing, an Error summary opens above the fields as they ease down to make space, takes focus and lists the problems in the fields' order, each linking to its field, and every field shows its own message. Fixing an answer clears its message and its line at once, and the summary folds away when nothing is left. A failing answer that changes keeps its message until the form is sent again. While there are errors the page's title starts with Error, as GOV.UK asks. Messages that onSubmit returns, such as the server's, show in the same way. Continue with the form empty to see it. A form small enough to do without an Error summary can turn it off, and focus goes to the first field to fix instead. defaultValues gives the fields their answers to start with, such as ones kept from an earlier visit. FormSteps is a Form in steps, each a FormStep containing any fields. Continue checks only the step's answers and runs its own onContinue, such as saving a rating straight away, with a spinner on the button. Steps whose when says no are passed over, and their answers left out. It can end with Check your answers, worked out from the fields' labels and answers, with Change. It comes as GOV.UK question pages, or a card set into a page, such as a survey or an agent's questions, and Back, progress, the Error summary, the Command with Enter shortcut, the browser's history and remembering progress in local storage can each be turned on or off. The One page example is a service's page, a ServicePage with its questions in a three-quarters column.",
    props: [
      reference("validate", "(data: FormData) => FormErrors"),
      reference(
        "onSubmit",
        "(data: FormData, event) => FormErrors | undefined | Promise<…>",
        "Sends the form",
      ),
      text("errorTitle", "There is a problem", {
        type: "ReactNode",
        default: "There is a problem",
        needs: [when("example", "page")],
      }),
      toggle("titlePrefix", true, {
        default: "true",
        note: "Starts the page's title with Error.",
        needs: [when("example", "page")],
      }),
      reference("errorSummary", "boolean", "true"),
      reference("defaultValues", "Record<string, string | string[]>", "None"),
      reference("children", "Fields with a name, and a submit Button"),
      reference(
        "FormSteps",
        '{ layout: "page" | "card", title, checkAnswers, back, progress, errorSummary, shortcut, history, storageKey, onComplete, done, labels }',
        "Part",
      ),
      reference(
        "FormStep",
        "{ title?, hint?, validate, onContinue, when, optional, continueLabel, summary }",
        "Part",
      ),
    ],
    example: [
      choice(
        "example",
        [
          ["page", "One page"],
          ["stages", "In stages: a feedback survey"],
        ],
        "page",
        { note: "In stages is FormSteps, asking a short satisfaction survey." },
      ),
      choice(
        "layout",
        [
          ["card", "Card"],
          ["page", "Page"],
        ],
        "card",
        { restart: true, needs: [when("example", "stages")] },
      ),
      toggle("back", false, {
        note: "Offers Back from the second step.",
        needs: [when("example", "stages")],
      }),
      toggle("progress", false, {
        note: "Shows Question 1 of 2.",
        needs: [when("example", "stages")],
      }),
      toggle("checkAnswers", false, {
        note: "Ends with Check your answers.",
        needs: [when("example", "stages")],
        restart: true,
      }),
      toggle("remember", false, {
        note: "Keeps the answers in local storage until they are sent.",
        needs: [when("example", "stages")],
        restart: true,
      }),
      toggle("history", false, {
        note: "The browser's Back goes back a step.",
        needs: [when("example", "stages")],
        restart: true,
      }),
      toggle("fail", false, {
        note: "The rating fails to save the first time, as a server error would.",
        needs: [when("example", "stages")],
        restart: true,
      }),
    ],
    presets: [
      { name: "In stages", args: { example: "stages" } },
      {
        name: "In stages, as pages",
        args: { example: "stages", layout: "page", back: true, progress: true, history: true },
      },
      {
        name: "With Check your answers",
        args: { example: "stages", back: true, checkAnswers: true },
      },
      { name: "Saving fails once", args: { example: "stages", fail: true } },
      { name: "Remembers the answers", args: { example: "stages", remember: true } },
    ],
  },
  dialog: {
    name: "Dialog",
    description: "Ask for one decision over the page, such as confirming a deletion.",
    upstream: "",
    dependencies: "React · Base UI",
    changes:
      "GOV.UK has no dialog, and advises a page of its own for most tasks. Ours is Base UI's Dialog, built from parts. It grows into place from a little below over a dimmed page, which stays inert until it closes. Focus moves into it and returns to its button. Escape and a press outside close it with the close sound, and long content scrolls in the window.",
    props: [
      toggle("closeButton", true, { default: "true", note: "DialogContent's × button." }),
      reference("open / onOpenChange", "boolean / (open: boolean) => void"),
      reference("DialogTrigger", "Button props and { render }", "Part"),
      reference("DialogClose", "Button props", "Part"),
      reference("--x-govuk-ui-dialog-width", "CSS length", "560px"),
      reference("DialogContent", "{ closeButton, closeLabel, initialFocus, finalFocus }", "Part"),
      reference("DialogTitle / DialogDescription", "ReactNode", "Part"),
    ],
  },
  sheet: {
    name: "Sheet",
    description: "Slide a panel over the page from one edge, for filters, settings or navigation.",
    upstream: "",
    dependencies: "React · Base UI",
    changes:
      "Built from parts on Base UI's Drawer. It slides in from its edge over a dimmed page, and on a touch screen a swipe back towards the edge closes it, faster for a stronger swipe, as the backdrop fades. From the bottom it is a drawer. The Sidebar becomes a Sheet on small screens, and so does the workbench's playground.",
    props: [
      choice(
        "side",
        [
          ["right", "Right"],
          ["left", "Left"],
          ["bottom", "Bottom"],
          ["top", "Top"],
        ],
        "right",
      ),
      toggle("closeButton", true, { default: "false", note: "SheetContent's × button." }),
      reference("open / onOpenChange", "boolean / (open: boolean) => void"),
      reference("SheetTrigger", "Button props and { render }", "Part"),
      reference("SheetClose", "Button props", "Part"),
      reference("--x-govuk-ui-sheet-width", "CSS length, for a sheet at the side", "360px"),
      reference("SheetContent", "{ label, closeButton, initialFocus, finalFocus }", "Part"),
      reference("SheetTitle / SheetDescription", "ReactNode", "Part"),
    ],
  },
  popover: {
    name: "Popover",
    description: "Show a short explanation or a few controls beside the button that opens it.",
    upstream: "",
    dependencies: "React · Base UI",
    changes:
      "Built from parts on Base UI's Popover. It grows out of its button, points at it with an arrow that has the panel's keyline, and shrinks back into it. The page stays usable, and a press outside or Escape closes it with the close sound.",
    props: [
      choice(
        "side",
        [
          ["bottom", "Bottom"],
          ["top", "Top"],
          ["right", "Right"],
          ["left", "Left"],
        ],
        "bottom",
      ),
      toggle("arrow", true, { default: "true" }),
      toggle("closeButton", false),
      reference("align", '"start" | "center" | "end"', "center"),
      reference("PopoverTrigger", "Button props and { render }", "Part"),
      reference("PopoverClose", "Button props", "Part"),
      reference("PopoverTitle / PopoverDescription", "ReactNode", "Part"),
      reference("--x-govuk-ui-popover-width", "CSS length", "340px"),
    ],
  },
  callout: {
    fit: true,
    name: "Callout",
    width: 420,
    description: "Point at part of a page with help, or with a notice about something new.",
    upstream: "",
    dependencies: "React · Base UI",
    changes:
      "A card with an arrow, built on Base UI's Popover. It is brand blue with GOV.UK's inverse buttons in white, or plain, on the page's paper as Popover is. Given a trigger, such as the question mark beside a label, it is help that people ask for. Focus moves into it, and a press outside or Escape closes it. Given an anchor, an element, a ref or a selector, it is a notice that appears by itself with the notification sound, is read out without taking focus, and stays while people use the page, until they close it or its timeout passes, which stops while the pointer or focus is on it. The timeout works as Toast's does. 0, the default, keeps the notice until it is closed. The time stops while the notice is held and continues after, and a line along the foot shows the time left, which can be turned off. The × in the corner can be turned off too, as Popover's is. Whether a press outside closes it is yours to choose. It finds its own space. It measures the space on all four sides of what it points at, within the window and anything the anchor scrolls inside. Of the sides where it fits, it takes the one where it covers least, first of other open callouts, then of things people press, and then the one with the most space. It keeps that side while it still fits and covers nothing, and Base UI moves it to another if the page scrolls it out of space. Its width is --x-govuk-ui-callout-width.",
    props: [
      choice(
        "variant",
        [
          ["brand", "Brand"],
          ["plain", "Plain"],
        ],
        "brand",
      ),
      choice(
        "side",
        [
          ["auto", "Best space"],
          ["bottom", "Bottom"],
          ["top", "Top"],
          ["right", "Right"],
          ["left", "Left"],
        ],
        "auto",
      ),
      reference("anchor", "Element | ref | selector", "None"),
      reference("trigger", "ReactElement, such as a CalloutTrigger", "None"),
      reference("open / defaultOpen / onOpenChange", "boolean", "false"),
      reference("title / children / actions", "ReactNode", "None"),
      reference("align", '"start" | "center" | "end"', "center"),
      number("timeout", 0, {
        min: 0,
        note: "Milliseconds. 0 keeps the notice until it is closed, as Toast's timeout does.",
      }),
      toggle("countdown", true, {
        note: "A line shrinks as the time runs out and stops while held.",
        needs: [whenAbove0("timeout")],
      }),
      choice(
        "closeOnPressOutside",
        [
          ["default", "Help closes, the notice stays"],
          ["true", "true: both close"],
          ["false", "false: both stay"],
        ],
        "default",
        { type: "boolean", default: "true with a trigger, false with an anchor" },
      ),
      toggle("closeButton", true, { note: "The × in the corner, as Popover's closeButton." }),
      reference("closeLabel", "string", "Close"),
      reference("--x-govuk-ui-callout-width", "CSS length", "320px"),
      reference("CalloutTrigger", "Button props and { label }", "Part"),
    ],
    presets: [
      { name: "Plain, above", args: { variant: "plain", side: "top" } },
      { name: "Times out", args: { timeout: 6000 } },
      { name: "Closes on a press outside", args: { closeOnPressOutside: "true" } },
    ],
  },
  tour: {
    name: "Tour",
    width: 560,
    description: "Walk people through a page one step at a time, pointing at each part.",
    upstream: "",
    dependencies: "React · Base UI",
    changes:
      "Steps in order, each a Callout card pointing at its target, or sitting in the middle of the screen for a step about the whole page, such as a welcome. Each has its title, a sentence or two, dots and words for how far along the tour is, and Back, Next and Done. The card glides from one step to the next along the Sidebar's spring, run by the browser, and the words fade in. A step out of sight waits while the page scrolls to it, as the card fades. Each card takes the side of its target where it finds the best space. Focus moves to Next as it opens and returns afterwards, the arrow keys step through it, Escape or × closes it with the close sound, Done plays the success sound, and screen readers hear each step as it comes. The choices are yours, and each default comes first here. The tour is brand blue, or plain. The page is not dimmed, or is dimmed apart from a rounded gap around each target, which follows it as the page scrolls and glides to the next, leaving the page usable. How far someone got is kept in memory, or in local storage under a key. Opening again continues where they left it, or starts over. Closing early ends the tour, so one that opens by default stays closed, or pauses it, so it opens again where they left it. A press outside leaves it open, or closes it. Its words, including how far along it is, can be changed, such as for Welsh.",
    props: [
      choice(
        "variant",
        [
          ["brand", "Brand"],
          ["plain", "Plain"],
        ],
        "brand",
      ),
      toggle("dim", false, { note: "Dims the page apart from each step's target." }),
      { ...range("dimPadding", 6, 0, 24, 2), needs: [whenOn("dim")] },
      toggle("resume", true, { note: "Opening it again continues where someone left it." }),
      choice(
        "closing",
        [
          ["ends", "Ends the tour"],
          ["pauses", "Pauses the tour"],
        ],
        "ends",
      ),
      toggle("closeOnPressOutside", false),
      toggle("closeButton", true, { note: "The × in the corner, as Popover's closeButton." }),
      reference("open / defaultOpen / onOpenChange", "boolean", "false"),
      reference("storageKey", "string, to keep progress between visits", "None"),
      reference("onFinish", "() => void", "None"),
      reference("stepLabel", "(step, total) => string", "2 of 4"),
      reference("nextLabel / backLabel / doneLabel / closeLabel", "string", "Next, Back, Done"),
      reference(
        "--x-govuk-ui-tour-dim / --x-govuk-ui-tour-radius",
        "CSS colour / length",
        "48% black",
      ),
      reference("TourStep", "{ target?, title, children, side, align, className }", "Part"),
    ],
    example: [
      toggle("welcome", false, { note: "Starts with a welcome in the middle of the screen." }),
      toggle("remember", false, {
        note: "Sets a storageKey, so progress lasts between visits.",
      }),
    ],
    presets: [
      { name: "Dimmed", args: { dim: true } },
      { name: "With a welcome", args: { welcome: true, dim: true } },
      { name: "Pauses when closed", args: { closing: "pauses", remember: true } },
      { name: "Plain", args: { variant: "plain", closeOnPressOutside: true } },
    ],
  },
  "dropdown-menu": {
    name: "Dropdown menu",
    description: "Offer a list of actions from one button, such as an application's actions.",
    upstream: "",
    dependencies: "React · Base UI",
    changes:
      "Built from parts on Base UI's Menu, shared with Context menu. One highlight glides between items, and each item sounds a step higher down the list. Items line up in columns of icon, label and shortcut. Ticks and dots grow in, submenus open beside their item, and an action that removes something is red. The Sidebar example's service switcher is a Dropdown menu.",
    props: [
      reference("DropdownMenuTrigger", "Button props and { chevron, render }", "Part"),
      reference("MenuContent", "{ side, align }", "Part"),
      reference(
        "MenuItem",
        "{ onSelect, icon, shortcut, destructive, disabled, keepOpen }",
        "Part",
      ),
      reference("MenuCheckboxItem", "{ checked, onCheckedChange }", "Part"),
      reference(
        "MenuRadioGroup / MenuRadioItem",
        "{ label, value, onValueChange } / { value }",
        "Part",
      ),
      reference("MenuSubmenu", "{ label, icon }", "Part"),
      reference("MenuGroup / MenuSeparator / MenuLinkItem", "{ label } / none / { href }", "Part"),
      reference(
        "MenuHeader",
        "The head of a MenuGroup given no label, such as who is signed in",
        "Part",
      ),
    ],
    example: [
      toggle("icons", true, { note: "Shows an icon beside each action." }),
      toggle("shortcuts", true, { note: "Shows the shortcuts for Edit and Duplicate." }),
    ],
  },
  "context-menu": {
    name: "Context menu",
    width: 460,
    description: "Offer actions for one thing on the page, opened by a right-click or long press.",
    upstream: "",
    dependencies: "React · Base UI",
    changes:
      "Base UI's Context Menu with the same items as Dropdown menu. It opens where the pointer is, with the open sound, since a right-click is not a press the page hears. On a touch screen a long press opens it. Every action should also be available elsewhere, because a context menu is easy to miss.",
    props: [
      reference("ContextMenuTrigger", "<div> props and { render }", "Part"),
      reference("MenuContent and items", "As in Dropdown menu", "Part"),
      reference("onOpenChange", "(open: boolean) => void"),
    ],
  },
  "hover-card": {
    name: "Hover card",
    width: 460,
    description:
      "Preview where a link goes, such as a person's role, while the pointer rests on it.",
    upstream: "",
    dependencies: "React · Base UI",
    changes:
      "Built on Base UI's Preview Card. It opens after the pointer rests on its link, or when the link has keyboard focus, and stays while the pointer moves onto it. It makes no sound, because it opens without a press. Touch screens do not show it, so everything in it must also be on the linked page.",
    props: [
      choice(
        "side",
        [
          ["bottom", "Bottom"],
          ["top", "Top"],
          ["right", "Right"],
          ["left", "Left"],
        ],
        "bottom",
      ),
      toggle("arrow", true, { default: "true" }),
      number("delay", 200, { min: 0, default: "200", note: "Milliseconds before it opens." }),
      reference("closeDelay", "number", "250"),
      reference("HoverCardTrigger", "<a> props and { href, delay, closeDelay, render }", "Part"),
    ],
  },
  table: {
    name: "Table",
    width: 640,
    anchor: "top",
    description: "Compare information in rows and columns.",
    upstream: "table",
    dependencies: "React · Base UI",
    changes:
      "GOV.UK's table, built from parts, with bold headings, keylines between rows and numbers aligned right. A row is shaded under the pointer. A sortable heading is a button with arrows for its order, and rows glide to their new places when the order changes. A table too wide for its container scrolls sideways in a Scroll area, named by its caption. The playground's props list is a Table.",
    props: [
      reference("Table", "<table> props", "Root"),
      reference("TableCaption", "{ size, children }", "Part"),
      reference(
        "TableHeader / TableBody / TableFooter",
        "<thead> / <tbody> / <tfoot> props",
        "Part",
      ),
      reference("TableRow", "<tr> props", "Part"),
      reference(
        "TableHead",
        '{ numeric, sort: "ascending" | "descending" | "none", onSort }',
        "Part",
      ),
      reference("TableCell", "{ numeric }", "Part"),
    ],
    example: [
      choice(
        "size",
        [
          ["small", "Small"],
          ["medium", "Medium"],
          ["large", "Large"],
          ["extra-large", "Extra large"],
        ],
        "medium",
        { note: "TableCaption's size." },
      ),
      toggle("sortable", true, { note: "Makes each heading sort the rows." }),
    ],
  },
  "code-block": {
    name: "Code block",
    width: 640,
    description: "Show code with its syntax coloured, ready to copy.",
    upstream: "",
    dependencies: "React · Base UI · sugar-high",
    changes:
      "A block of code with its filename and a Copy button. Code is coloured from the GOV.UK palette by sugar-high, which knows about 30 languages, with line numbers left out of copies. It scrolls both ways in a Scroll area. Copy sits in a header beside the filename, or floats over the code, and its icon turns to a tick. Editable, it is a code editor. A clear text box over the coloured code takes what is typed, so the caret, selection, undo and screen readers are the browser's own, and the code is coloured again at each key. The two share one font and size and never wrap, so the text sits on its colours in any typeface. Tab moves on from it, as from any text box. The workbench's usage panel is a Code block, and the Editor's source is an editable one.",
    props: [
      reference("code / defaultCode", "string", "Required"),
      choice(
        "language",
        [
          ["tsx", "TSX"],
          ["python", "Python"],
          ["ruby", "Ruby"],
          ["html", "HTML"],
          ["shell", "Shell"],
        ],
        "tsx",
        { type: "string", note: "A name, alias or file extension." },
      ),
      toggle("lineNumbers", true),
      toggle("editable", false),
      reference("onCodeChange", "(code) => void"),
      reference("inputProps", "The text box's props, such as name, id or ref"),
      reference("filename", "string"),
      reference("label", "string"),
      reference("children", "ReactNode", "Actions"),
      reference("CodeBlockCopy", "{ label, copiedLabel, failedLabel }", "Part"),
    ],
    example: [
      toggle("header", true, { note: "Names the file in a header. Without it, Copy floats." }),
    ],
  },
  "scroll-area": {
    name: "Scroll area",
    width: 440,
    description: "Scroll content inside a box, with thin scrollbars that match in every browser.",
    upstream: "",
    dependencies: "React · Base UI",
    changes:
      "Built on Base UI's Scroll Area, with native scrolling. A thin scrollbar shows while the content moves or the pointer is over it, widens under the pointer and fades a moment later. Edges with more beyond them can fade out. Once the content scrolls, a named box is a stop for Tab and screen readers hear its name. A box without a name leaves focus to the browser, for content such as a list of links. Motion's layout animations inside allow for the distance scrolled. The preview, the playground, the usage code, the Sidebar, the Command menu's list, Table, Code block and Textarea all scroll this way.",
    props: [
      choice(
        "orientation",
        [
          ["vertical", "Vertical"],
          ["horizontal", "Horizontal"],
          ["both", "Both"],
        ],
        "vertical",
      ),
      toggle("fade", true, { default: "false" }),
      text("label", "Updates to this page", {
        note: "Names the box for screen readers once it scrolls.",
      }),
      reference("labelledBy", "string"),
      reference("viewportRef", "Ref<HTMLDivElement>"),
      reference("children", "ReactNode", "Required"),
    ],
  },
  tiles: {
    name: "Tiles",
    // A desk of tiles needs space to split into, so it takes the whole preview, as a chat does.
    width: "100%",
    anchor: "fill",
    description:
      "Lay a service out in tiles that people arrange for themselves. They drag, split, resize, maximise and close them, as on a casework desk.",
    upstream: "",
    dependencies: "React · Base UI · react-mosaic",
    changes:
      "A tiling window manager on react-mosaic, for screens that are worked in instead of read through. react-mosaic's tree of splits is the arrangement, and react-mosaic draws the board and its drop targets. Every change, from a drag, a divider or a menu, goes through the Tiles' own helpers by the tiles' ids, so a drag and the keyboard do the same thing. The Tiles sets the tiles in GOV.UK's way, flush with a keyline between, and draws its own dividers, as react-mosaic's take no keyboard. Each divider is a Resizable handle. The arrow keys move it, each step with a tick, and a double-click shares the space evenly. It can show a grip, and preview a drag, moving only the line until it is let go. A tile's bar is its handle. Drag it to another tile's edge to split that tile there, or to an edge of the desk. The band it would fill widens in link blue, and the tiles ease into their new places with a swoosh. The dock contains the closed tiles. Drag one onto any edge to open it there, or press it, and drag a tile onto the dock to close it. A TilesProvider keeps the arrangement for parts anywhere inside it, such as a dock in a sidebar, and useTilesActions gives a service's own controls every action the menu has. A tile's bar is parts too, so its heading can show a count, as the workspace's Applications does. Each tile's menu makes every move from the keyboard too, beside any tile, to an edge, swapped with another, or another tile shown in its place. It says what it did. Make larger gives a tile most of the space at each level, as react-mosaic's expand does, and Maximise fills the desk with it. Tidy lays every tile out evenly, in rows suited to the desk's proportions. Close gives a tile's space to its neighbours and its focus to the tile beside it. A narrow tile lets its buttons go, the splits first, and keeps its menu, which does what they do. In the example, Split across and Split down add a note beside a tile. Drop behaviour swaps tiles instead of splitting, or both. The workspace's Overview is Tiles, and a Resizable handle on its own sizes Piscine Assist beside it, the workbench's panels and the Sidebar.",
    props: [
      {
        ...choice(
          "dropBehaviour",
          [
            ["split", "Split"],
            ["swap", "Swap"],
            ["split-and-swap", "Split and swap"],
          ],
          "split",
          { default: '"split"' },
        ),
        note: "What a tile dropped on another does. It splits it at the edge it lands on, swaps places with it, or both, swapping at its middle.",
      },
      {
        ...choice(
          "snap",
          [
            [0, "Off"],
            [10, "10px"],
            [20, "20px"],
            [40, "40px"],
          ],
          0,
          { default: "Optional" },
        ),
        note: "A dragged divider moves in steps of this many pixels, as each arrow key does.",
      },
      toggle("grip", false, { note: "Shows a grip on each divider, so it is easier to find." }),
      toggle("previewResize", false, {
        note: "A dragged divider moves on its own, and the tiles resize once it is let go.",
      }),
      reference("value / defaultValue / onValueChange", "TilesLayout | null", "Optional"),
      reference("renderTile", "(id: string) => ReactElement", "Required"),
      reference("createTile", "() => string | null | Promise<string | null>"),
      reference("tiles", "{ id, title }[]", "Optional"),
      reference("maximised / onMaximisedChange", "string | null / (id) => void", "Optional"),
      reference(
        "onActiveChange",
        "(id: string | null) => void, as the tile in use changes",
        "Optional",
      ),
      {
        ...choice(
          "mobileBreakpoint",
          [
            [0, "Off"],
            [768, "768px"],
            [2000, "Every width"],
          ],
          0,
          { default: "Off" },
        ),
        note: "Below it, the tiles show one at a time, the one in use, with a pager in its bar.",
      },
      reference("storageKey / minSize / empty", "string / number / ReactNode", "— / 120 / —"),
      reference(
        "TilesProvider / TilesBoard",
        "Tiles' own props, split: the arrangement's and the board's",
        "Part",
      ),
      reference("Tile", "{ title, headingLevel, controls, bar, draggable }", "Part"),
      reference("TileBar / TileGrip / TileTitle / TileControls", "div and heading props", "Part"),
      reference("TileContent", "{ scroll }", "Part"),
      reference("TileSplit", '{ direction: "across" | "down" } and Button props', "Part"),
      reference("TileMenu / TileMaximise / TileClose", "Button props", "Part"),
      reference("TilePager", "On a small screen, 2 of 3 between the tile before and after", "Part"),
      reference("TilesDock", "{ label, hint, place }", "Part"),
      reference("TilesDockItem", "{ tile, place }", "Part"),
      reference("TilesTidy", "Button props", "Part"),
      reference(
        "placeTile / removeTile / swapTiles / replaceTile / expandTile / balanceTiles / keepTiles / normaliseLayout",
        "(layout, …) => TilesLayout | null",
        "Helper",
      ),
      reference("tileIds / isTilesLayout", "(layout) => string[] / (value) => boolean", "Helper"),
      reference(
        "useTilesActions / useTilesState / useTile",
        "() => actions / () => { layout, open, closed, maximised, titleOf } / () => { id, title }",
        "Hook",
      ),
      reference(
        "useTilesLayout",
        "({ storageKey, defaultValue, ids }) => [layout, setLayout]",
        "Hook",
      ),
      reference(
        "ResizableHandle",
        '{ orientation, value, min, max, defaultValue, onValueChange, onValueCommit, panel: "before" | "after", snap, grip, disabled }',
        "Part",
      ),
    ],
  },
  separator: {
    name: "Separator",
    width: 460,
    description: "Divide sections of a page, or the groups in a row such as a toolbar.",
    upstream: "styles/section-break",
    dependencies: "React · Base UI",
    changes:
      "A keyline in GOV.UK's border colour, with GOV.UK's section break spacing. Vertical separators divide the groups in a row. The workbench toolbar's dividers are Separators.",
    props: [
      choice(
        "orientation",
        [
          ["horizontal", "Horizontal"],
          ["vertical", "Vertical"],
        ],
        "horizontal",
      ),
      choice(
        "spacing",
        [
          ["none", "None"],
          ["small", "Small"],
          ["medium", "Medium"],
          ["large", "Large"],
        ],
        "medium",
        { needs: [when("orientation", "horizontal")] },
      ),
    ],
  },
  details: {
    name: "Details",
    width: 460,
    anchor: "top",
    description: "Offer help that most people do not need, behind a short link.",
    upstream: "details",
    dependencies: "React · Base UI",
    changes:
      "GOV.UK's details, built on Base UI's Collapsible. The triangle turns and the help opens smoothly along a grey bar. Closed, the help stays in the page, so find in page opens it.",
    props: [
      text("summary", "Help with nationality", { type: "ReactNode", default: "Required" }),
      toggle("defaultOpen", false, {
        restart: true,
        note: "The example starts again when it changes.",
      }),
      reference("open / onOpenChange", "boolean / (open: boolean) => void"),
      reference("children", "ReactNode", "Required"),
    ],
  },
  tabs: {
    name: "Tabs",
    width: 460,
    anchor: "top",
    description: "Switch between sections of related content, one shown at a time.",
    upstream: "tabs",
    dependencies: "React · Base UI",
    changes:
      "Built from parts on Base UI's Tabs. A link-blue bar glides beneath the open tab, as GOV.UK's service navigation marks the current page. The arrow keys move between tabs and open each in turn, and the new panel replaces the old one at once. Each tab keeps the width of its bold label, so the tabs never shift.",
    props: [
      reference("value / onValueChange", "string / (value: string) => void"),
      reference("defaultValue", "string"),
      reference("TabsList", "{ aria-label, children }", "Part"),
      reference("TabsTrigger", "{ value, disabled, children }", "Part"),
      reference("TabsPanel", "{ value, children }", "Part"),
    ],
  },
  button: {
    name: "Button",
    description: "An action with a stable label, a clear pending state and a considered finish.",
    upstream: "button",
    dependencies: "React",
    changes:
      "GOV.UK's green button, regular-weight label, bottom edge and yellow focus, with rounder corners. A pending state preserves width and keyboard focus. Outline buttons, a keyline on the page's paper as on GOV.UK's “Is this page useful?” buttons, stand out where secondary grey would disappear, such as on a tinted surface. Quiet buttons suit toolbars, and link buttons suit a lesser choice beside a button. Icon sizes make a square button for one icon, which the Sidebar trigger, Carousel and Tooltip use. A ButtonGroup sets buttons in a row, and on a phone stacks them, each the full width, as GOV.UK does. GOV.UK has no group that keeps its row. With stack off, its buttons stay side by side at their text width, as Feedback's Yes and No do. Turn on group, then try stack off on a phone. A quiet button with aria-pressed stays shaded while it is on. An icon given beside the words, before or after them, sits in their middle in every variant, as GOV.UK's start button's arrow does.",
    props: [
      text("children", "Save and continue", { type: "ReactNode", default: "Required" }),
      choice(
        "variant",
        [
          ["primary", "Primary"],
          ["secondary", "Secondary"],
          ["outline", "Outline"],
          ["warning", "Warning"],
          ["quiet", "Quiet"],
          ["link", "Link"],
        ],
        "primary",
      ),
      choice(
        "size",
        [
          ["medium", "Medium"],
          ["small", "Small"],
          ["icon", "Icon"],
          ["small-icon", "Small icon"],
        ],
        "medium",
        { note: "Icon sizes are square. Name them with aria-label." },
      ),
      toggle("loading"),
      toggle("disabled"),
      reference("ref", "HTMLButtonElement"),
      reference("ButtonGroup", "{ children }", "Part"),
    ],
    example: [
      toggle("group", false, { note: "Puts a Cancel link button beside it in a ButtonGroup." }),
      toggle("icon", false, { note: "Puts an arrow after the words, in their middle." }),
      toggle("stack", true, {
        default: "true",
        note: "ButtonGroup's. Off keeps its buttons in a row at their text width on a phone.",
        needs: [whenOn("group")],
      }),
    ],
    presets: [
      { name: "Warning", args: { variant: "warning", children: "Delete licence" } },
      { name: "Secondary", args: { variant: "secondary", children: "Save as draft" } },
      { name: "Saving", args: { loading: true } },
      { name: "With Cancel", args: { group: true } },
      { name: "Small", args: { size: "small" } },
    ],
  },
  accordion: {
    name: "Accordion",
    width: 460,
    anchor: "top",
    description:
      "Let people reveal the detail they need, with panels that open and close smoothly.",
    upstream: "accordion",
    dependencies: "React · Base UI",
    changes:
      "Built from parts. Base UI controls expansion and semantics, and CSS animates the panels. GOV.UK's Show all sections, section summaries and heading levels are parts and props. Closed panels stay in the page, so find in page reaches them.",
    props: [
      toggle("multiple", true, { default: "false" }),
      choice(
        "headingLevel",
        [
          [2, "2"],
          [3, "3"],
          [4, "4"],
          [5, "5"],
          [6, "6"],
        ],
        3,
      ),
      reference("value / defaultValue", "string[]", "[]"),
      reference("onValueChange", "(value: string[]) => void"),
      toggle("disabled"),
      reference("AccordionItem", "{ value, disabled }", "Part"),
      reference("AccordionTrigger", "{ summary, children }", "Part"),
      reference("AccordionPanel", "{ hiddenUntilFound, children }", "Part"),
      reference("AccordionShowAll", "{ showLabel, hideLabel }", "Part"),
    ],
    example: [
      toggle("showAll", true, { note: "Shows AccordionShowAll.", needs: [whenOn("multiple")] }),
      toggle("summaries", false, { note: "Gives each AccordionTrigger a summary." }),
    ],
    presets: [
      { name: "One open at a time", args: { multiple: false } },
      { name: "With summaries", args: { summaries: true } },
    ],
  },

  "input-otp": {
    name: "One-time code",
    anchor: "top",
    description: "Enter or paste a security code into a single field with separate digit slots.",
    upstream: "text-input",
    dependencies: "React · input-otp · Motion",
    changes:
      "One input supports autofill, paste and keyboard selection. Digits animate into their slots, one ring glides with the caret, and even-length codes split into two groups. While the service checks the code, a wave passes along the digits. An accepted code hops and settles with a green edge. A wrong code is the application's to clear. Only the ring turns red, at the first slot, and it returns to black when the person types again.",
    props: [
      text("label", "Security code", { type: "ReactNode", default: "Required" }),
      text("hint", "Enter the code we sent to your email address.", {
        type: "ReactNode",
        rows: 2,
      }),
      toggle("hideLabel"),
      choice(
        "maxLength",
        [
          [4, "4"],
          [6, "6"],
          [8, "8"],
        ],
        6,
        { restart: true },
      ),
      reference("placeholder", "string, one character per slot"),
      reference("errorMessage", "string"),
      reference("verifying", "boolean, while the service checks the code", "false"),
      reference("success", "boolean, once the code is accepted", "false"),
      reference("onChange", "(value: string) => void"),
      toggle("disabled"),
    ],
    example: [
      text("code", "482913", {
        note: "The correct code. Filling every slot checks the entry. A wrong code clears for another try.",
      }),
    ],
  },
  "navigation-menu": {
    name: "Navigation menu",
    width: 560,
    description: "Group service links in menus that work with a keyboard, pointer or touch.",
    upstream: "service-navigation",
    dependencies: "React · Base UI",
    changes:
      "Built from parts. Base UI manages the menus and focus, and one panel glides between menus, resizing to fit. Links take a render prop for a router's link and mark the current page. Our stylesheet supplies GOV.UK colours, spacing and reduced-motion transitions.",
    props: [
      text("label", "Services", {
        default: "Services",
        note: "Names the navigation for screen readers. It is not shown.",
      }),
      toggle("disabled"),
      reference("delay / closeDelay", "number", "80 / 180"),
      reference("NavigationMenuItem", "{ value, children }", "Part"),
      reference("NavigationMenuTrigger", "{ children }", "Part"),
      reference("NavigationMenuContent", "{ children }", "Part"),
      reference("NavigationMenuLink", "{ href, current, description, render, … }", "Part"),
    ],
  },
  toast: {
    name: "Toast",
    width: 460,
    description:
      "Short status messages that stack in a corner of the window, with actions and progress.",
    upstream: "notification-banner",
    dependencies: "React · Base UI · Motion",
    changes:
      "Compact pills stack and fan out on hover or focus. Promises turn a spinner into a tick or a cross in place. Tap a toast to dismiss it, or choose drag, where it follows the pointer, eases back if released early and slides away past the threshold. Press F6 to reach the stack and Escape to dismiss one. A close button is optional, and toasts that stay open always have one. A line along the foot of each toast that times out shrinks as its time runs out, in the colour of its type, and stops while the stack is held or the window is in the background, as the timers do. It can be turned off for every toast, or for one.",
    props: [
      reference("children", "ReactNode", "Required"),
      choice(
        "position",
        toastPositions.map(
          (position) =>
            [position, position[0]!.toUpperCase() + position.slice(1).replace("-", " ")] as const,
        ),
        "top-center",
      ),
      number("timeout", 4000, { min: 0, note: "Milliseconds. 0 keeps toasts until dismissed." }),
      number("limit", 4, { min: 1 }),
      choice(
        "dismiss",
        [
          ["tap", "Tap"],
          ["drag", "Drag"],
        ],
        "tap",
        { note: "How a pointer dismisses a toast. Keyboard users press F6, then Escape." },
      ),
      toggle("closeButton", false, {
        note: "Toasts that never time out always have one.",
        needs: [whenAbove0("timeout")],
      }),
      toggle("countdown", true, {
        note: "A line shrinks as each toast's time runs out, and stops while the stack is held.",
        needs: [whenAbove0("timeout")],
      }),
      reference("useToastManager", "add / update / close / promise", "Hook"),
      reference("type", "loading | success | error | warning | info"),
      reference("data.sound", "SoundCue", "Chosen by type"),
      reference("data.countdown", "boolean", "As the provider"),
      reference(
        "--x-govuk-ui-countdown-colour / --x-govuk-ui-countdown-height",
        "CSS",
        "Type colour",
      ),
    ],
    presets: [
      { name: "Drag to dismiss", args: { dismiss: "drag" } },
      { name: "Bottom right, until closed", args: { position: "bottom-end", timeout: 0 } },
      { name: "One at a time", args: { limit: 1 } },
    ],
  },
  carousel: {
    name: "Carousel",
    width: 460,
    description: "Move through related content with buttons, a trackpad or a touch gesture.",
    upstream: "",
    dependencies: "React · native scroll snap",
    changes:
      'Built from parts. Native scrolling handles touch and keyboard input. Buttons move between slides, the position reads as "2 of 3", and each slide is announced with its place. There is no autoplay or looping.',
    props: [
      text("label", "Featured services", {
        default: "Required",
        note: "Names the carousel for screen readers. It is not shown.",
      }),
      reference("CarouselViewport", "{ children }", "Part"),
      reference("CarouselSlide", "{ label, children }", "Part"),
      reference("CarouselControls", "{ children }", "Part"),
      reference("CarouselPrevious / CarouselNext", "{ label }", "Part"),
      reference("CarouselPosition", 'Reads as "2 of 3"', "Part"),
    ],
  },
  "command-menu": {
    name: "Command menu",
    description: "Find and run an application command from a searchable dialog.",
    upstream: "",
    dependencies: "React · Base UI",
    changes:
      "Built from parts. Base UI's Autocomplete sits inline in a dialog, as Base UI recommends for a command palette, so the first command is always highlighted. Commands sit in labelled groups, show their shortcuts as keyboard keys, and can open pages of further commands, with a trail back and Backspace to return. One highlight slides between commands, and the list, a Scroll area, eases to its new height as the search narrows it. Command-K or Control-K opens it anywhere on the page. This workbench uses it as its site-wide command menu.",
    props: [
      reference("open / onOpenChange", "boolean / (open) => void", "Uncontrolled"),
      text("placeholder", "Search commands…", { default: "Search commands…" }),
      reference("trigger", "boolean | ReactElement", "true"),
      text("triggerLabel", "Open command menu", { default: "Open command menu" }),
      toggle("hotkey", true),
      reference("emptyLabel", "string", "No commands found."),
      toggle("disabled"),
      reference("CommandMenuGroup", "{ label, children }", "Part"),
      reference(
        "CommandMenuItem",
        "{ onSelect, page, description, shortcut, icon, keywords, disabled }",
        "Part",
      ),
      reference("CommandMenuPage", "{ id, label, placeholder, children }", "Part"),
    ],
    example: [toggle("shortcuts", true, { note: "Shows a shortcut on Save your progress." })],
  },
  bubble: {
    name: "Bubble",
    width: 460,
    anchor: "top",
    description: "Show a message in a bubble, on the side of the person who sent it.",
    upstream: "",
    dependencies: "React · Base UI · Motion",
    changes:
      "shadcn's Bubble, in GOV.UK's colours. It is only the message's surface, and names, avatars and times belong around it. A bubble is as wide as its longest line, up to 80% of its row, measured by Pretext where CSS would leave a ragged gap beside its lines, and its corner nearest the sender is tighter, as a tail. Default is brand blue for the person's own messages, secondary is grey for the other side, muted is quieter, tinted is light blue, outline has an edge, ghost has no frame and takes the whole row, and destructive is red for a message that failed. With render, a bubble is a link or a button, which darkens under the pointer, dips when pressed and takes GOV.UK's focus colours. Holding a bubble opens a picker of reactions, as a phone's messages do. The bubble sinks a little while held, then springs back as the picker rises above it, each reaction popping in after the one before. A right-click opens it too, and keyboard users reach it by a button that shows once it has focus. Reactions overlap the bubble's edge, and the bubble makes space for them. Those added pop in with a single overshoot, and those removed shrink away as the others close up. Consecutive bubbles from one sender sit close in a BubbleGroup, the corners between them tightened. Conversation's bubbles are Bubbles. Hold any message in the example to react to it, and press the message that was not sent to send it again.",
    props: [
      choice(
        "variant",
        [
          ["default", "Default"],
          ["secondary", "Secondary"],
          ["muted", "Muted"],
          ["tinted", "Tinted"],
          ["outline", "Outline"],
          ["ghost", "Ghost"],
          ["destructive", "Destructive"],
        ],
        "default",
        { default: "default", note: "The person's bubbles in the example." },
      ),
      reference("align", '"start" | "end"', "start"),
      reference("BubbleContent", "{ render, children }", "Part"),
      reference("BubbleReactions", '{ side: "top" | "bottom", align: "start" | "end" }', "Part"),
      reference(
        "BubbleReactionPicker",
        "{ options: { emoji, label }[], value, onValueChange, label, hold = 300 }",
        "Part",
      ),
      reference("BubbleGroup", "{ children }", "Part"),
    ],
  },
  conversation: {
    name: "Conversation",
    anchor: "fill",
    description: "Read messages from a user and a service assistant in a scrollable conversation.",
    upstream: "",
    dependencies: "React · Motion",
    changes:
      "Built from parts, on a Message scroller. It is laid out like a chat app. The assistant writes as plain text in a centred column, and the person's messages sit in secondary Bubbles on the other side, with consecutive bubbles joined into one run. A bubble of several lines is as wide as its longest line, measured by Pretext, where CSS would leave a ragged gap beside its lines. Each message can have tools in a MessageActions row. Copy's icon turns to a tick once the text is copied, a thumb up and down fill and pop as one is chosen, and Try again's arrow turns once around as it asks for another reply. The latest message always shows its tools, so a message just sent shows them until the reply arrives, and other messages show theirs on hover. Before anything is said, the composer waits in the middle of the empty log, and glides down to the foot as the first message is sent. While the assistant writes, a shimmering status word changes every few seconds, such as Thinking or Working on a reply, or livelier words a service chooses, and screen readers hear one plain status instead. A reply that streams in as anything but plain text, such as Markdown into a Rich text, is a streaming message. Screen readers hear that it is being written, then all of it once it is done, as the example's Markdown setting shows. Each message grows out from its speaker's side. New messages are announced, and the log follows them only when the reader is near the bottom. Scrolled up, a button rises to go back to the newest message, with a dot once more has arrived. The example composes it with Chat input, Reasoning steps, Streaming text and Inline citation, and does not contact an AI service. A Callout above the composer suggests sending something, and disappears once the conversation starts.",
    props: [
      text("label", "Conversation", {
        default: "Conversation",
        note: "Names the message log for screen readers. It is not shown.",
      }),
      text("assistantName", "Service assistant", {
        default: "Service assistant",
        note: "Screen readers hear it before each reply and while the assistant thinks. It is not shown.",
      }),
      reference("empty", "ReactNode, shown in the empty log", "None"),
      reference("headingLevel", "2 | 3 | 4 | 5 | 6", "3"),
      reference(
        "ConversationMessage",
        '{ from: "user" | "assistant", streaming, children }',
        "Part",
      ),
      reference("ConversationContent", "The message's text", "Part"),
      reference("ConversationNote", "A quiet note, such as a reply stopped", "Part"),
      reference("ConversationActions", "Tools for one message", "Part"),
      reference("ConversationCopy", "{ label, copiedLabel }", "Part"),
      reference(
        "MessageRating / MessageRetry / MessageAction",
        "{ value, onValueChange } / { onRetry } / { label, icon, onClick }",
        "Part",
      ),
      reference(
        "MessageSuggestions / MessageSuggestion",
        "{ aria-label } / Button's props",
        "Part",
      ),
      reference(
        "ConversationThinking",
        "{ labels = defaultThinkingLabels, or playfulThinkingLabels }",
        "Part",
      ),
    ],
    example: [
      toggle("thinking", false, { note: "Keeps ConversationThinking showing." }),
      toggle("actions", true, {
        note: "Gives each message a ConversationCopy, and each reply a MessageRating and MessageRetry.",
      }),
      toggle("reasoning", true, { note: "Shows ReasoningSteps before each reply." }),
      toggle("citations", true, { note: "Ends each reply with an InlineCitation." }),
      toggle("markdown", false, {
        note: "Writes each reply in Markdown, streamed in pieces into a Rich text.",
      }),
      toggle("start", false, {
        note: "Shows what the assistant can do in the empty log, with the composer at its foot.",
      }),
      toggle("tip", true, {
        note: "A Callout by the composer suggests sending something, until the conversation starts.",
      }),
    ],
    presets: [
      { name: "Thinking", args: { thinking: true } },
      { name: "Plain replies", args: { reasoning: false, citations: false, actions: false } },
    ],
  },
  "grouped-table": {
    name: "Grouped table",
    width: "100%",
    description:
      "Group rows under bands, such as issues by status, with columns that give way as it narrows.",
    upstream: "",
    dependencies: "React · Base UI · Motion",
    changes:
      "Rows sit under bands, such as issues by status, and pressing a band folds its rows away on Base UI's Collapsible. Each column is as wide as its widest cell, and the columns line up across every group, with the first band heading them. No text is ever cut short or wrapped. As the table narrows, the columns give way in steps, each taken only once the one before would cut text short. Some columns are left out, then some join each row's title and the marks go, then some merge into others, as the dates into the people, and the people stand closer together. Each step moves through the rows from the top down, a little later in each row, and goes back the same way as the table widens. Past the last step, the groups scroll sideways in a Scroll area. Screen readers hear each cell's column before it, wherever it sits. With resizable, a Resizable handle on the right edge narrows and widens the table, by dragging or with the arrow keys.",
    props: [
      reference("label", "string", "Required"),
      reference(
        "columns",
        '{ id, label, icon?, align?, collapse?: "drop" | "inline" | { into } }[]',
        "Required",
      ),
      reference("toolbar", "ReactNode"),
      toggle("resizable", true, { default: "false" }),
      reference(
        "GroupedTableGroup",
        "{ label, icon, count, defaultOpen, open, onOpenChange }",
        "Part",
      ),
      reference("GroupedTableRow", "{ title, icon, cells }", "Part"),
    ],
  },
  "data-table": {
    name: "Data table",
    width: "100%",
    description: "Work through many records in a dense table, with columns you can resize.",
    upstream: "",
    dependencies: "React · Base UI · Motion",
    changes:
      "A dense table for working through many records, as a CRM's is. It is built from Table's parts in a Scroll area that scrolls both ways. The headings stay at the top, the foot at the bottom and the first columns at the side, and once the rest has scrolled under them they cast a shadow along their edge. Each column's edge is a Resizable handle, dragged or moved with the arrow keys, and double-clicking it returns the column to its width. Sortable headings sort the rows, which glide to their new places. Rows can be chosen with checkboxes, the heading one choosing every row or none. The foot counts the rows, and offers each column's figure, such as a sum or an average, on a button.",
    props: [
      reference("label", "string", "Required"),
      reference(
        "columns",
        "{ id, header, icon?, cell, sortBy?, numeric?, width, minWidth?, summary? }[]",
        "Required",
      ),
      reference("rows / rowKey / rowName", "Row[] / (row) => string", "Required"),
      choice(
        "pinned",
        [
          [0, "None"],
          [1, "First column"],
          [2, "First two columns"],
        ],
        1,
        { default: "1" },
      ),
      toggle("selectable", true, { default: "false" }),
      reference("selected / onSelectedChange", "string[] / (selected: string[]) => void"),
      reference("count", "(rows: number) => ReactNode"),
      reference("maxHeight", "number", "440"),
    ],
  },
  chart: {
    name: "Chart",
    anchor: "top",
    width: 680,
    description:
      "Show how figures change, compare, spread or relate, in any of nineteen kinds of chart, each set the same way.",
    upstream: "",
    dependencies: "React · Recharts",
    changes:
      "Nineteen kinds of chart drawn by Recharts, chosen by what the figures say, as the Analysis Function asks. Line, area, stream and slope charts show change over time, a stream as areas stacked about a centre line. Bar, lollipop and waterfall charts show size, ranking and the steps from one total to another. A dot chart sets one or two figures a category. Histograms, beeswarms, box plots and candlesticks show how figures spread. A histogram counts them in bins of round width, as many as Sturges' rule asks unless `bins` says. A beeswarm sets each as a dot along one scale, packed so none overlap until a row runs out of space, where the dots at its edges do. A scatter, which is a bubble chart with a third series, and a heat map show how measures relate. Pie, donut and funnel charts show parts of a whole, and radar and radial charts several measures of one thing. Each is set the same way, as The Economist sets its charts. A short rule in brand blue heads a headline that says what the chart shows, then a line saying what is measured, and in what. A key in squares names the series, or the plot names them itself, as the Analysis Function asks for lines and pies. Each line's name is at its end, each sector's beside it, and each bar's figure at its end. Gridlines run across only, over a darker baseline, with the figures on the right, and the source sits at the foot. Bars can be horizontal and rank, as GOV.UK's own charts do. A stack can show shares to 100%, and a diverging stack makes a population pyramid. A series can be drawn as a line over bars. A dashed line and a shaded band show a projection and its range, and a missing figure leaves a gap. One series can be picked out with the rest in grey, as the Analysis Function's focus charts are. A reference line marks a target, and a band a period. `brush` adds a slider beneath a long chart to show part of its categories. It is two native range inputs over a small drawing of the whole, which the keyboard moves a category at a time and screen readers hear as the categories they stop at. The colours are the Government Analysis Function's categorical palette, which can be told apart with colour blindness, lighter on dark paper. Where a chart tells a rise from a fall, it says so in its key, and a candle that rose is hollow. The lines draw in, and the bars and slices grow, as the chart first shows, unless motion is reduced. After that, new figures move into place, and a change of settings shows at once. Moving over the plot shows each figure in a card. Screen readers hear the chart's point in a sentence, and its figures are in a table in a Details beneath it, as GOV.UK asks of every chart. A heat map is the table itself, its cells shaded by five classes of figure named in its key. Its own words, such as Total, Running total and No figure, are its `labels`, for another language, as every chart's are. Mantine's dual axes are left out, as the Analysis Function warns against them. Several charts on one scale are a Chart set. Its parts can be laid out as its children, in whatever order a service needs. They are a FigureCaption for its headline, which names the chart, then ChartKey, ChartPlot, ChartBrush, FigureSource and ChartTable, as the example's `parts` sets the key beneath the plot. `range` and `onRangeChange` choose the categories shown from outside the chart, with or without a brush, and `categoryLabel` heads the table's first column. Figures are written as the `labels`' language writes numbers unless `format` says otherwise.",
    props: [
      choice(
        "type",
        [
          ["line", "Line"],
          ["area", "Area"],
          ["stream", "Stream"],
          ["slope", "Slope"],
          ["bar", "Bar"],
          ["lollipop", "Lollipop"],
          ["waterfall", "Waterfall"],
          ["dot", "Dot"],
          ["histogram", "Histogram"],
          ["beeswarm", "Beeswarm"],
          ["box", "Box plot"],
          ["candlestick", "Candlestick"],
          ["scatter", "Scatter"],
          ["heatmap", "Heat map"],
          ["pie", "Pie"],
          ["donut", "Donut"],
          ["funnel", "Funnel"],
          ["radar", "Radar"],
          ["radial", "Radial"],
        ],
        "line",
        { default: "Required" },
      ),
      toggle("stacked", false, {
        note: "Stacks bars and areas on one another.",
        needs: [when("type", "area", "bar")],
      }),
      toggle("normalise", false, {
        note: "Draws each stack as shares of its whole, to 100%.",
        needs: [when("type", "area", "bar"), whenOn("stacked")],
      }),
      choice(
        "orientation",
        [
          ["auto", "As the type runs"],
          ["vertical", "Vertical"],
          ["horizontal", "Horizontal"],
        ],
        "auto",
        {
          default: "Bars, waterfalls and boxes vertical, dots and lollipops horizontal",
          note: "Horizontal sets the categories down the side.",
          needs: [when("type", "bar", "lollipop", "waterfall", "dot", "box")],
        },
      ),
      toggle("direct", false, {
        note: "Names the series on the plot, instead of in a key, with each line at its end, each slice beside it and each bar by its figure.",
        needs: [
          {
            test: (args: Record<string, unknown>) =>
              !(args.type === "bar" && args.stacked) &&
              ![
                "slope",
                "stream",
                "histogram",
                "beeswarm",
                "box",
                "candlestick",
                "heatmap",
                "funnel",
                "radar",
              ].includes(String(args.type)),
            says: "a `type` that can name its figures, and bars not stacked",
          },
        ],
      }),
      choice(
        "curve",
        [
          ["smooth", "Smooth"],
          ["straight", "Straight"],
          ["step", "Steps"],
        ],
        "smooth",
        { needs: [when("type", "line", "area", "stream")] },
      ),
      toggle("brush", false, {
        note: "A slider beneath, to show part of the categories.",
        needs: [when("type", "line", "area", "bar", "stream")],
      }),
      toggle("diverging", false, {
        note: "Shows licence holders by age and sex, men running the other way from the baseline.",
        needs: [when("type", "bar"), whenOn("stacked"), when("orientation", "horizontal")],
      }),
      reference("bins", "number | number[]", "By Sturges' rule"),
      reference("highlight", "string"),
      reference("totals", "string[]"),
      reference("references", "{ at: number | string; to?; label? }[]"),
      reference("domain", "[number, number]"),
      reference("range / defaultRange", "[from: number, to: number]"),
      reference("onRangeChange", "(range: [from, to]) => void"),
      reference("title / subtitle / source", "ReactNode", "Or children"),
      reference(
        "children",
        "FigureCaption, ChartKey, ChartPlot, ChartBrush, FigureSource, ChartTable",
        "Or title",
      ),
      reference("description", "string", "Required"),
      reference("data / category", "Record<string, string | number | null>[] / string", "Required"),
      reference("categoryLabel", "string", "The category, capitalised"),
      reference(
        "series",
        "{ key, label, as?, dashed?, continues?, range?, format? }[]",
        "Required",
      ),
      reference("format", "(value: number) => string"),
      reference("height", "number", "280"),
      reference("labels", "Partial<ChartLabels>", "English"),
    ],
    example: [
      toggle("references", false, {
        note: "Marks a target, and on a line the close season as a band.",
        needs: [
          when(
            "type",
            "line",
            "area",
            "bar",
            "lollipop",
            "dot",
            "histogram",
            "beeswarm",
            "box",
            "candlestick",
            "scatter",
          ),
        ],
      }),
      toggle("focus", false, {
        note: "Picks out one series with `highlight`, or one region in a slope or council area in a beeswarm.",
        needs: [when("type", "line", "area", "bar", "dot", "slope", "beeswarm", "radar")],
      }),
      toggle("composite", false, {
        note: "Draws the 12-month licences as a line over the bars, with the series' `as`.",
        needs: [when("type", "bar"), whenOff("stacked"), when("orientation", "auto", "vertical")],
      }),
      toggle("projection", false, {
        note: "Projects the last three months, dashed, with a band for their range.",
        needs: [when("type", "line", "area")],
      }),
      toggle("parts", false, {
        note: "Sets the chart out from its parts, as its children, the key beneath the plot.",
        needs: [when("type", "line", "area"), whenOff("projection")],
      }),
    ],
    presets: [
      { name: "Ranked bars", args: { type: "bar", orientation: "horizontal", direct: true } },
      {
        name: "Population pyramid",
        args: { type: "bar", stacked: true, orientation: "horizontal", diverging: true },
      },
      { name: "Shares of a whole", args: { type: "bar", stacked: true, normalise: true } },
      { name: "Bars with a line", args: { type: "bar", composite: true } },
      { name: "Projection", args: { type: "line", projection: true, direct: true } },
      { name: "One line picked out", args: { type: "line", focus: true, direct: true } },
      { name: "Target and season", args: { type: "line", references: true } },
      { name: "Part of the year", args: { type: "line", brush: true, direct: true } },
      { name: "Waits against a promise", args: { type: "histogram", references: true } },
      { name: "One council area picked out", args: { type: "beeswarm", focus: true } },
    ],
  },
  "chart-set": {
    name: "Chart set",
    anchor: "top",
    width: 760,
    description: "Compare several charts side by side on one scale, as small multiples.",
    upstream: "",
    dependencies: "React · Recharts",
    changes:
      "Several charts of one kind in a grid, each showing one slice of the figures on one shared scale, so the eye compares the panels without reading their axes, as the Analysis Function suggests in place of a crowded chart or a stacked bar with negatives. The set has Chart's rule, headline, key and source once, and each panel keeps its own title. The panels are given as data, each a chart's figures with its title, so the set knows its scale before it draws any. The scale runs from the lowest figure to the highest that the panels draw, such as their tallest stack, a waterfall's running total or a band's bounds, across every panel whose type has a value axis. Moving over one panel shows the same category's card in every panel, matched by its name. Screen readers hear the set's point with its title and each panel's own, and every panel's figures are in tables in one Details beneath. The panels stack on a phone. The set's own parts can be set out as its children, as a Chart's can, ChartPlot being the panels.",
    props: [
      number("columns", 2, { min: 1, note: "How many panels sit side by side." }),
      reference("height", "number", "160"),
      reference(
        "panels",
        "{ title, description, type, data, category, series, ... }[]",
        "Required",
      ),
      reference("title / subtitle / source", "ReactNode", "Or children"),
      reference(
        "children",
        "FigureCaption, ChartKey, ChartPlot, FigureSource, ChartTable",
        "Or title",
      ),
      reference("description", "string", "Required"),
      reference("labels", "Partial<ChartLabels>", "English"),
    ],
    example: [
      choice(
        "type",
        [
          ["line", "Lines"],
          ["bar", "Bars"],
        ],
        "line",
      ),
      toggle("stacked", true, { needs: [when("type", "bar")] }),
    ],
  },
  "calendar-heatmap": {
    name: "Calendar heat map",
    width: 760,
    description: "Show a figure for every day of a year, to find the patterns by week and season.",
    upstream: "",
    dependencies: "React",
    changes:
      "A year of weeks side by side, as the Analysis Function suggests for a time series with a pattern by the day of the week, after Mantine's Heatmap. Each day is a small square in one of five shades of the palette's first colour, a class of figures each, named in the key, and a day with no figure is hatched, as the key's No figure is. Months are named along the top and days of the week down the side, Monday first. Moving over a day shows its date and figure in a card, and outlines it. It has a Chart's rule, headline and source. Screen readers hear its point in a sentence, and every day's figure is in a table beneath, set as the calendar is, a row for each week. On a narrow screen the weeks scroll sideways. Its `labels` take its words for another language, and their `locale`, such as \"cy\" for Welsh, names its months and days and writes its dates. The example's figures are made up from the season and the day of the week, and Christmas Day has none. Its parts can be laid out as its children, as a Chart's can.",
    props: [
      reference("title / subtitle / source", "ReactNode"),
      reference("description", "string", "Required"),
      reference("data", "Record<string, number>", "Required"),
      reference("label", "string", "Required"),
      reference("start / end", "string", "The year to the last day with a figure"),
      reference("format", "(value: number) => string"),
      reference("domain", "[number, number]"),
      reference("labels", "Partial<ChartLabels>", "English"),
    ],
    example: [
      toggle("season", false, { note: "Starts the calendar in April, with the `start` prop." }),
    ],
  },
  "choropleth-map": {
    name: "Choropleth map",
    anchor: "top",
    width: 680,
    description: "Show how a figure differs from place to place, each area shaded by its figure.",
    upstream: "",
    dependencies: "React",
    changes:
      "Areas shaded by their figures, as the Analysis Function suggests for figures that differ by place, in the five classes a heat map uses, named in the key. An area without a figure is hatched, and the key says so. Mantine has no map. The boundaries are the service's own, as GeoJSON, so the map brings no geography of its own. The example's are the Office for National Statistics' nine regions of England, simplified to within about a kilometre, under the Open Government Licence. They are drawn on a plain projection that keeps a small country's shape, its longitude narrowed by the cosine of its middle latitude, and the map keeps its shape in the middle of its width. Moving over an area outlines it and shows its name and figure in a card. It has a Chart's rule, headline and source. Screen readers hear its point in a sentence, and every area's figure is in a table beneath, as a map alone tells a screen reader nothing. Its parts can be laid out as its children, as a Chart's can.",
    props: [
      reference("title / subtitle / source", "ReactNode"),
      reference("description", "string", "Required"),
      reference("areas", "{ code, name, geometry }[]", "Required"),
      reference("data", "Record<string, number>", "Required"),
      reference("label", "string", "Required"),
      reference("nameLabel", "string", "Area"),
      reference("format", "(value: number) => string"),
      reference("domain", "[number, number]"),
      reference("height", "number", "440"),
      reference("labels", "Partial<ChartLabels>", "English"),
    ],
    example: [
      toggle("missing", false, { note: "Leaves London without a figure, which hatches it." }),
    ],
  },
  treemap: {
    name: "Treemap",
    anchor: "top",
    width: 680,
    description:
      "Show the parts of a whole as rectangles as large as their figures, nested in branches.",
    upstream: "",
    dependencies: "React · Recharts",
    changes:
      "Rectangles as large as their figures, nested in their branches, as the Analysis Function suggests for part-to-whole with many parts, after Mantine's Treemap. Each branch at the top takes the next colour of the Analysis Function's palette, named in the key, and its parts share it, parted by lines of the paper's colour. Each part is named with its figure in the ink that reads on its colour, where the words fit in the page's own font, measured as they render. Moving over a part shows its path, figure and share in a card. It has a Chart's rule, headline and source. Screen readers hear its point in a sentence, and every branch and part is in a table beneath, by its path, with its figure and share. The parts grow into place as it first shows, unless motion is reduced. Its parts can be laid out as its children, as a Chart's can.",
    props: [
      reference("title / subtitle / source", "ReactNode"),
      reference("description", "string", "Required"),
      reference("data", "{ name, value?, children? }[]", "Required"),
      reference("nameLabel / valueLabel", "string", "Required"),
      reference("format", "(value: number) => string"),
      reference("height", "number", "320"),
      reference("labels", "Partial<ChartLabels>", "English"),
    ],
    example: [
      toggle("nested", true, { note: "Splits each area of spending into its programmes." }),
    ],
  },
  sunburst: {
    name: "Sunburst",
    width: 680,
    description: "Show the parts of a whole in rings, each branch with its parts beyond it.",
    upstream: "",
    dependencies: "React · Recharts",
    changes:
      "A tree of figures in rings, after Mantine's SunburstChart. Each branch is an arc in the middle ring, as long as its figure, and its parts are in the rings beyond, in a paler shade of its colour. The branches are named in the key. Recharts writes each arc's raw figure on it, which the card and table give in the service's own format, so the arcs are left without words. Moving over an arc shows its path, figure and share in a card. It has a Chart's rule, headline and source, and every part's figure is in a table beneath. Arcs are read less exactly than lengths, so prefer a Treemap or a Chart's bars to compare the parts. Its parts can be laid out as its children, as a Chart's can.",
    props: [
      reference("title / subtitle / source", "ReactNode"),
      reference("description", "string", "Required"),
      reference("data", "{ name, value?, children? }[]", "Required"),
      reference("nameLabel / valueLabel", "string", "Required"),
      reference("format", "(value: number) => string"),
      reference("height", "number", "320"),
      reference("labels", "Partial<ChartLabels>", "English"),
    ],
  },
  sankey: {
    name: "Sankey",
    width: 720,
    description:
      "Show how things move from one stage to the next, each flow as wide as its figure.",
    upstream: "",
    dependencies: "React · Recharts",
    changes:
      "A Sankey diagram, as the Analysis Function suggests for flows, after Mantine's SankeyChart. The flows are given by the names of the stages they join, instead of Recharts' indexes, and the stages are set in columns by how far along they are. Each stage is a bar as tall as what passes through it, in the next colour of the palette, named with its figure beside it. The name comes after the bar, or before it for the last stages. Each flow is a band in the colour of the stage it leaves, faint until the pointer is on it. Moving over a flow or a stage shows its figure in a card. It has a Chart's rule, headline and source. Screen readers hear its point in a sentence, and every flow is in a table beneath, from, to and figure. Its parts can be laid out as its children, as a Chart's can. A flow can only go forward, so one that loops back to a stage it came through is left out of the drawing, though the table lists it.",
    props: [
      reference("title / subtitle / source", "ReactNode"),
      reference("description", "string", "Required"),
      reference("links", "{ from, to, value }[]", "Required"),
      reference("valueLabel", "string", "Required"),
      reference("format", "(value: number) => string"),
      reference("height", "number", "320"),
      reference("labels", "Partial<ChartLabels>", "English"),
    ],
  },
  "bar-list": {
    name: "Bar list",
    anchor: "top",
    width: 560,
    description: "Rank a list of figures, each with a bar behind its name as long as its figure.",
    upstream: "",
    dependencies: "React",
    changes:
      "A ranked list as GOV.UK draws a horizontal bar chart in HTML, after Mantine's BarsList. Each name sits over a bar as long as its figure, with the figure at the row's end. It is a GOV.UK table, so screen readers hear each name with its figure, and it needs no description or table of its own. The bars are a tint of the palette's first colour, so the names read on them in the page's ink, with a solid edge where each ends. They lie behind the names, out of the flow, so as they grow when the list first shows, and as they change, they move no text.",
    props: [
      reference("data", "{ label, value, id? }[]", "Required"),
      reference("nameLabel / valueLabel", "ReactNode", "Required"),
      text("caption", "Licences sold by region, 2025", { type: "ReactNode" }),
      reference("format", "(value: number) => string"),
      reference("max", "number", "The largest figure"),
    ],
  },
  "bullet-chart": {
    name: "Bullet chart",
    anchor: "top",
    width: 560,
    description: "Show a figure against its target, with bands for what the figures mean.",
    upstream: "",
    dependencies: "React",
    changes:
      "Stephen Few's bullet graph, after Mantine's BulletChart. It has a bar for the figure, a mark across it for the target, and bands of grey behind it that darken as they rise, such as poor, fair and good, with a scale beneath. The label, the figure and the target are words above the bar, and the bands are named in a key, so no reader needs the greys, and screen readers hear each band's range too. Several one above another compare measures in little space, as the example's three do. The bar grows from its start as it first shows, unless motion is reduced. Its bands' greys darken evenly from the palest to the darkest, however many bands there are.",
    props: [
      reference("label / description", "ReactNode"),
      reference("value", "number", "Required"),
      reference("target", "number"),
      reference("ranges", "{ to, label }[]"),
      reference("min / max", "number", "0 / the last range's end"),
      reference("format", "(value: number) => string"),
      reference("labels", "Partial<ChartLabels>", "English"),
    ],
    example: [
      toggle("bands", true, { note: "Shades the bands behind each bar, with `ranges`." }),
      toggle("targets", true, { note: "Marks each measure's `target`." }),
    ],
  },
  gauge: {
    name: "Gauge",
    anchor: "top",
    width: 320,
    description: "Show one figure on a dial between two others, such as a share done in time.",
    upstream: "",
    dependencies: "React",
    changes:
      "One figure on a dial two thirds of a turn round, after Mantine's GaugeChart, with the figure large in its middle and what it measures beneath. The dial fills in the palette's first colour, or GOV.UK's green or red for good or bad news, from its start as it first shows, and eases as the figure changes, unless motion is reduced. A target is a mark across the dial. Screen readers hear a meter named by its label, with the figure, the range and the target in words. A dial is read less exactly than a bar, so use one for a single figure that matters, and a Bullet chart to compare several.",
    props: [
      reference("label / description", "ReactNode"),
      range("value", 82, 0, 100, 1),
      reference("min / max", "number", "0 / 100"),
      choice(
        "sentiment",
        [
          ["neutral", "Neutral"],
          ["good", "Good"],
          ["bad", "Bad"],
        ],
        "neutral",
      ),
      number("size", 180, { min: 120 }),
      reference("format", "(value: number) => string"),
      reference("labels", "Partial<ChartLabels>", "English"),
    ],
    example: [toggle("target", true, { note: "Marks the target of 90%." })],
    presets: [
      { name: "Good news", args: { sentiment: "good", value: 94 } },
      { name: "Bad news", args: { sentiment: "bad", value: 41 } },
    ],
  },
  waffle: {
    name: "Waffle",
    anchor: "top",
    width: 560,
    description:
      "Show the parts of a whole as a grid of a hundred cells, so each cell is one in a hundred.",
    upstream: "",
    dependencies: "React",
    changes:
      "Parts of a whole as a grid of cells, a hundred by default, so each cell is one in a hundred, as ONS shows \"1 in 4\", after Mantine's WaffleChart. Each part takes the next colour of the palette, and its cells by the largest remainder, so they always add up and no part gains or loses more than one by rounding. A whole larger than its parts, such as everyone asked when some did not answer, leaves the rest of the cells empty. The key names each part with its figure and share, so the words say what the colours show, and screen readers hear only the key. The grid sits beside the key while there is space, by the waffle's own width, and above it when there is not. Its cells fill in, in reading order, as it first shows, unless motion is reduced.",
    props: [
      reference("data", "{ label, value }[]", "Required"),
      number("rows", 10, { min: 1 }),
      number("columns", 10, { min: 1 }),
      reference("total", "number", "The parts' sum"),
      reference("format", "(value: number) => string"),
    ],
    example: [
      toggle("total", true, {
        note: "Counts everyone asked, so the 12 who did not answer leave their cells empty.",
      }),
    ],
  },
  sparkline: {
    name: "Sparkline",
    width: 560,
    description: "Show a trend as small as a word, beside its figure or in a table's cell.",
    upstream: "",
    dependencies: "React",
    changes:
      "A line as small as a word, as Tufte drew them, after Mantine's Sparkline. It has no axes and no grid, only the line, shaded beneath, with its latest figure marked by a dot. It stretches to its container's width and keeps its stroke and its dot round as it does, and a missing figure leaves a gap. The line is the palette's first colour, or GOV.UK's green or red for a trend that is good or bad news, as Stat's change is. It draws in from the left as it first shows, unless motion is reduced. Screen readers hear its description, as a line alone tells them nothing, so give the figures beside it, as the example's table does. The North East's July is missing.",
    props: [
      reference("data", "(number | null)[]", "Required"),
      reference("description", "string", "Required"),
      toggle("area", true, { note: "Shades the area beneath the line." }),
      choice(
        "curve",
        [
          ["smooth", "Smooth"],
          ["straight", "Straight"],
          ["step", "Steps"],
        ],
        "smooth",
      ),
      choice(
        "sentiment",
        [
          ["neutral", "Neutral"],
          ["good", "Good"],
          ["bad", "Bad"],
        ],
        "neutral",
      ),
      reference("domain", "[number, number]"),
      reference("height", "number", "32"),
    ],
  },
  stat: {
    name: "Stat",
    width: 720,
    description: "Show the figures that matter, large, with how each has moved.",
    upstream: "",
    dependencies: "React",
    changes:
      "One figure that matters, set as The Economist sets a big number. The figure is large and bold in tabular numerals, with what it counts above it in quiet small text. Beneath it is a line such as the period, or how the figure has moved since the last one, with an arrow. A move that is good news is GOV.UK's green and one that is bad its red, with the arrow and the words saying it too, so colour never works alone. Each stat's words are a description list, so screen readers hear the label as a term and the figure as what it means. Stats sets several side by side with a keyline between each, or one above another, in a Figure, so with a title, a subtitle and a source they read as a Chart does, and a dashboard's numbers and its charts read as one. The row is a grid of equal cells, as many across as fit, wrapping as the space runs out, and each stat sizes its figure and icon to the space its cell has.",
    props: [
      reference("label / value", "ReactNode", "Required"),
      reference("description", "ReactNode"),
      reference(
        "change",
        "{ value, direction: up | down | flat, sentiment?: good | bad | neutral }",
      ),
      reference("icon", "ReactNode"),
      choice(
        "orientation",
        [
          ["horizontal", "Horizontal"],
          ["vertical", "Vertical"],
        ],
        "horizontal",
        { note: "On Stats." },
      ),
      choice(
        "align",
        [
          ["start", "Start"],
          ["centre", "Centre"],
        ],
        "start",
        { note: "On Stats. Centres each stat's words." },
      ),
      reference("title / subtitle / source", "ReactNode", "On Stats"),
      reference("children", "Stat parts", "On Stats"),
    ],
    example: [
      toggle("titled", true, { note: "Heads the figures with a rule, a headline and a source." }),
      toggle("icons", false),
    ],
    presets: [
      { name: "Figures alone", args: { titled: false } },
      { name: "With icons", args: { icons: true } },
      { name: "Centred", args: { align: "centre", titled: false } },
      { name: "In a column", args: { orientation: "vertical", align: "centre", titled: false } },
    ],
  },
  figure: {
    name: "Figure",
    width: 640,
    anchor: "top",
    description: "Set a chart, a table or figures under a headline, with their source.",
    upstream: "",
    dependencies: "React · Base UI",
    changes:
      "The frame every chart and Stats are set in, as GOV.UK's statistics set their figures. It has a short rule in brand blue over a headline and a line saying what is measured, then the content, then where it comes from, and the figures in a table a reader opens. A service sets its own content in it the same way, such as a drawing or a table, and a chart's parts can be laid out in it in another order. The figure is named by its headline. A drawing is a picture to screen readers, so its figures go in FigureData beneath it, as GOV.UK asks.",
    props: [
      reference("description", "string", "Optional"),
      reference("FigureCaption", "{ title, subtitle }", "Part"),
      reference("FigureSource", "children", "Part"),
      reference("FigureData", "{ summary, open, defaultOpen, onOpenChange, children }", "Part"),
    ],
    example: [
      toggle("subtitle", true),
      toggle("source", true),
      toggle("figures", true, { note: "Adds the figures as a table beneath, as a drawing needs." }),
    ],
  },
  timeline: {
    name: "Timeline",
    width: 560,
    anchor: "top",
    grows: 640,
    description: "Show the history of a case or a thing, the latest event first.",
    upstream: "",
    dependencies: "React · Motion",
    changes:
      "The Home Office design system's timeline. Events run down one unbroken rail, the latest first. Each event's heading has a knob on the rail, as Slider's thumb is, with a line as thick as the rail running on from its ring to the heading, the latest in brand blue. Each event says what happened, who or what did it, and when, written as GOV.UK writes dates and times, such as 12 March 2026 at 2:05pm, in a time element. An event added while the timeline is on screen opens into place at once as the others move down, its knob grows on the rail and its line draws out, and it plays the notification sound. The rail is a rounded bar, as Inset text's is.",
    props: [
      reference("label", "string"),
      reference("headingLevel", "2 | 3 | 4 | 5 | 6", "3"),
      reference("TimelineItem", "{ title, by, date, children, actions }", "Part"),
      reference("formatDateTime", "(date: Date) => string", "Helper"),
    ],
  },
  "summary-list": {
    name: "Summary list",
    width: 680,
    description: "Show pairs of keys and values, such as answers people can check and change.",
    upstream: "summary-list",
    dependencies: "React",
    changes:
      "GOV.UK's summary list and summary card, built from parts. Keys, values and actions line up in columns across every row, rows without actions included, and stack when the list is narrow. An action is a link, or a button that can open a Dialog to edit the answer in place. When a value changes, it glows for a moment in a tint of brand blue, so people see what they changed. A summary card puts the list under a tinted title band with actions for the whole card.",
    props: [
      toggle("noBorder"),
      reference("SummaryListRow", "{ label, children, actions }", "Part"),
      reference("SummaryListAction", "{ href, onClick, hiddenText, render, children }", "Change"),
      reference("SummaryCard", "{ title, headingLevel, actions, children }", "Part"),
    ],
    example: [toggle("card", true, { note: "Puts the list in a SummaryCard." })],
  },
  "task-list": {
    name: "Task list",
    width: 680,
    description: "Show the tasks people need to complete, or the ones an agent is working through.",
    upstream: "task-list",
    dependencies: "React",
    changes:
      "GOV.UK's task list, built from parts. Each task's link covers its row, which tints under the pointer, and screen readers hear the hint and status with the name. Statuses are GOV.UK's, as Tags or plain text, and each new status rises into place. It is also an agent's task list. The task an agent is on shows a spinner, and each task it completes ticks softly.",
    props: [
      reference("TaskListItem", "{ href, hint, status, statusLabel, children }", "Part"),
      reference(
        "status",
        '"completed" | "incomplete" | "not-started" | "in-progress" | "cannot-start" | "error" | "working"',
        "Required",
      ),
    ],
    example: [
      toggle("agent", true, { note: "An agent works through the tasks." }),
      toggle("hints", false, { note: "Gives some tasks a hint." }),
    ],
  },
  "message-scroller": {
    name: "Message scroller",
    width: "100%",
    anchor: "fill",
    description:
      "Hold a chat in a box that scrolls without ever moving the reader against their will.",
    upstream: "",
    dependencies: "React · Base UI · Motion",
    changes:
      "shadcn's Message scroller, with Conversation's scrolling, in a framed box. At the end of the log it follows new messages and streamed text in the same frame they arrive, so nothing jumps. Scrolled away, it stays put, and a button rises to go back, with a dot once more arrives. A new turn, such as the person's question, glides to near the top with the end of the turn before peeking above it, and its reply streams into the space left below, so the log stays still until the reply fills the box, then follows again. Rows loaded above keep the reader's row where it was. It opens at the newest message, or at the start, or at the last turn from its start with the reply below. From outside, it can go to a message by its id, which glows in the focus colour for a moment. Screen readers hear new messages in a log, and with busy they wait for a streaming reply to finish. Conversation is a Message scroller laid out as a chat. The example is a service's help chat docked at the foot of a page in the middle, as a documentation site's assistant is. It starts folded, with a one-row Chat input and a Callout suggesting a question. The conversation opens up out of the message box and folds back down into it, keeping its place, and sending from the folded chat opens it. The log is unframed inside it. Its messages are Bubbles, its replies Streaming text and its composer a Chat input, which floats over the foot of the log. Suggested questions follow the office's latest reply, on its side, and a pinned question under the header goes to it among the earlier messages. The office's replies have tools beneath them, which are Copy, a thumb up and down, and Try again, which writes the answer out again. On an earlier message, Try again stays in its place but refuses a press, with the refusing sound and a shake.",
    props: [
      toggle("autoScroll", true, {
        default: "true",
        note: "Follows new messages and streamed text while the reader is at the end of the log.",
      }),
      {
        ...range("peek", 64, 0, 160, 8),
        note: "When a question starts a new turn, it rises to this many pixels below the top, so the end of the reply before stays in view above it. The log leaves space beneath the question for its answer to stream into, which is the space under a short answer. The space disappears once the answers fill the log.",
      },
      choice(
        "defaultPosition",
        [
          ["end", "End"],
          ["start", "Start"],
          ["last-anchor", "Last anchor"],
        ],
        "end",
        {
          default: "end",
          note: "Where the log opens, which is at the newest message, at the first, or at the last question with its answer below, or the end if that turn fits.",
        },
      ),
      reference("framed", "boolean", "true"),
      reference("label", "string", "Messages"),
      reference("footer", "ReactNode"),
      reference("busy", "boolean"),
      reference("empty", "ReactNode, shown while there are no messages", "None"),
      reference("ref", "{ scrollToMessage(id), scrollToEnd(), scrollToStart() }"),
      {
        ...reference("MessageScrollerItem", "{ id, anchor, children }", "Part"),
        note: "One row, known by its id. An anchor, such as a question, starts a turn.",
      },
      reference(
        "MessageSuggestions / MessageSuggestion",
        "{ aria-label } / Button's props",
        "Part",
      ),
    ],
    example: [
      toggle("tip", true, {
        note: "A Callout by the message box suggests asking something, until the chat is opened.",
      }),
    ],
  },
  "plan-card": {
    name: "Plan card",
    width: 480,
    anchor: "top",
    description: "Ask people to approve a plan before an agent runs it.",
    upstream: "",
    dependencies: "React",
    changes:
      "A card with the plan's title, a sentence on what it will do, and its numbered steps above a footer for Approve and Reject. The steps are Reasoning steps' ReasoningStep parts, so once approved they tick off one by one as the plan runs, each with a spinner while under way. The footer keeps its height whatever it contains, so the steps never move.",
    props: [
      text("title", "Show refused applications in the summary", {
        type: "ReactNode",
        default: "Required",
      }),
      reference("description", "ReactNode"),
      reference("children", "ReasoningStep parts", "Required"),
      reference("actions", "ReactNode"),
      reference("eyebrow", "ReactNode", "Plan"),
    ],
    example: [toggle("description", true, { note: "Says what the plan will do." })],
  },
  "question-card": {
    name: "Question card",
    width: 480,
    anchor: "bottom",
    grows: 470,
    description: "Ask the questions an agent needs answered before it continues.",
    upstream: "",
    dependencies: "React · Motion",
    changes:
      "A card that asks questions one at a time, with the steps of shadcn's Questionnaire. It is Form steps in its card layout, made from a list of questions as an agent sends them. A question can ask for a choice from Choices, with a letter or number for each answer that pressing chooses, one answer or several, and a last row that takes any words, or for some words, a number, a date, or one answer from a list. The questions come under a header whose ring fills as they are answered. Next, or Command with Enter, moves on, Previous goes back, and Skip passes over a question that need not be answered. Pressing Next without an answer shows GOV.UK's error message beside the question. The words change at once and the card eases to each question's height, while the footer stays put. Once done, the card lists the answers in a Summary list, each with Change to ask that question again. With a storageKey, the answers are kept until they are sent. A date question can take a min and max, such as today for a date in the past, and a date outside them has GOV.UK's message, such as “The date must be today or in the past”. With calendar, it offers a Calendar beside its fields, which offers only the days between them.",
    props: [
      reference(
        "questions",
        '{ name, question, hint?, type?: "choice" | "text" | "number" | "date" | "select", options?, other?, multiple?, required?, min?, max?, calendar? }[]',
        "Required",
      ),
      choice(
        "markers",
        [
          ["letters", "Letters"],
          ["numbers", "Numbers"],
          ["none", "None"],
        ],
        "letters",
      ),
      reference("title", "ReactNode", "Questions"),
      reference("onComplete", "(answers: Record<string, string | string[] | null>) => void"),
      reference("submitLabel", "string", "Continue"),
      reference("storageKey", "string", "None"),
    ],
  },
  "file-diff": {
    name: "File diff",
    width: 680,
    description: "Show the changes an agent proposes to a file, to accept or reject.",
    upstream: "",
    dependencies: "React",
    changes:
      "One column of lines, coloured by their syntax as Code block colours them. Removed lines sit on a red tint with a minus and added lines on a green tint with a plus, and screen readers hear which. Long unchanged runs fold away behind a quiet row that opens them in place, and the opened lines fade in. The header names the file and counts the lines added and removed, beside actions such as Accept and Reject. It scrolls sideways in a Scroll area.",
    props: [
      number("context", 3, { min: 0, note: "Unchanged lines kept around each change." }),
      reference("filename", "string", "Required"),
      reference("before / after", "string", "Required"),
      reference("language", "string", "tsx"),
      reference("children", "Actions, such as Accept and Reject"),
    ],
  },
  "organisation-name": {
    name: "Organisation name",
    width: 420,
    description: "Name a government organisation as GOV.UK does, beside a bar of its colour.",
    upstream: "",
    dependencies: "React",
    changes:
      "GOV.UK's organisation logo for an organisation that has no image. Its name is in the regular weight, beside a bar of its colour, under the Royal Arms in the words' colour when given them, as a department's lock-up is. The library ships no Royal Arms. A service gives the address of GOV.UK Frontend's image, as it gives Footer's, and the workbench serves the example's. On dark paper, a dark colour, such as the Ministry of Justice's black, is lightened to show. With render, it is a link to the organisation's page, underlined in the text's colour as GOV.UK's is. Logo carousel names an organisation without a logo with it.",
    props: [
      text("children", "Department for Business, Innovation, Science and Trade", {
        type: "ReactNode",
        default: "Required",
      }),
      text("colour", "#ff4328", { default: "The words' colour" }),
      text("crest", "/assets/images/govuk-crest.svg", { default: "None" }),
      reference("render", "A link, such as to the organisation's page", "<span>"),
    ],
  },
  "logo-carousel": {
    name: "Logo carousel",
    width: 720,
    description: "Show the governments and public bodies a service works with, a few at a time.",
    upstream: "",
    dependencies: "React · Motion",
    changes:
      "A wall of logos, for the organisations a service is run with. A row of places each shows one logo, and every few seconds one place turns over, the logo there rolling up and away as the next rises in, each place in turn. An organisation without a logo shows its name as GOV.UK sets an organisation's, beside a bar of its colour. The wall is as tall as its tallest logo, so a long name is never cut short, and it keeps that height as the logos turn over. It stops while the pointer is over it or something in it has focus, and a Pause button stops it for good, as WCAG asks of anything that moves on its own. With reduced motion it starts paused. Screen readers hear every organisation in a list, instead of the moving wall.",
    props: [
      reference("label", "string", "Required"),
      reference("items", "{ name, logo?, colour? }[]", "Required"),
      choice(
        "visible",
        [
          [3, "3"],
          [4, "4"],
          [5, "5"],
        ],
        4,
        { default: "4" },
      ),
      reference("interval", "number", "2600"),
    ],
  },
  "qr-code": {
    name: "QR code",
    width: 460,
    description: "Give people a code their phone can scan, such as for a web address.",
    upstream: "",
    dependencies: "React · uqr",
    changes:
      "A QR code that uqr encodes and the library draws. Each module is a dot, and the three corner squares are rounded rings around rounded squares. It is dark on a white tile in either theme and in high contrast mode, so phones read it in any light. Each time what it encodes changes, the new dots ripple out from the middle, each a little after the one nearer the middle, over the time ripple sets. Changing ripple here plays it again. Screen readers hear it as a picture named by what it leads to.",
    props: [
      reference("value", "string", "Required"),
      reference("label", "string"),
      range("size", 200, 120, 320, 20),
      choice(
        "errorCorrection",
        [
          ["L", "L: 7% can be lost"],
          ["M", "M: 15% can be lost"],
          ["Q", "Q: 25% can be lost"],
          ["H", "H: 30% can be lost"],
        ],
        "M",
      ),
      range("ripple", 500, 0, 1200, 50),
    ],
  },
  lightbox: {
    sides: "narrow",
    name: "Lightbox",
    width: "100%",
    description: "Show photos in a gallery, and look at each one large.",
    upstream: "",
    dependencies: "React · Base UI",
    changes:
      "Photos in justified rows, each row filling the width at the photos' own proportions, laid out by CSS alone so nothing moves as they load. Pressing a photo dips it a little, then it moves to the centre and grows, while the others spread outwards and fade and the page blurs under a light veil of its own colour. The arrow keys, the buttons or a swipe move between photos, each sliding in from its side, and screen readers hear which photo is showing. A press anywhere outside the photo, Escape or Close sends it back to its place as the blur clears and the others gather again. Each photo can have its photographer's name, which shows as a MediaCredit on the thumbnail and beside the caption. The viewer is a Base UI Dialog, so focus stays inside it and returns to the photo it ends on.",
    props: [
      range("rowHeight", 200, 120, 300, 10),
      reference("images", "{ src, alt, width, height, caption?, credit? }[]", "Required"),
      reference("gap", "number", "8"),
      reference("label", "string", "Photos"),
    ],
    example: [toggle("captions", true, { note: "Gives each photo a caption in the viewer." })],
  },
  link: {
    fit: true,
    name: "Link",
    width: 560,
    description: "Take people to another page, in GOV.UK's link style.",
    upstream: "",
    dependencies: "React · Base UI",
    changes:
      "GOV.UK's link styles as one component. It is underlined, with an underline that thickens under the pointer, GOV.UK's purple once visited, and GOV.UK's yellow focus. It can take the text colour, as in a footer, or white, on brand blue. A link that opens a new tab says so in its text, as GOV.UK advises. It takes a render prop for a router's link.",
    props: [
      text("children", "guidance on photos", { type: "ReactNode", default: "Required" }),
      choice(
        "colour",
        [
          ["link", "Link"],
          ["text", "Text"],
          ["inverse", "Inverse"],
        ],
        "link",
      ),
      toggle("underline", true, { default: "true" }),
      toggle("visited", true, { default: "true", note: "Shows visited links in GOV.UK's purple." }),
      toggle("newTab", false, { note: "Opens a new tab, and says so in the link." }),
      reference("href / render", "string / ReactElement"),
    ],
  },
  sound: {
    name: "Sound",
    width: 1040,
    anchor: "top",
    description: "Hear every sound the library makes, what plays it, and what it sounds like.",
    upstream: "",
    dependencies: "React · Web Audio",
    changes:
      "Not in GOV.UK. Every sound is made as it plays, with the Web Audio API, from a tone or a burst of noise or two, each shaped by an envelope and sometimes a filter, so the library ships no audio files, and each play is detuned a little at random, so a repeat never sounds mechanical. The cues come in six families, which are presses, toggles, surfaces, values, outcomes and small moments. SoundScope plays the one for each interaction inside it, from what was pressed. A toggle rises turning on and falls turning off, a warning button sounds weightier, a row sounds a step higher down its list, and outcomes that arrive by themselves, such as an error or a toast, play theirs too. data-sound names a cue for a part of the page, or turns sound off there, and data-sound-enter names one for content that arrives. Nothing plays until the person has used the page, as browsers ask. The example is every cue on a card, with a drawing of what plays it beside a drawing of the sound itself. The sound's pitch runs from left to right, as thick as it is loud, on one scale for every cue. The cards run in their families, which only their colour tells apart. A press plays the cue, the icon acts out what plays it, and the drawing lights at the sound's own pace. A card that steps, such as a row in a list, moves on a step each press, and a drag across the cards plays each in turn. The board has a SoundScope of its own, whose play sets every cue at the playground's volume, pitch and softness, and each card plays through it with useScopeSound. The workbench's mute silences it.",
    props: [
      range("volume", 0.5, 0, 1, 0.05),
      range("detune", 0, -1200, 1200, 100),
      range("velocity", 1, 0, 1, 0.05),
      reference("useSound", "({ muted, volume }) => PlaySound", "Hook"),
      reference("PlaySound", "(cue, { detune, velocity }) => Promise<void>", "Function"),
      reference("SoundScope", "{ play, children }", "Part"),
      reference("useScopeSound", "() => (cue, { detune, velocity }) => void", "Hook"),
      reference("data-sound", 'SoundCue | "off"', "Chosen by the control"),
      reference("data-sound-enter", "SoundCue", "None"),
      reference("soundCues", "SoundCue[]", "Constant"),
    ],
  },
  "theme-picker": {
    name: "Theme picker",
    width: 460,
    description: "Let people switch between a light and a dark theme.",
    upstream: "",
    dependencies: "React",
    changes:
      "Not in GOV.UK. It starts light, as GOV.UK is, until people switch. In the example, it sets the theme of the card beneath it, so the workbench keeps its own. In a dark workbench, the card can be light, and in a light one, dark. The workbench's own toolbar uses one.",
    props: [
      reference("value / defaultValue / onValueChange", '"light" | "dark"', "light"),
      reference("storageKey", "string", "None"),
      reference("labels", "{ toDark, toLight }", "English"),
      reference(
        "useTheme",
        "({ storageKey, defaultTheme, element }) => { theme, setTheme }",
        "Hook",
      ),
    ],
  },
  "visually-hidden": {
    name: "Visually hidden",
    width: 560,
    description: "Give screen readers words that the layout already makes clear to the eye.",
    upstream: "",
    dependencies: "React",
    changes:
      "GOV.UK's visually hidden text, such as the rest of a Change link's name, as a component. The words stay in the page and are read in place, but take no space. The library's own parts use the same class.",
    props: [
      reference("children", "ReactNode", "Required"),
      reference("render", "An element, such as a heading only screen readers hear", "<span>"),
    ],
    example: [toggle("reveal", false, { note: "Outlines the hidden words in place." })],
  },
  card: {
    name: "Card",
    width: 680,
    description: "Group one thing, such as a service, with an image, a title and a few words.",
    upstream: "",
    dependencies: "React",
    changes:
      "A keyline box built from parts. When its title is a link, the whole card is the link, and GOV.UK's focus rings the card. The card stays still under the pointer. The footer sits above the card's link, so its own links and buttons still work. The Carousel example's slides are Cards. A MediaCredit in the image's corner names its photographer as a small Tag, which rises into view when the pointer is over the card or it has focus.",
    props: [
      reference("CardMedia", "An image or video", "Part"),
      reference("CardTitle", "{ href, headingLevel, children }", "Part"),
      reference("CardDescription / CardFooter", "ReactNode", "Part"),
      reference("MediaCredit", "{ prefix, children }", "Part"),
    ],
    example: [
      toggle("media", true, { note: "Gives each card an image." }),
      toggle("links", true, { note: "Makes each card a link." }),
    ],
  },
  aside: {
    name: "Aside",
    width: 680,
    description: "Set related content beside or after the page's main content.",
    upstream: "",
    dependencies: "React",
    changes:
      "A complementary landmark named by its title, under a brand-blue rule, as GOV.UK's related links. Its links are the library's Link.",
    props: [
      text("title", "Related content", { type: "ReactNode", default: "Required" }),
      reference("headingLevel", "2 | 3 | 4", "2"),
      reference("children", "ReactNode"),
    ],
  },
  "aspect-ratio": {
    name: "Aspect ratio",
    width: 560,
    description: "Keep content, such as an image or video, to one shape at any width.",
    upstream: "",
    dependencies: "React",
    changes: "CSS's aspect-ratio, with an image, video or frame inside filling the shape.",
    props: [
      choice(
        "ratio",
        [
          ["16:9", "16 by 9"],
          ["4:3", "4 by 3"],
          ["1:1", "Square"],
        ],
        "16:9",
        { type: "number", default: "16 / 9" },
      ),
    ],
  },
  item: {
    name: "Item",
    width: 560,
    description: "Show one thing in a list, such as a person, with actions at the end.",
    upstream: "",
    dependencies: "React",
    changes:
      "A row built from parts, with media, such as an Avatar, a title and a description, and actions. An ItemGroup rules lines between items, and the outline variant gives an item a keyline of its own.",
    props: [
      reference("variant", '"plain" | "outline"', "plain"),
      reference("ItemMedia", '{ variant: "plain" | "tile" }', "Part"),
      reference("ItemContent / ItemActions", "ReactNode", "Part"),
      reference("ItemTitle / ItemDescription", "ReactNode", "Part"),
      reference("ItemGroup", "A list of items", "Part"),
    ],
    example: [
      toggle("outline", false, { note: "Gives each item a keyline." }),
      toggle("actions", true, { note: "Gives each item a Message button." }),
    ],
  },
  avatar: {
    fit: true,
    name: "Avatar",
    description: "Show a person's photo, or their initials.",
    upstream: "",
    dependencies: "React · Base UI",
    changes:
      "A circle with a photo, which fades in once it has loaded, or the person's initials on one of GOV.UK's colours, the same colour for a name every time. It is named by the person's name. An AvatarGroup overlaps several, ringed in the page's colour, and counts any more. Under the pointer, the avatar there rises and grows a little over its neighbours, which rise less the further away they are, and they spring back into line with a bounce as the pointer leaves. Built on Base UI's Avatar.",
    props: [
      text("name", "John Major", { default: "Required" }),
      choice(
        "size",
        [
          ["small", "Small"],
          ["medium", "Medium"],
          ["large", "Large"],
        ],
        "medium",
      ),
      reference("src", "string"),
      reference("AvatarGroup", "{ more, children }", "Part"),
    ],
    example: [toggle("group", true, { note: "Shows an AvatarGroup." })],
  },
  marker: {
    name: "Marker",
    width: 560,
    description: "Highlight the words that matter most, as a marker pen would.",
    upstream: "",
    dependencies: "React",
    changes:
      "A mark whose highlight sweeps across the words, line by line, the first time they scroll into view. With reduced motion it is simply there, and in forced colours it takes the system's mark colours.",
    props: [
      choice(
        "colour",
        [
          ["yellow", "Yellow"],
          ["blue", "Blue"],
          ["green", "Green"],
          ["pink", "Pink"],
        ],
        "yellow",
      ),
      reference("children", "ReactNode", "Required"),
    ],
  },
  attachment: {
    name: "Attachment",
    width: 560,
    anchor: "top",
    description: "Offer a file to download, with its format, size and pages.",
    upstream: "",
    dependencies: "React · Base UI",
    changes:
      "As GOV.UK lists its attachments, with a thumbnail of the document with its format, the title as a link, and its format, size and pages. A file that may not suit assistive technology says so, with a Details that explains how to ask for an accessible format. The format on the thumbnail takes the colour people know it by, red for PDF and green for a spreadsheet. The thumbnail lifts as the pointer reaches the title.",
    props: [
      reference("title / href", "ReactNode / string", "Required"),
      reference("format / size / pages", "string / string / number"),
      reference("thumbnail", "string"),
      reference("accessibleFormatEmail", "string"),
    ],
    example: [
      toggle("accessibility", true, {
        note: "Adds the notice and the request for an accessible format.",
      }),
    ],
  },
  "cookie-banner": {
    name: "Cookie banner",
    width: 680,
    anchor: "top",
    description: "Ask people whether they accept analytics cookies.",
    upstream: "cookie-banner",
    dependencies: "React · Motion",
    changes:
      "GOV.UK's cookie banner, with its question and buttons. Once people choose, the question gives way at once to a message saying what they chose, as the banner eases to its new height, which takes focus so screen readers hear it, with an outline button to hide it. Hiding it folds the banner away.",
    props: [
      text("serviceName", "Apply for a licence", { type: "ReactNode", default: "GOV.UK" }),
      reference("cookiesHref", "string", "/help/cookies"),
      reference("onChoose", '(choice: "accepted" | "rejected") => void'),
      reference("choice", '"accepted" | "rejected" | null', "null"),
    ],
  },
  feedback: {
    name: "Feedback",
    // The foot of a page, with the band in the page's column, above the footer.
    width: "100%",
    anchor: "foot",
    description: "Ask people at the foot of a page whether it was useful.",
    upstream: "",
    dependencies: "React · Motion",
    changes:
      "GOV.UK's “Is this page useful?” band, with outline Yes and No buttons and one to report a problem, which stand out on its tint. It shows one stage at a time, as GOV.UK's does. Once people answer, the question gives way. Yes turns to thanks. No and the report button turn to a short Form built from Textarea, whose Cancel brings the question back with focus on the button that opened it, and what was typed is kept. Sending turns to thanks, which takes focus so screen readers hear it. The band eases to each stage's height with the AutoHeight that FormSteps' card uses, and its words never fade or move. The example is the foot of a service's page, with the band at the end of the page's content, then the Footer.",
    props: [
      text("question", "Is this page useful?", { default: "Is this page useful?" }),
      reference("onAnswer", "(useful: boolean) => void"),
      reference("onReport", "({ doing, wrong }) => void"),
    ],
  },
  "filter-chips": {
    name: "Filter chips",
    width: 680,
    description: "Let people narrow a list by turning filters on and off.",
    upstream: "",
    dependencies: "React · Base UI",
    changes:
      "Rounded toggle buttons, any number of which can be on, or with `multiple` off, at most one, which a second press leaves unchosen. They suit a choice that is free to be left unmade, such as which example the workbench's playground starts from. Off, a chip has a plus. On, it fills brand blue and the plus turns into a tick that draws itself in the same place, so the chip never changes width. Chosen neighbours share one brand-blue shape behind them. A chip just chosen grows its colour out across its chosen neighbours, and a chip just left draws the colour back into itself before it fades. The chips never move, and chips on different lines never join. A chip can count the results it would show. Built on Base UI's Toggle group.",
    props: [
      toggle("multiple", true, {
        note: "Off, one chip at most is on, and pressing it again leaves none.",
      }),
      reference("label", "string", "Required"),
      reference("value / onValueChange", "string[] / (value) => void"),
      reference("FilterChip", "{ value, count, disabled, children }", "Part"),
    ],
    example: [toggle("counts", true, { note: "Counts the results each filter would show." })],
  },
  menubar: {
    name: "Menubar",
    anchor: "top",
    description: "Offer an application's menus in a row, such as File, Edit and View.",
    upstream: "",
    dependencies: "React · Base UI",
    changes:
      "Base UI's Menubar containing the library's Dropdown menus, with their items, shortcuts, submenus, checkboxes and choices. The arrow keys move along the bar, and once one menu is open, moving to another opens it in its place.",
    props: [
      reference("aria-label", "string"),
      reference("MenubarTrigger", "<button> props and { render }", "Part"),
      reference("DropdownMenu / MenuContent", "The menus' own parts", "Part"),
    ],
  },
  "chat-input": {
    name: "Chat input",
    width: 560,
    description: "Let people write to an assistant, and stop its reply.",
    upstream: "",
    dependencies: "React",
    changes:
      "A rounded box in Input's border that grows with the message, a line at a time, then scrolls. Enter sends and Shift with Enter starts a new line, and a character still being composed is never sent. Send is a square outline icon Button whose arrow lifts under the pointer, and while the assistant replies it becomes Stop. ChatInputAttach sits at the start of the bar and shows each attached file as a chip above the message, with a button to remove it. ChatInputModel, a quiet Dropdown menu of models with a few words on each, and ChatInputDictation, which listens with the browser's speech recognition and pulses brand blue while it does, sit beside Send. GOV.UK's focus goes round the whole box. The message scrolls with the library's thin scrollbar, as a Scroll area does. Inline puts the message and Send on one row, one line tall until the message needs more. Unframed, with framed false, it takes its container's edges, such as a chat panel's, as the Message scroller example's does, with GOV.UK's focus round the whole panel. The Conversation example's composer is a Chat input.",
    props: [
      text("placeholder", "Write a message…", { default: "Write a message…" }),
      number("maxRows", 6, { default: "8", note: "The most lines it grows to before it scrolls." }),
      choice(
        "layout",
        [
          ["stacked", "Stacked"],
          ["inline", "Inline"],
        ],
        "stacked",
        { note: "Inline puts the message and Send on one row, one line tall." },
      ),
      toggle("framed", true, {
        default: "true",
        note: "Its own rounded box. Without it, it takes its container's edges.",
      }),
      toggle("disabled"),
      reference("label", "string", "Message"),
      reference("onSubmit", "(message: string, files: File[]) => void"),
      reference("busy / onStop", "boolean / () => void", "false"),
      reference("value / onValueChange", "string / (value: string) => void"),
      reference("files / defaultFiles / onFilesChange", "File[] / File[] / (files) => void"),
      reference("attachments", "ChatInputAttachments, in place of the files' own chips"),
      reference("tools", "Parts at the start of the bar, such as ChatInputAttach"),
      reference("children", "Parts beside Send, such as ChatInputModel and ChatInputDictation"),
      reference("ChatInputAttach", "{ accept, multiple, label }", "Part"),
      reference("ChatInputAttachments", "File chips, named Attached files", "Part"),
      reference(
        "ChatInputAttachment",
        "A File chip whose removal puts focus back in the message",
        "Part",
      ),
      reference("ChatInputModel", "{ models, value, defaultValue, onValueChange, label }", "Part"),
      reference("ChatInputDictation", "{ lang, recogniser = browserRecogniser }", "Part"),
    ],
    example: [
      toggle("attach", true, { note: "Adds ChatInputAttach to the tools." }),
      toggle("model", true, { note: "Adds ChatInputModel beside Send." }),
      toggle("dictation", true, { note: "Adds ChatInputDictation beside Send." }),
      toggle("transcriber", false, {
        note: "Dictates through a recogniser of the example's own, as a service's own transcription would.",
        needs: [whenOn("dictation")],
      }),
      toggle("documents", false, {
        note: "Sends documents chosen from the service's store with the message, beside its files, as ChatInputAttachments.",
      }),
    ],
    presets: [
      {
        name: "One row",
        args: { layout: "inline", attach: false, model: false, dictation: false },
      },
      { name: "Message and Send only", args: { attach: false, model: false, dictation: false } },
      { name: "In its container's edges", args: { framed: false } },
    ],
  },
  "file-chips": {
    name: "File chips",
    width: 560,
    description: "List the files or documents that go with something, such as a sent question.",
    upstream: "",
    dependencies: "React",
    changes:
      "Chat input's chips, as parts that can sit anywhere, such as under a sent question to list the documents it was asked about. Each chip has a page icon, the name and the kind, such as PDF, in the muted colour. A long name is cut short in its middle, as a file's name is in ChatGPT and Claude, so its last word and extension show, where names that differ often differ, such as by a date. It shows in full in its title, and screen readers hear it in full. Given onRemove, a chip has a × button, and focus goes to the next chip's button as the chip is removed. Given render, its name links to the document, as GOV.UK's link in the text's colour. Screen readers hear the chips as a list, named by its label. Chat input's ChatInputAttachments and ChatInputAttachment are File chips that put focus back in the message.",
    props: [
      text("label", "Documents with this question", { default: "Files" }),
      reference("children", "FileChip parts", "Required"),
      reference("FileChip", "{ name, kind, icon, onRemove, removeLabel, render }", "Part"),
    ],
    example: [
      toggle("removable", false, { note: "Gives each chip onRemove, so it has a × button." }),
      toggle("links", false, { note: "Makes each name a link to its document, with render." }),
    ],
  },
  "streaming-text": {
    name: "Streaming text",
    width: 560,
    description: "Show a reply arriving a word at a time.",
    upstream: "",
    dependencies: "React",
    changes:
      "Each word fades in, behind a pulsing dot that disappears once the text is complete. The words still to come already take their space, unseen, so the lines break where they will in the end and nothing beneath the text moves as it arrives. Text that grows, as from a live stream, joins the end, and a stream that runs ahead is caught up within about a second. Screen readers hear the whole reply once instead of a word at a time, either at once when the text is known, or when a live stream ends. Stopped, it keeps what it has written. With reduced motion, the whole text shows at once.",
    props: [
      { ...range("speed", 30, 5, 80, 5), needs: [whenOff("instant")] },
      toggle("instant"),
      reference("text", "string", "Required"),
      reference("streaming", "boolean", "false"),
      reference("stopped", "boolean", "false"),
      reference("onComplete", "() => void"),
    ],
  },
  "reasoning-steps": {
    name: "Reasoning steps",
    width: 480,
    description: "Show the steps an assistant took to reach its answer.",
    upstream: "",
    dependencies: "React · Base UI",
    changes:
      "A quiet title that opens the steps, which run down a line. Each step has a tick once done, a spinner while under way, and a hollow dot before it starts, and screen readers hear which. While the assistant works, the title shimmers and the steps stay open, and they fold away once it has finished. New steps rise into place. Built from parts on Base UI's Collapsible.",
    props: [
      reference("active", "boolean", "false"),
      reference("activeTitle / title", "ReactNode", "Thinking / Show the steps"),
      reference("open / onOpenChange", "boolean / (open) => void", "Open while active"),
      reference(
        "ReasoningStep",
        '{ status: "done" | "active" | "pending", detail, children }',
        "Part",
      ),
    ],
    example: [toggle("details", true, { note: "Gives each step a detail." })],
  },
  "image-generation": {
    name: "Image generation",
    width: 560,
    description: "Show an image being made by an agent, and let it form when it arrives.",
    upstream: "",
    dependencies: "React",
    changes:
      "Most image services only say when the image is done, so until it arrives a mosaic of small cells fills the frame, drawn on a canvas, with ridges of brand tint flowing through it and cells popping now and then. If the service sends a rough preview part way, as OpenAI's partial images do, the mosaic takes its colours. When the image arrives, it forms out of the cells in a sweep from the top left, each cell showing the image's colour as a block before it clears, and the image comes into focus beneath, with the success sound. Making another breaks the image back into cells, which keep its colours while the next is made. A band at the foot shows the label in Text shimmer, with a bar and the share done if the service reports progress. The mosaic's tones come from the theme in CSS, it redraws fifteen times a second while it flows, and stops out of sight. Screen readers hear a progress bar while it works, and the image's description once it is made. With reduced motion, the mosaic stays still and fades away as the image arrives.",
    props: [
      reference("src", "string, once the image is made", "None"),
      reference("preview", "string, a rough early version", "None"),
      reference("alt", "string", "Required"),
      reference("width / height", "number", "Required"),
      reference("progress", "number from 0 to 1, if the service reports it", "None"),
      reference("label", "ReactNode", "Creating image"),
    ],
    example: [
      range("seconds", 6, 3, 12, 1),
      toggle("progress", false, { note: "The service reports how far along it is." }),
      toggle("preview", false, { note: "The service sends a rough preview part way." }),
    ],
    presets: [
      { name: "With progress", args: { progress: true } },
      { name: "With a preview", args: { progress: true, preview: true } },
    ],
  },
  "inline-citation": {
    name: "Inline citation",
    width: 560,
    description: "Link a claim in an answer to the pages it comes from.",
    upstream: "",
    dependencies: "React · Base UI",
    changes:
      "A small grey pill after the claim with the site's mark and name, which turns brand blue under the pointer. GOV.UK pages get the crown, and other sites their initial, by its address, unless crown says otherwise. Several sources stack in one pill, as GOV.UK +2. Resting on it, or pressing it, opens a card with each source's site, title, summary and date, and arrows step through a stack, each source sliding in from its side. The card is a Base UI Popover, so it opens from the keyboard too, focus moves into it, and each title is a link. Copying a message leaves the pills out. A source with no address, such as a passage from a document the person uploaded, names where it is instead of a site, and its title is not a link. Its detail says where in the source the claim comes from, such as its pages, and a source's render takes a router's link for its title.",
    props: [
      reference(
        "sources",
        "{ title, url?, site?, detail?, render?, description?, date?, icon?, crown? }[], with site when there is no url",
        "Required",
      ),
    ],
    example: [
      toggle("stacked", true, { note: "Stacks three sources behind the second claim." }),
      toggle("document", false, {
        note: "Cites a passage from a document the person uploaded, which has no address, by its pages.",
      }),
    ],
  },

  header: {
    name: "Header",
    width: 860,
    description: "Show people they are on GOV.UK, with the logo linking to its homepage.",
    upstream: "header",
    dependencies: "React",
    changes:
      "GOV.UK's header, with the crown and logotype in white on brand blue, and GOV.UK's teal dot. The logo is the library's GovukLockup, GOV.UK's crown beside its wordmark, and GovukCrown and GovukWordmark give each alone. A government service that is not part of GOV.UK gives its own logo, and the header becomes GOV.UK's generic header, with its mark and name in white on black at 30 pixels, because the crown and the blue are only for GOV.UK services.",
    props: [
      text("productName", "", { type: "ReactNode" }),
      reference("homepageUrl", "string", "https://www.gov.uk/"),
      reference("logo / logoLabel", "ReactNode / string", "GOV.UK"),
      reference("children", "ReactNode"),
    ],
    example: [
      toggle("generic", false, {
        note: "Gives the service's own logo, which makes it GOV.UK's generic header.",
      }),
    ],
  },
  "service-navigation": {
    name: "Service navigation",
    width: 860,
    description: "Show the service's name and its sections in a band under the header.",
    upstream: "service-navigation",
    dependencies: "React · Base UI · Motion",
    changes:
      "GOV.UK's service navigation, built from parts. The current section is bold, with a brand-blue bar that glides to the next section when the page changes in place. On a small screen the sections fold away behind a Menu button. Links take a render prop for a router's link.",
    props: [
      text("serviceName", "Apply for a licence", { type: "ReactNode" }),
      reference("serviceUrl", "string"),
      reference("menuLabel / navigationLabel", "string", "Menu"),
      reference("ServiceNavigationItem", "{ href, current, render }", "Part"),
    ],
  },
  footer: {
    name: "Footer",
    width: "100%",
    anchor: "foot",
    description: "Close every page with support links, the licence and Crown copyright.",
    upstream: "footer",
    dependencies: "React",
    changes:
      "GOV.UK's footer under a band of brand blue, on its tinted surface. The crown sits at the top, then any navigation in sections, each a heading over a rule with its links, sharing the row by GOV.UK's widths and setting a long list in columns. A rule closes the navigation. Then come the support links, anything else given, such as who built the service, and the Open Government Licence, with Crown copyright under the Royal Arms at the end of the row. Built from parts. The crown is the library's GovukCrown, and the Royal Arms is GOV.UK Frontend's image, drawn in the text's colour. Both are only for GOV.UK services, so crown false leaves them out. Links are GOV.UK's blue, and the sections stack on a phone. The example sits at the foot of the preview, as it would at the foot of a page.",
    props: [
      toggle("crown", true, { default: "true" }),
      reference("crest", "string", "/assets/images/govuk-crest.svg"),
      reference("licence", "ReactNode | null", "Open Government Licence"),
      reference("copyright", "ReactNode", "© Crown copyright"),
      reference(
        "FooterSection",
        '{ title, width: "full" | "two-thirds" | "one-third" | …, columns: 1 | 2 | 3, children }',
        "Part",
      ),
      reference("FooterLinks / FooterLink", "{ aria-label } / { href, render }", "Part"),
    ],
    example: [
      toggle("sections", true, { note: "Adds GOV.UK's navigation above the support links." }),
    ],
  },
  page: {
    name: "Page",
    width: "100%",
    anchor: "fill",
    description: "Lay out a whole page, with its header, content and footer.",
    upstream: "",
    dependencies: "React",
    changes:
      "GOV.UK's page template as one component. It puts a skip link first, then the header, then the content in a width container with anything before it, such as a phase banner and a back link, and the footer last, which stays at the foot of the screen on a short page. The content goes in a MainWrapper, the main landmark the skip link goes to, which leaves GOV.UK's space above it, more when nothing sits there. A width given to the page reaches every width container inside, so the header, content and footer line up at any width.",
    props: [
      reference(
        "ServicePage",
        "{ serviceName, serviceUrl, navigation, phase, feedbackUrl, back, footerLinks, column }",
        "Part",
      ),
      reference("header", "ReactNode"),
      reference("beforeContent", "ReactNode"),
      reference("footer", "ReactNode"),
      reference("skipLink", "ReactNode | null", "<SkipLink />"),
      reference("width", "number | string", "960"),
      reference("MainWrapper", '{ size: "default" | "large", id, render }', "Part"),
    ],
    example: [
      toggle("phaseBanner", true, { note: "Puts a Phase banner above the content." }),
      toggle("backLink", true, { note: "Puts a Back link above the content." }),
    ],
  },
  "width-container": {
    sides: "none",
    name: "Width container",
    width: "100%",
    description: "Hold content to a comfortable width, and share it between columns.",
    upstream: "",
    dependencies: "React",
    changes:
      "GOV.UK's layout as parts. The width container keeps content to 960 pixels in the middle of the screen, with space at its sides when the screen is narrower. GridRow and GridColumn share a row in GOV.UK's quarters, thirds and halves, with its 30 pixel gutter. The columns follow their row's width instead of the screen's, so a row in a narrow space stacks even on a wide screen. Header, Service navigation, Footer, Cookie banner and Page use the width container, so they line up, and the workbench sets each example in one.",
    props: [
      range("width", 960, 480, 1200, 20),
      toggle("gutters", true, { default: "true" }),
      reference("GridRow", "div props", "Part"),
      reference(
        "GridColumn",
        '{ width: "full" | "three-quarters" | "two-thirds" | "one-half" | "one-third" | "one-quarter", from: "tablet" | "desktop" }',
        "Part",
      ),
    ],
    example: [
      choice(
        "layout",
        [
          ["two-thirds", "Two-thirds and one-third"],
          ["halves", "Halves"],
          ["thirds", "Thirds"],
          ["quarters", "Quarters"],
        ],
        "two-thirds",
        { note: "Which columns share the row." },
      ),
    ],
  },
  "phase-banner": {
    name: "Phase banner",
    width: 860,
    description: "Tell people the service is new and ask for their feedback.",
    upstream: "phase-banner",
    dependencies: "React",
    changes: "GOV.UK's phase banner, with the phase as the library's Tag.",
    props: [
      choice(
        "tag",
        [
          ["Beta", "Beta"],
          ["Alpha", "Alpha"],
        ],
        "Beta",
        { type: "ReactNode" },
      ),
      reference("tagColour", "TagColour", "blue"),
      reference("children", "ReactNode", "Required"),
    ],
  },
  breadcrumbs: {
    fit: true,
    name: "Breadcrumbs",
    width: 560,
    description: "Show where a page sits in a service, as a trail of links from the top.",
    upstream: "breadcrumbs",
    dependencies: "React · Base UI",
    changes:
      "Built from parts. The earlier steps are muted links that darken under the pointer, and the current page is in the text colour. A chevron, as GOV.UK's, or a slash sits between the steps. An ellipsis can stand in for the middle of a long trail, and opens a Dropdown menu of the steps it leaves out. Each link plays a step higher along the trail.",
    props: [
      choice(
        "separator",
        [
          ["chevron", "Chevron"],
          ["slash", "Slash"],
        ],
        "chevron",
      ),
      toggle("collapseOnMobile", false),
      reference("inverse", "boolean", "false"),
      reference("BreadcrumbsItem", "{ href, current, render }", "Part"),
      reference("BreadcrumbsEllipsis", "{ label, children: MenuLinkItem }", "Part"),
    ],
    example: [toggle("ellipsis", true, { note: "Leaves the middle steps out, behind a menu." })],
  },
  "back-link": {
    name: "Back link",
    description: "Take people back one page in a journey.",
    upstream: "back-link",
    dependencies: "React",
    changes:
      "GOV.UK's back link. Its chevron leans back under the pointer, and it takes a render prop for a router's link.",
    props: [
      text("children", "Back", { type: "ReactNode", default: "Back" }),
      reference("href", "string", "#"),
      reference("inverse / render", "boolean / ReactElement"),
    ],
  },
  pagination: {
    name: "Pagination",
    width: 560,
    // Block pagination gains Previous after the first page, beneath the page's title, which stays
    // put.
    anchor: "top",
    description: "Link to the pages of a long list, or the next and previous parts of a guide.",
    upstream: "pagination",
    dependencies: "React · Motion",
    changes:
      "GOV.UK's pagination, with Previous and Next beside arrows that lean the way they go, and the page numbers around the current one with ellipses for the rest. The numbers always take seven slots of one width, and Previous and Next are disabled instead of removed at either end, so it never changes width. The current page's fill glides to the new number when the page changes in place, and each number sounds a step higher. Block mode stacks Previous and Next with their pages' titles, and leaves out the one that leads nowhere on the first and last pages, as GOV.UK's does.",
    props: [
      reference("page / pageCount", "number", "Required"),
      reference("href", "(page: number) => string", "Required"),
      reference("onPageChange", "(page: number, event) => void"),
      toggle("block", false),
      reference("previousLabel / nextLabel", "ReactNode"),
    ],
    example: [
      number("pageCount", 10, { min: 1, note: "The number of pages.", needs: [whenOff("block")] }),
    ],
  },
  "skip-link": {
    name: "Skip link",
    width: 560,
    description: "Let keyboard users skip straight to the main content.",
    upstream: "skip-link",
    dependencies: "React",
    changes:
      "GOV.UK's skip link. It drops into view in GOV.UK's yellow when it has focus. Following it moves focus to the content, as GOV.UK's does, so the next Tab continues from there. The workbench's own skip link is a Skip link.",
    props: [
      reference("href", "string", "#main-content"),
      reference("children", "ReactNode", "Skip to main content"),
    ],
  },
  "language-navigation": {
    name: "Language navigation",
    width: 560,
    description: "Let people switch the service's language, such as to Welsh.",
    upstream: "language-navigation",
    dependencies: "React",
    changes:
      "GOV.UK's language navigation, built from parts. Each language is named in itself, with its lang and hreflang set so screen readers pronounce it. The current language is bold text, and a description such as (Welsh) can follow for screen readers.",
    props: [
      reference("aria-label", "string", "Language"),
      reference(
        "LanguageNavigationItem",
        "{ href, lang, current, description, dir, render }",
        "Part",
      ),
    ],
  },
  "exit-this-page": {
    name: "Exit this page",
    width: 560,
    description: "Let people leave a sensitive service at once, for an ordinary site.",
    upstream: "exit-this-page",
    dependencies: "React",
    changes:
      "GOV.UK's Exit this page. The red button stays at the top as the page scrolls, and pressing Shift three times also leaves, with three dots under the label counting the presses. The page is covered at once as it goes. It makes no sound, because a sound could give it away. Here it goes to the next component.",
    props: [
      text("href", "/workbench/checkboxes", {
        default: "BBC Weather",
        note: "Here it is the next component.",
      }),
      reference("onExit", "() => void"),
      reference("children", "ReactNode", "Exit this page"),
      reference(
        "activatedText / timedOutText / pressTwoMoreTimesText / pressOneMoreTimeText",
        "string",
        "GOV.UK's",
      ),
    ],
  },
  "notification-banner": {
    name: "Notification banner",
    width: 540,
    anchor: "top",
    description: "Tell people about something important, or confirm that what they did worked.",
    upstream: "notification-banner",
    dependencies: "React",
    changes:
      "GOV.UK's banner with softened corners, with a title bar in brand blue for important news and green for success. A success banner is an alert. It arrives from a little above, takes focus so screen readers announce it, and plays the success sound.",
    props: [
      choice(
        "type",
        [
          ["important", "Important"],
          ["success", "Success"],
        ],
        "important",
      ),
      reference("title", "ReactNode", "Important or Success"),
      reference("titleLevel", "2 | 3 | 4 | 5 | 6", "2"),
      toggle("autoFocus", false, {
        default: "true",
        note: "A success banner takes focus as it appears. It starts off here, so changing the type does not move focus.",
        restart: true,
      }),
      reference("NotificationBannerHeading", "ReactNode", "Part"),
    ],
  },
  "warning-text": {
    fit: true,
    name: "Warning text",
    width: 540,
    description: "Warn people about something they must know, such as a penalty.",
    upstream: "warning-text",
    dependencies: "React",
    changes:
      "GOV.UK's warning text, which is bold text beside an exclamation mark in a circle that turns light in the dark theme. Screen readers hear Warning before the text, instead of the icon.",
    props: [
      text("children", "You can be fined up to £5,000 if you do not register.", {
        type: "ReactNode",
        default: "Required",
        rows: 2,
      }),
      text("iconFallbackText", "Warning", { default: "Warning" }),
    ],
  },
  panel: {
    name: "Panel",
    width: 540,
    description: "Confirm that a transaction is complete, with its reference number.",
    upstream: "panel",
    dependencies: "React",
    changes:
      "GOV.UK's green confirmation panel with softened corners. It rises into place, and plays the success sound when it appears after the page has loaded.",
    props: [
      text("title", "Application complete", { type: "ReactNode", default: "Required" }),
      reference("titleLevel", "1 | 2 | 3", "1"),
      reference("children", "ReactNode"),
    ],
  },
  tag: {
    name: "Tag",
    width: 420,
    description: "Show the status of something, such as an application.",
    upstream: "tag",
    dependencies: "React",
    changes:
      "GOV.UK's tag in its nine colours, with softened corners. When a status changes, the tag eases from its old colour to its new one. In the dark theme each pair is turned round. The outline variant sets the colour's text and a keyline in it on the page's paper, so a status stands out on a tinted surface, as File diff and Plan card use it.",
    props: [
      reference(
        "colour",
        '"grey" | "blue" | "teal" | "green" | "purple" | "magenta" | "red" | "orange" | "yellow"',
        "blue",
      ),
      reference("variant", '"solid" | "outline"', "solid"),
      reference("children", "ReactNode", "Required"),
    ],
    example: [toggle("outline", false, { note: "Shows every tag with the outline variant." })],
  },
  spinner: {
    name: "Spinner",
    description: "Show that something is happening when you cannot say how long it will take.",
    upstream: "",
    dependencies: "React",
    changes:
      "An arc that turns, lengthening and shortening as it goes, in the colour of the text around it. With reduced motion it still turns, slowly and evenly, because it is the only sign of work going on. Button and Toast use it.",
    props: [
      choice(
        "size",
        [
          ["large", "Large"],
          ["medium", "Medium"],
          ["small", "Small"],
        ],
        "large",
        { default: "medium" },
      ),
      text("label", "Checking your details", {
        note: "Read by screen readers. Leave it out when text beside it says what is happening.",
      }),
    ],
  },
  progress: {
    name: "Progress",
    width: 420,
    anchor: "top",
    description: "Show how far a task has got, such as an upload.",
    upstream: "",
    dependencies: "React · Base UI",
    changes:
      "Built on Base UI's Progress, so screen readers hear the label and the value. The bar eases forward in brand blue, sweeps along the track while the amount is unknown, and turns green with the success sound when the task is complete.",
    props: [
      toggle("showValue", true, { default: "true", needs: [whenOff("indeterminate")] }),
      reference("label", "ReactNode", "Required"),
      reference("value", "number | null", "Required"),
      reference("min / max", "number", "0 / 100"),
      reference("format", "Intl.NumberFormatOptions"),
    ],
    example: [toggle("indeterminate", false, { note: "Sets the value to null." })],
  },
  skeleton: {
    name: "Skeleton",
    width: 420,
    description: "Hold the shape of content while it loads, so the page does not jump.",
    upstream: "",
    dependencies: "React",
    changes:
      "Grey shapes for text, blocks and circles. One soft light sweeps across every skeleton on the page together, and stays still with reduced motion. Skeletons are hidden from screen readers, so a status nearby says what is loading. The usage panel shows skeleton lines while its code loads, and SidebarSkeleton stands in for a Sidebar's items.",
    props: [
      number("lines", 3, { min: 1, default: "1", note: "For text.", needs: [whenOn("loading")] }),
      reference("variant", '"text" | "block" | "circle"', "text"),
      reference("width / height", "CSS length"),
    ],
    example: [toggle("loading", true, { note: "Off, the content it stood in for appears." })],
  },
  "empty-state": {
    name: "Empty state",
    width: 540,
    description: "Show what to do where there is nothing yet, such as no results.",
    upstream: "",
    dependencies: "React",
    changes:
      "Built from parts, with an icon in a soft circle, a title, a sentence and the ways forward in a ButtonGroup. It rises gently into place.",
    props: [
      choice(
        "size",
        [
          ["medium", "Medium"],
          ["small", "Small"],
        ],
        "medium",
      ),
      reference("EmptyStateMedia", "ReactNode", "Part"),
      reference("EmptyStateTitle", "{ level, children }", "Part"),
      reference("EmptyStateDescription / EmptyStateActions", "ReactNode", "Part"),
    ],
    example: [
      toggle("media", true, { note: "Shows the icon." }),
      toggle("actions", true, { note: "Shows the ways forward." }),
    ],
  },
  prose: {
    name: "Prose",
    width: 640,
    description: "Set a page's headings, paragraphs and lists in GOV.UK's body text.",
    upstream: "",
    dependencies: "React",
    changes:
      "GOV.UK's type for content written as plain elements. It has 19 pixel body text, bold headings from the second level down, bullets and numbers with GOV.UK's spacing, quotations as inset text, code on a tint, tables ruled between rows, and GOV.UK's links. Its rules reach plain elements at no weight of their own, so a part of the library's inside it keeps its own look, as the Link in the example does. Rich text and the Editor set their documents in it.",
    props: [reference("children", "Plain elements and the library's parts", "Required")],
  },
  "rich-text": {
    name: "Rich text",
    width: 640,
    description:
      "Show a document from Markdown or HTML, such as an assistant's reply or a page written in the Editor.",
    upstream: "",
    dependencies: "React · Marked",
    changes:
      "Draws HTML, or Markdown through Marked, as React elements, so it renders on the server and brings no editor to the browser. A small reader of its own takes only what a document may contain, with its attributes, and drops the rest. It keeps no script, frame or style other than colour, and no link that is not to a page, an address or a number. It is set in Prose, with code coloured by its syntax, as Code block and the Editor colour it, tables that scroll across, images with their captions, and the Editor's galleries and mentions. Given components, it draws chosen elements with parts, such as a link with Link, code with Code block, or a reply's source with Inline citation, each handed the element's attributes, what it contains and its text. A heading offset moves a document's headings down the page's outline, so a reply's top heading does not compete with the page's.",
    props: [
      text(
        "html",
        '<h2>Who can apply</h2><p>You can apply for a <strong>rod fishing licence</strong> if you are 13 or over. Children under 13 do not need one.</p><p>A licence covers:</p><ul><li>salmon and sea trout, or</li><li>trout, coarse fish and eels</li></ul><p>Read the <a href="https://www.gov.uk/">byelaws for your region</a> before you fish.</p>',
        { rows: 8 },
      ),
      reference("markdown", "string", "In place of html"),
      reference(
        "components",
        "{ a, pre, table, … }, each ({ attributes, children, text }) => ReactNode",
        "None",
      ),
      reference("headingOffset", "number", "0"),
    ],
  },
  "inset-text": {
    name: "Inset text",
    description: "Set a passage apart from the text around it, such as a quotation or an example.",
    upstream: "inset-text",
    dependencies: "React",
    changes:
      "GOV.UK's bar along the start edge, drawn narrower with rounded ends. The Editor shows a model's suggestions in it.",
    props: [
      text(
        "children",
        "It can take up to 8 weeks to register a lasting power of attorney if there are no mistakes in the application.",
        { type: "ReactNode", default: "Required", rows: 4 },
      ),
    ],
  },
  "text-shimmer": {
    name: "Text shimmer",
    description: "Status text with light passing across it, for work that is under way.",
    upstream: "",
    dependencies: "React",
    changes:
      "A band of light sweeps across muted text, like a sheen. The text keeps its full contrast outside the band. With reduced motion, the text is still.",
    props: [text("children", "Writing a suggestion…", { type: "ReactNode", default: "Required" })],
  },
  sidebar: {
    name: "Sidebar",
    width: 780,
    description:
      "Keep an application's sections in reach, in groups that collapse to icons or slide away.",
    upstream: "",
    dependencies: "React · Base UI · Motion",
    changes:
      "Collapses to icons, off the screen or not at all, on either side. The edge drags to resize, and the rows scroll in a Scroll area. Groups and items with sub-items can fold. One highlight glides to the row under the pointer, on the same curve as the current item's line, which glides when it changes. On small screens, the sidebar opens as a sheet that a swipe closes. It can remember whether it was open, and its width. Command-B or Control-B toggles it. People can arrange it for themselves. useSidebarArrangement keeps which items are pinned to the top, hidden and in what order. SidebarItemMenu gives each item a menu from three dots at the end of its row to pin, move or hide it. SidebarCustomise is a sheet of lists to show, pin and move every item and group, with Reset. An item's action, such as that menu or a SidebarItemAction, shows while the row is under the pointer or the action has keyboard focus, and rides the highlight from row to row. The workbench's own sidebar is arranged this way.",
    props: [
      reference(
        "SidebarItem action",
        "ReactNode, such as a SidebarItemMenu or SidebarItemAction",
        "None",
      ),
      reference("useSidebarArrangement", "({ entries, groups?, storageKey? }) => arranger", "Hook"),
      reference("SidebarItemMenu", "{ arranger, id, labels? }", "Part"),
      reference("SidebarCustomise", "{ arranger, open, onOpenChange, labels? }", "Part"),
      toggle("defaultOpen", true, {
        restart: true,
        note: "A SidebarProvider prop. The example starts again when it changes.",
      }),
      choice(
        "side",
        [
          ["left", "Left"],
          ["right", "Right"],
        ],
        "left",
      ),
      choice(
        "variant",
        [
          ["sidebar", "Sidebar"],
          ["floating", "Floating"],
          ["inset", "Inset"],
        ],
        "sidebar",
      ),
      choice(
        "collapsible",
        [
          ["icon", "Icons"],
          ["offcanvas", "Off the screen"],
          ["none", "Never"],
        ],
        "icon",
        { default: "offcanvas" },
      ),
      toggle("collapsedTrigger", true, { needs: [when("collapsible", "offcanvas")] }),
      toggle("resizable"),
      number("minWidth", 200, { min: 120, needs: [whenOn("resizable")] }),
      number("maxWidth", 360, { min: 120, needs: [whenOn("resizable")] }),
      toggle("activeLine", true),
      checklist(
        "animations",
        [
          ["collapse", "Collapse"],
          ["highlight", "Highlight"],
          ["active-line", "Active line"],
          ["press", "Press"],
          ["tooltips", "Tooltips"],
          ["folding", "Folding"],
        ],
        ["collapse", "highlight", "active-line", "press", "tooltips", "folding"],
      ),
      reference("SidebarGroup", "{ label, icon, collapsible, defaultOpen }", "Part"),
      reference("SidebarItem", "{ icon, badge, isActive, tooltip, render }", "Part"),
      reference("SidebarSubmenu", "{ label, icon, defaultOpen, tooltip, children }", "Part"),
      reference("SidebarInput", "Input props, with a search icon", "Part"),
      reference("SidebarSkeleton", "{ rows, icons }", "Part"),
      reference("SidebarText", "Words that wrap, in the header or footer", "Part"),
      reference("MoreIcon", "SidebarItemAction's three dots, for a trigger of a row's own", "Icon"),
      reference("SidebarLayout", "The frame: the Sidebar and a SidebarInset", "Part"),
      reference("SidebarInset", "The page beside the sidebar, raised beside an inset one", "Part"),
      reference("SidebarPageBar", "A bar along the page's top, for a trigger and a title", "Part"),
      reference("storageKey", "string · a SidebarProvider prop", "Optional"),
      reference("useSidebar", "state, toggleSidebar, isMobile…", "Hook"),
    ],
    example: [
      choice(
        "sections",
        [
          ["grouped", "Labelled groups"],
          ["collapsible", "Groups that fold"],
          ["off", "No labels"],
        ],
        "grouped",
      ),
      checklist(
        "show",
        [
          ["separators", "Separators"],
          ["badges", "Badges"],
          ["icons", "Icons"],
          ["submenus", "Sub-items"],
          ["footer", "Footer"],
          ["menus", "Item menus"],
        ],
        ["separators", "badges", "icons", "submenus", "footer", "menus"],
      ),
      toggle("loading", false, { note: "Shows SidebarSkeleton rows, as while the items load." }),
      toggle("inverse", false, {
        note: 'Sets SidebarHeader on GOV.UK\'s black, as an inverse part of the page, with data-theme="inverse".',
      }),
    ],
    presets: [
      { name: "Floating", args: { variant: "floating" } },
      { name: "Inset, on the right", args: { variant: "inset", side: "right" } },
      { name: "Slides off the screen", args: { collapsible: "offcanvas" } },
      { name: "Resizable", args: { resizable: true } },
      { name: "Groups that fold", args: { sections: "collapsible" } },
      { name: "A plain list", args: { sections: "off", show: ["icons"] } },
      { name: "Loading", args: { loading: true } },
    ],
  },
  tooltip: {
    name: "Tooltip",
    description: "Name an icon button for sighted pointer and keyboard users, with its shortcut.",
    upstream: "",
    dependencies: "React · Base UI",
    changes:
      "Tooltips in a TooltipGroup share one popup, which glides between buttons and morphs its size and text. Elsewhere, a TooltipProvider shares one delay, so once a tooltip opens the next opens at once. Hints can show a keyboard shortcut and an arrow. Tooltips are visual only, so every trigger keeps its own accessible name, and touch screens do not show them.",
    props: [
      reference("content", "ReactNode", "Required"),
      reference("shortcut", "string"),
      choice(
        "side",
        [
          ["top", "Top"],
          ["right", "Right"],
          ["bottom", "Bottom"],
          ["left", "Left"],
        ],
        "top",
      ),
      toggle("disabled"),
      toggle("arrow"),
      reference("TooltipGroup", "{ side, arrow, children }", "Part"),
      reference("TooltipProvider", "{ delay, closeDelay, timeout, children }", "Part"),
    ],
    example: [
      toggle("grouped", true, {
        note: "On, a TooltipGroup glides one tooltip. Off, a TooltipProvider shares the delay.",
      }),
    ],
  },
  kbd: {
    name: "Keyboard key",
    description: "Show a key or a shortcut, such as Command-K, as keys on a keyboard.",
    upstream: "",
    dependencies: "React",
    changes:
      "Separate keys with spaces to show each one as its own key cap. Subtle caps sit quietly beside a label, as in the Command menu. Outline caps have a keyline and bottom edge in the text colour, as outline Buttons do, for a shortcut that must stand out. Given a shortcut, such as K, it shows the device's own, ⌘ K on Apple devices and Ctrl K elsewhere.",
    props: [
      reference("children", "ReactNode, with spaces between keys", "Required"),
      reference("variant", '"subtle" | "outline"', "subtle"),
      reference(
        "shortcut",
        'string, such as "K", shown with ⌘ on Apple devices and Ctrl elsewhere',
        "None",
      ),
    ],
    example: [toggle("outline", false, { note: "Shows the shortcuts with outline caps." })],
  },
} satisfies Record<string, Entry>;

export type ComponentName = keyof typeof entries;

/**
 * Each group's components, in the order the sidebar lists them. The ones a service reaches for come
 * first, with related components side by side, instead of by name. Parts come before what is built
 * from them, and the parts of a page in the order they sit on it. Next and Previous follow this
 * order, as do the command menu's groups.
 */
const order: Record<Group, readonly ComponentName[]> = {
  Actions: ["button", "link", "exit-this-page"],
  // Text first, then choices, dates and files, then richer choices, then app-style controls.
  "Form controls": [
    "input",
    "textarea",
    "editor",
    "select",
    "radios",
    "checkboxes",
    "choices",
    "date-input",
    "time-input",
    "file-upload",
    "combobox",
    "multi-select",
    "search-box",
    "switch",
    "slider",
    "toggle-group",
    "filter-chips",
    "input-otp",
  ],
  // A field, a group of fields, the page's errors, then the form that ties them together.
  "Fields and validation": ["field", "fieldset", "error-summary", "form"],
  // From the top of a page down, then across a whole site.
  Navigation: [
    "skip-link",
    "service-navigation",
    "navigation-menu",
    "menubar",
    "sidebar",
    "breadcrumbs",
    "back-link",
    "tabs",
    "pagination",
    "language-navigation",
    "command-menu",
  ],
  // The page, then its parts from top to bottom.
  "Page structure": ["page", "cookie-banner", "header", "phase-banner", "feedback", "footer"],
  // The page's width, then what contains content, what folds it away, and what divides, scrolls and
  // resizes it.
  Layout: [
    "width-container",
    "card",
    "aside",
    "accordion",
    "details",
    "separator",
    "scroll-area",
    "tiles",
    "aspect-ratio",
  ],
  // Messages from the strongest to the quietest, then status, then the absence of content.
  "Messages and status": [
    "notification-banner",
    "panel",
    "warning-text",
    "inset-text",
    "prose",
    "rich-text",
    "toast",
    "tag",
    "progress",
    "spinner",
    "skeleton",
    "empty-state",
  ],
  // Tables and lists, then time and figures, code, then the small pieces they contain.
  "Data display": [
    "table",
    "summary-list",
    "data-table",
    "grouped-table",
    "task-list",
    "timeline",
    "stat",
    "figure",
    "code-block",
    "avatar",
    "item",
    "attachment",
    "kbd",
    "marker",
  ],
  // The charts set in a frame, the most common first and the set of them after, then those for one
  // kind of figure. Then the figures set alone, from a list to a single figure.
  Charts: [
    "chart",
    "chart-set",
    "calendar-heatmap",
    "choropleth-map",
    "treemap",
    "sunburst",
    "sankey",
    "bar-list",
    "bullet-chart",
    "gauge",
    "waffle",
    "sparkline",
  ],
  Media: ["carousel", "organisation-name", "logo-carousel", "lightbox", "qr-code"],
  // Surfaces that take over, then those beside a trigger or pointing at part of the page, then
  // menus.
  Overlays: [
    "dialog",
    "sheet",
    "popover",
    "callout",
    "tour",
    "hover-card",
    "tooltip",
    "dropdown-menu",
    "context-menu",
  ],
  // A conversation and its parts, an agent's work, then tools for documents.
  "AI and agents": [
    "conversation",
    "message-scroller",
    "bubble",
    "chat-input",
    "file-chips",
    "streaming-text",
    "text-shimmer",
    "reasoning-steps",
    "inline-citation",
    "plan-card",
    "question-card",
    "file-diff",
    "image-generation",
  ],
  Utilities: ["sound", "theme-picker", "visually-hidden"],
};

/** Components in sidebar order, by group, then in each group's own order. */
export const componentOrder = groups.flatMap((group) => order[group]);

const groupOf = Object.fromEntries(
  groups.flatMap((group) => order[group].map((name) => [name, group] as const)),
) as Record<ComponentName, Group>;

// Every component sits in exactly one group.
const unplaced = (Object.keys(entries) as ComponentName[]).filter((name) => !groupOf[name]);
if (unplaced.length || new Set(componentOrder).size !== componentOrder.length)
  throw new Error(`Give every component one place in a group: ${unplaced.join(", ")}`);

export const catalogue = Object.fromEntries(
  Object.entries(entries).map(([name, entry]) => [
    name,
    { ...entry, group: groupOf[name as ComponentName] },
  ]),
) as unknown as Record<ComponentName, Entry & { group: Group }>;
export const componentNames = componentOrder;

/** GOV.UK Design System's page for what a component follows, by its `upstream`. */
export const upstreamPage = (upstream: string) =>
  `https://design-system.service.gov.uk/${upstream.includes("/") ? upstream : `components/${upstream}`}/`;
