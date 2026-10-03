import { expect, test } from "bun:test";
import {
  defaultEditorLabels,
  defaultEditorToolbar,
  Editor,
  EditorContent,
  EditorControl,
  EditorToolbar,
  editorToolbarGroups,
} from "@x-govuk-ui/jorjorwel";
import { renderToStaticMarkup } from "react-dom/server";
import {
  Calendar,
  Checkbox,
  Checkboxes,
  ChoiceDivider,
  Combobox,
  DateInput,
  dateFromParts,
  ErrorMessage,
  ErrorSummary,
  ErrorSummaryItem,
  Field,
  Fieldset,
  FileUpload,
  Hint,
  Input,
  InputOTP,
  Label,
  MultiSelect,
  passwordStrength,
  Radio,
  Radios,
  SearchBox,
  Select,
  SelectItem,
  Switch,
  Textarea,
  TimeInput,
  useField,
  validateWith,
} from "x-govuk-ui";
import { z } from "zod";
import { fieldOf } from "../../packages/core/src/form";
import { controlIcons } from "../../packages/jorjorwel/src/editor-controls";
import { matchPosition } from "../../packages/jorjorwel/src/editor-prompt";

test("input connects labels, hints, errors and caller descriptions", () => {
  const html = renderToStaticMarkup(
    <Input
      id="email"
      label="Email address"
      hint="Use your personal email."
      errorMessage="Enter an email address."
      aria-describedby="privacy"
      name="email"
    />,
  );
  expect(html).toContain('for="email"');
  expect(html).toContain('aria-describedby="privacy email-hint email-error"');
  expect(html).toContain('id="email-hint"');
  expect(html).toContain('id="email-error"');
  expect(html).toContain('aria-invalid="true"');
  const numericHint = renderToStaticMarkup(<Input id="count" label="Count" hint={0} />);
  expect(numericHint).toContain('aria-describedby="count-hint"');
  expect(numericHint).toContain('id="count-hint" class="x-govuk-ui-hint">0</div>');
});

test("field parts connect any control to its label, hint and error", () => {
  function Reference({ errorMessage }: { errorMessage?: string }) {
    const hint = "It is on your letter.";
    const field = useField({ id: "reference", hint, errorMessage });
    return (
      <Field invalid={field.invalid}>
        <Label htmlFor={field.id}>Reference</Label>
        <Hint id={field.hintId}>{hint}</Hint>
        <select {...field.controlProps} />
        <ErrorMessage id={field.errorId}>{errorMessage}</ErrorMessage>
      </Field>
    );
  }
  const valid = renderToStaticMarkup(<Reference />);
  expect(valid).toContain('<select id="reference" aria-describedby="reference-hint">');
  expect(valid).not.toContain("data-invalid");
  expect(valid).not.toContain("aria-invalid");
  expect(valid).not.toContain("x-govuk-ui-error");
  const invalid = renderToStaticMarkup(<Reference errorMessage="Enter your reference." />);
  expect(invalid).toContain('data-invalid="true"');
  expect(invalid).toContain(
    'aria-describedby="reference-hint reference-error" aria-invalid="true"',
  );
  expect(invalid).toContain('id="reference-error" role="alert"');
  expect(renderToStaticMarkup(<Hint />)).toBe("");
  const otp = renderToStaticMarkup(
    <InputOTP id="code" label="Code" hint="Sent by text" errorMessage="Enter the code." />,
  );
  expect(otp).toContain('for="code"');
  expect(otp).toContain('aria-describedby="code-hint code-error"');
});

test("inputs generate distinct IDs and escape content during server rendering", () => {
  const html = renderToStaticMarkup(
    <>
      <Input label="<script>alert(1)</script>" />
      <Input label="Second field" />
    </>,
  );
  const ids = [...html.matchAll(/<input[^>]* id="([^"]+)"/g)].map((match) => match[1]);
  expect(ids).toHaveLength(2);
  expect(new Set(ids).size).toBe(2);
  expect(html).toContain("&lt;script&gt;");
  expect(html).not.toContain("<script>");
});

test("checkboxes and radios follow GOV.UK's ids and describe the group", () => {
  const checkboxes = renderToStaticMarkup(
    <Checkboxes
      id="waste"
      name="waste"
      legend="Which waste?"
      hint="Select all that apply."
      errorMessage="Select a type of waste"
      defaultValue={["mines"]}
    >
      <Checkbox value="carcasses">Carcasses</Checkbox>
      <Checkbox value="mines" hint="And quarries">
        Mines
      </Checkbox>
      <ChoiceDivider />
      <Checkbox value="none" exclusive conditional={<p>Follow-up</p>}>
        None
      </Checkbox>
    </Checkboxes>,
  );
  expect(checkboxes).toContain('aria-describedby="waste-hint waste-error"');
  expect(checkboxes).toMatch(/id="waste"[^>]*value="carcasses"/);
  expect(checkboxes).toMatch(/id="waste-2"[^>]*checked=""[^>]*value="mines"/);
  expect(checkboxes).toContain('aria-describedby="waste-2-hint"');
  // The divider is not counted, so None is the third item.
  expect(checkboxes).toMatch(/id="waste-3"[^>]*value="none"/);
  expect(checkboxes).toContain('aria-controls="waste-3-conditional"');
  expect(checkboxes).toMatch(/id="waste-3-conditional" inert=""/);
  const radios = renderToStaticMarkup(
    <Radios id="contact" name="contact" legend="Contact" inline defaultValue="phone">
      <Radio value="email">Email</Radio>
      <Radio value="phone">Phone</Radio>
    </Radios>,
  );
  expect(radios).toContain('data-kind="radio" data-inline="true"');
  expect(radios).toMatch(/type="radio" id="contact-2"[^>]*checked=""[^>]*value="phone"/);
});

test("textarea, select, switch and fieldset connect their labels and hints", () => {
  const textarea = renderToStaticMarkup(
    <Textarea id="detail" label="Detail" hint="Be brief." errorMessage="Enter detail" />,
  );
  expect(textarea).toContain('for="detail"');
  expect(textarea).toContain('aria-describedby="detail-hint detail-error"');
  expect(textarea.indexOf("detail-error")).toBeLessThan(textarea.indexOf("<textarea"));
  const select = renderToStaticMarkup(
    <Select id="sort" label="Sort by" hint="Newest first by default." defaultValue="newest">
      <SelectItem value="newest">Newest</SelectItem>
    </Select>,
  );
  // The field is Base UI's trigger, named by the label and described by the hint.
  expect(select).toContain('for="sort"');
  expect(select).toMatch(
    /<button[^>]*id="sort"[^>]*aria-describedby="sort-hint"|<button[^>]*aria-describedby="sort-hint"[^>]*id="sort"/,
  );
  expect(select).toContain(">Newest<");
  const toggle = renderToStaticMarkup(
    <Switch id="notify" label="Notifications" hint="By email." />,
  );
  expect(toggle).toContain(
    'type="checkbox" role="switch" id="notify" aria-describedby="notify-hint"',
  );
  const fieldset = renderToStaticMarkup(
    <Fieldset legend="What is your address?" legendSize="large" pageHeading>
      <span />
    </Fieldset>,
  );
  expect(fieldset).toContain(
    '<legend class="x-govuk-ui-legend x-govuk-ui-legend--large"><h1 class="x-govuk-ui-legend-heading">What is your address?</h1></legend>',
  );
});

test("the editor is a field whose label names its document, with Lexxy's toolbar and a count", () => {
  const html = renderToStaticMarkup(
    <Editor
      id="notes"
      name="notes"
      label="Notes"
      hint="Keep it short."
      errorMessage="Enter notes"
      defaultValue="<p>Hello</p>"
      placeholder="What happened"
      characterLimit={100}
    />,
  );
  // The label is for nothing, because the document is not an input. The document names it by id.
  expect(html).toContain('<label id="notes-label" class="x-govuk-ui-label">Notes</label>');
  expect(html).toContain('id="notes-hint"');
  expect(html).toContain('id="notes-error"');
  expect(html).toContain('class="x-govuk-ui-editor" data-invalid="true"');
  // The document is a multi-line textbox, labelled and described, which Lexical fills in the
  // browser.
  expect(html).toMatch(/role="textbox"/);
  expect(html).toContain('id="notes"');
  expect(html).toContain('aria-labelledby="notes-label"');
  expect(html).toContain('aria-describedby="notes-hint notes-error notes-info"');
  expect(html).toContain('aria-multiline="true"');
  expect(html).toContain('aria-placeholder="What happened"');
  // Lexxy's toolbar, without the files, because there is nowhere to store them.
  expect(html).toContain('role="toolbar" aria-label="Formatting"');
  const lexxy = [
    "Bold",
    "Italic",
    "Strikethrough",
    "Underline",
    "Text formatting",
    "Colour",
    "Link",
    "Quotation",
    "Code",
    "Bulleted list",
    "Numbered list",
    "Insert a table",
    "Insert a divider",
    "Undo",
    "Redo",
  ];
  for (const name of lexxy) expect(html).toContain(`aria-label="${name}"`);
  for (const name of ["Add an image or video", "Attach a file", "Source", "Checklist"])
    expect(html).not.toContain(`aria-label="${name}"`);
  const files = renderToStaticMarkup(<Editor label="Notes" onUpload={async () => "/a.png"} />);
  expect(files).toContain('aria-label="Add an image or video"');
  expect(files).toContain('aria-label="Attach a file"');
  // The field submits its document as it was given, and counts it.
  expect(html).toContain('<input type="hidden" name="notes" value="&lt;p&gt;Hello&lt;/p&gt;"/>');
  expect(html).toContain("You can enter up to 100 characters");
  // Composed, it contains only what it is given, in the order given.
  const own = renderToStaticMarkup(
    <Editor label="Notes">
      <EditorContent />
      <EditorToolbar label="Style" />
    </Editor>,
  );
  expect(own).toContain('aria-label="Style"');
  expect(own.indexOf("x-govuk-ui-editor-body")).toBeLessThan(own.indexOf('role="toolbar"'));
  // Plain text has no toolbar, and one line says so.
  const plain = renderToStaticMarkup(<Editor label="Notes" richText={false} multiLine={false} />);
  expect(plain).not.toContain('role="toolbar"');
  expect(plain).toContain('aria-multiline="false"');
  expect(plain).toContain("data-plain");
  // Every word can be said in Welsh.
  const welsh = renderToStaticMarkup(
    <Editor label="Nodiadau" labels={{ toolbar: "Fformatio", bold: "Trwm" }} />,
  );
  expect(welsh).toContain('aria-label="Fformatio"');
  expect(welsh).toContain('aria-label="Trwm"');
  // Named controls are laid out in their groups, with a keyline between, and history at the end.
  const named = renderToStaticMarkup(
    <Editor label="Notes">
      <EditorToolbar controls={["redo", "quote", "bold", "undo", "heading-2"]} />
      <EditorContent />
    </Editor>,
  );
  const order = [...named.matchAll(/aria-label="([^"]+)"|x-govuk-ui-editor-(separator|spacer)/g)]
    .map((match) => match[1] ?? match[2])
    .filter((each) => each !== "Formatting");
  expect(order).toEqual([
    "Bold",
    "separator",
    "Heading 2",
    "separator",
    "Quotation",
    "spacer",
    "Undo",
    "Redo",
  ]);
  // A control of your own runs your command, and says whether it is on.
  const custom = renderToStaticMarkup(
    <Editor label="Notes">
      <EditorToolbar>
        <EditorControl label="Shout" action={() => {}} active={(format) => format.bold}>
          !
        </EditorControl>
      </EditorToolbar>
      <EditorContent />
    </Editor>,
  );
  expect(custom).toMatch(
    /aria-label="Shout"[^>]*aria-pressed="false"|aria-pressed="false"[^>]*aria-label="Shout"/,
  );
});

test("the toolbar's groups hold every control once, and its labels name each", () => {
  const grouped = editorToolbarGroups.flat();
  expect(new Set(grouped).size).toBe(grouped.length);
  expect(defaultEditorToolbar.every((kind) => grouped.includes(kind))).toBe(true);
  for (const kind of grouped) expect(defaultEditorLabels[kind]).toBeTruthy();
  expect(Object.keys(controlIcons).sort()).toEqual([...grouped].sort());
  expect(defaultEditorLabels.heading("h2", 0)).toBe("Large heading");
  expect(defaultEditorLabels.heading("h5", 3)).toBe("Heading 5");
});

test("what the editor takes from Lexical beyond its documented API is still there", async () => {
  // Each of these is used by name or by shape, where TypeScript would not notice it disappear in an
  // upgrade. They are the selection's normalising, the editor's config for drawing text to export
  // it, a code token's type, the tag of the update that gives focus, and the block cursor's
  // attribute. Lexical belongs to the package, so it is found from the package.
  const resolve = (name: string) =>
    Bun.resolveSync(name, `${import.meta.dir}/../../packages/jorjorwel`);
  const lexical = await import(resolve("lexical"));
  expect(typeof lexical.$normalizeSelection__EXPERIMENTAL).toBe("function");
  expect(lexical.createEditor()._config).toBeObject();
  const { CodeHighlightNode } = await import(resolve("@lexical/code-core"));
  expect(typeof CodeHighlightNode.prototype.getHighlightType).toBe("function");
  const source = await Bun.file(resolve("lexical").replace(/[^/]+$/, "Lexical.dev.js")).text();
  expect(source).toContain("FOCUS_TAG = 'focus'");
  expect(source).toContain("data-lexical-cursor");
});

test("a prompt finds what is typed where its words start, as Lexxy's does", () => {
  expect(matchPosition("Neville Chamberlain caseworker", "cham")).toBe(8);
  expect(matchPosition("Neville Chamberlain", "ham")).toBe(-1);
  expect(matchPosition("Zoë Brown", "zoe")).toBe(0);
  expect(matchPosition("Anything", "")).toBe(0);
});

test("dates, passwords, counts, uploads, search and comboboxes follow GOV.UK's names and ids", () => {
  expect(dateFromParts({ day: "29", month: "2", year: "2028" })?.getDate()).toBe(29);
  expect(dateFromParts({ day: "30", month: "2", year: "2028" })).toBeNull();
  expect(dateFromParts({ day: "1", month: "1", year: "28" })).toBeNull();
  const date = renderToStaticMarkup(
    <DateInput id="start" name="start" legend="When does it start?" errorMessage="Enter a date" />,
  );
  expect(date).toContain('id="start-day"');
  expect(date).toContain('name="start-month"');
  expect(date).toContain('inputMode="numeric"');
  expect(date).toContain('aria-invalid="true"');
  expect(date).toContain("<legend");
  const calendar = renderToStaticMarkup(
    <Calendar defaultValue={new Date(2026, 9, 4)} defaultMonth={new Date(2026, 9, 1)} />,
  );
  expect(calendar).toContain('role="grid"');
  expect(calendar).toContain("October 2026");
  expect(calendar).toMatch(
    /aria-selected="true"[^>]*><button[^>]*aria-label="Sunday 4 October 2026"|aria-selected="true"[^>]*><button[^>]*aria-label="Sunday, 4 October 2026"/,
  );
  expect(passwordStrength("short")).toBe(0);
  expect(passwordStrength("Tr4velling-light")).toBe(4);
  const count = renderToStaticMarkup(
    <Textarea label="Detail" id="detail" characterLimit={10} defaultValue="Twelve chars" />,
  );
  expect(count).toContain("You have 2 characters too many");
  expect(count).toContain("You can enter up to 10 characters");
  expect(count).toContain('aria-describedby="detail-info"');
  const upload = renderToStaticMarkup(<FileUpload label="Upload a photo" id="photo" />);
  expect(upload).toContain('type="file"');
  expect(upload).toContain("No file chosen");
  expect(renderToStaticMarkup(<SearchBox />)).toContain('role="search"');
  expect(renderToStaticMarkup(<Combobox label="Country" items={["France"]} />)).toContain(
    'role="combobox"',
  );
  expect(renderToStaticMarkup(<MultiSelect label="Languages" items={["Welsh"]} />)).toContain(
    'role="combobox"',
  );
});

test("time inputs follow the date input's names and ids", () => {
  const html = renderToStaticMarkup(
    <TimeInput
      legend="When does it start?"
      id="start"
      name="start"
      hourCycle={12}
      value={{ hour: "9", minute: "05", period: "am" }}
    />,
  );
  expect(html).toContain('id="start-hour"');
  expect(html).toContain('name="start-hour"');
  expect(html).toContain('name="start-minute"');
  // On a 12-hour clock, am or pm is a Toggle group, which submits through a hidden field.
  expect(html).toContain('aria-label="am or pm"');
  expect(html).toContain('type="hidden" name="start-period" value="am"');
  // The fields stay text fields, as GOV.UK's date fields are.
  expect(html.match(/type="text"/g)).toHaveLength(2);
  expect(html).not.toContain('role="spinbutton"');
  // The drum the values roll past on is for the eye only.
  expect(html).toContain('class="x-govuk-ui-dial-drum" aria-hidden="true"');
});

test("the error summary lists each error as a link to its field", () => {
  const html = renderToStaticMarkup(
    <ErrorSummary>
      <ErrorSummaryItem href="#email">Enter an email address</ErrorSummaryItem>
    </ErrorSummary>,
  );
  expect(html).toContain('tabindex="-1"');
  expect(html).toContain(
    '<div role="alert"><h2 class="x-govuk-ui-error-summary-title">There is a problem</h2>',
  );
  expect(html).toContain('href="#email"');
});

test("validateWith checks a form's answers with a Standard Schema, each message on its field", () => {
  const schema = z
    .object({
      email: z.string().regex(/^\S+@\S+\.\S+$/, "Enter an email address in the correct format"),
      topics: z.array(z.string()).min(1, "Select at least one topic"),
      "birth-day": z.string(),
      "birth-month": z.string(),
      "birth-year": z.string(),
    })
    .refine((answers) => answers["birth-year"].length === 4, {
      path: ["birth-year"],
      message: "Date of birth must include a year",
    })
    .refine((answers) => answers.email !== "taken@example.com", "That email address is taken");
  const data = (entries: [string, string][]) => {
    const form = new FormData();
    for (const [name, value] of entries) form.append(name, value);
    return form;
  };
  const birth: [string, string][] = [
    ["birth-day", "1"],
    ["birth-month", "2"],
  ];
  // A list with nothing chosen is an empty list, and a part's message keeps the part's name. Form
  // shows it on the part's field.
  expect(
    validateWith(schema, { lists: ["topics"] })(
      data([["email", "no"], ...birth, ["birth-year", "99"]]),
    ),
  ).toEqual({
    email: "Enter an email address in the correct format",
    topics: "Select at least one topic",
    "birth-year": "Date of birth must include a year",
  });
  // One topic is still a list, and a check of the whole form goes under its root.
  const check = validateWith(schema, { lists: ["topics"], root: "email" });
  expect(
    check(
      data([
        ["email", "taken@example.com"],
        ["topics", "fishing"],
        ...birth,
        ["birth-year", "1990"],
      ]),
    ),
  ).toEqual({ email: "That email address is taken" });
  expect(
    check(
      data([
        ["email", "a@b.co"],
        ["topics", "fishing"],
        ["topics", "boats"],
        ...birth,
        ["birth-year", "1990"],
      ]),
    ),
  ).toEqual({});
  // A schema that waits cannot check answers as they change.
  const waits = z.object({ email: z.string().refine(async () => true) });
  expect(() => validateWith(waits)(data([["email", "a@b.co"]]))).toThrow(/without waiting/);
});

test("an error under a part of a field belongs to the field", () => {
  const fields = ["birth", "birth-place", "email"];
  expect(fieldOf("birth-day", fields)).toBe("birth");
  expect(fieldOf("birth-place", fields)).toBe("birth-place");
  expect(fieldOf("birth-place-town", fields)).toBe("birth-place");
  expect(fieldOf("phone", fields)).toBe("phone");
});

test("the editor sets its source HTML out a block to a line, its inline markup kept", async () => {
  const { formatHtml } = await import("../../packages/jorjorwel/src/editor-html");
  expect(
    formatHtml(
      '<h2>Visit on 4 October</h2><p>The applicant <strong>confirmed</strong> it, <a href="/rules">the rules</a>.</p><ul><li>the <em>rules</em></li><li>a date<ul><li>Friday</li></ul></li></ul><pre>  kept\n  as is</pre><p>Line<br>break</p>',
    ),
  ).toBe(
    [
      "<h2>Visit on 4 October</h2>",
      '<p>The applicant <strong>confirmed</strong> it, <a href="/rules">the rules</a>.</p>',
      "<ul>",
      "  <li>the <em>rules</em></li>",
      "  <li>",
      "    a date",
      "    <ul>",
      "      <li>Friday</li>",
      "    </ul>",
      "  </li>",
      "</ul>",
      "<pre>  kept\n  as is</pre>",
      "<p>Line<br>break</p>",
    ].join("\n"),
  );
});
