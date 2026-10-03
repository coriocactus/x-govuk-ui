import { expect, test } from "bun:test";
import {
  Editor,
  EditorAI,
  EditorAIAction,
  EditorAIAsk,
  EditorAIPrompt,
  EditorAISuggestion,
  EditorAIToolbar,
  EditorAITools,
  EditorContent,
} from "@x-govuk-ui/jorjorwel";
import { renderToStaticMarkup } from "react-dom/server";
import {
  ChatInput,
  ChatInputAttach,
  ChatInputAttachment,
  ChatInputAttachments,
  ChatInputDictation,
  Conversation,
  ConversationActions,
  ConversationContent,
  ConversationCopy,
  ConversationMessage,
  ConversationNote,
  ConversationThinking,
  defaultThinkingLabels,
  FileChip,
  FileChips,
  InlineCitation,
  Item,
  ItemMedia,
  MessageSuggestion,
  MessageSuggestions,
  playfulThinkingLabels,
  ReasoningStep,
  ReasoningSteps,
  StreamingText,
  Tag,
} from "x-govuk-ui";
import { Orb } from "../../packages/core/src/orb";
import { textEdits } from "../../packages/jorjorwel/src/editor-ai";

test("AI parts announce whole replies, name their tools and leave citations out of copies", () => {
  const chat = renderToStaticMarkup(<ChatInput id="ask" />);
  expect(chat).toContain('<label for="ask"');
  expect(chat).toContain('aria-label="Send"');
  expect(chat).toContain('enterKeyHint="send"');
  expect(renderToStaticMarkup(<ChatInput busy />)).toContain('aria-label="Stop the reply"');
  const tools = renderToStaticMarkup(
    <ChatInput tools={<ChatInputAttach accept=".pdf" />}>
      <ChatInputDictation />
    </ChatInput>,
  );
  expect(tools).toContain('type="file"');
  expect(tools).toContain('accept=".pdf"');
  expect(tools).toContain('aria-label="Attach a file"');
  // The server cannot know about speech recognition, so dictation starts unavailable.
  expect(tools).toContain('aria-label="Dictation is not available in this browser"');
  expect(() => renderToStaticMarkup(<ChatInputDictation />)).toThrow("inside ChatInput");
  expect(
    renderToStaticMarkup(
      <Tag colour="grey" variant="outline">
        Rejected
      </Tag>,
    ),
  ).toContain('data-variant="outline"');
  // The whole text is there for screen readers at once, and the words are only for the eye.
  const stream = renderToStaticMarkup(<StreamingText text="Apply online today." />);
  expect(stream).toContain('<span class="x-govuk-ui-visually-hidden">Apply online today.</span>');
  expect(stream).toContain('<span aria-hidden="true">');
  expect(renderToStaticMarkup(<StreamingText text="Still coming" streaming />)).not.toContain(
    "x-govuk-ui-visually-hidden",
  );
  expect(renderToStaticMarkup(<StreamingText text="Shown at once" instant />)).toContain(
    "data-instant",
  );
  const steps = renderToStaticMarkup(
    <ReasoningSteps title="Checked 2 pages" defaultOpen>
      <ReasoningStep>Read the question</ReasoningStep>
      <ReasoningStep status="active">Searched GOV.UK</ReasoningStep>
    </ReasoningSteps>,
  );
  expect(steps).toContain("<ol");
  expect(steps).toContain("Done: </span>Read the question");
  expect(steps).toContain("In progress: </span>Searched GOV.UK");
  const cite = renderToStaticMarkup(
    <InlineCitation
      sources={[
        { title: "Get a passport photo", url: "https://www.gov.uk/photos-for-passports" },
        { title: "Photo rules", url: "https://www.example.com/photos", site: "Example" },
      ]}
    />,
  );
  expect(cite).toContain('aria-label="Sources: gov.uk and 1 more"');
  expect(cite).toContain(">+1</span>");
  expect(cite).toContain('data-copy="skip"');
  expect(
    renderToStaticMarkup(
      <InlineCitation
        sources={[{ title: "Photo rules", url: "https://example.com", site: "Example" }]}
      />,
    ),
  ).toContain('aria-label="Source: Example"');
});

test("conversation parts name each speaker, and the thinking status is plain for screen readers", () => {
  const html = renderToStaticMarkup(
    <Conversation label="Help" assistantName="Benefits assistant">
      <ConversationMessage from="user">
        <ConversationContent>Can I apply?</ConversationContent>
      </ConversationMessage>
      <ConversationMessage from="assistant">
        <ConversationContent>Yes.</ConversationContent>
        <ConversationActions>
          <ConversationCopy />
        </ConversationActions>
      </ConversationMessage>
      <ConversationThinking labels={["Pondering"]} />
    </Conversation>,
  );
  expect(html).toContain('role="log" aria-label="Help"');
  expect(html).toContain('<h3 class="x-govuk-ui-visually-hidden">You</h3>');
  expect(html).toContain('<h3 class="x-govuk-ui-visually-hidden">Benefits assistant</h3>');
  expect(html).toContain('aria-label="Copy"');
  expect(html).toContain('role="status">Benefits assistant is writing a reply</span>');
  expect(html).toContain('<p class="x-govuk-ui-thinking" aria-hidden="true">');
});

test("the assistant thinks in plain words unless a service chooses livelier ones", () => {
  const plain = renderToStaticMarkup(
    <Conversation>
      <ConversationThinking />
    </Conversation>,
  );
  expect(plain).toContain(`${defaultThinkingLabels[0]}…`);
  expect(defaultThinkingLabels).not.toContain("Vibing");
  expect(playfulThinkingLabels).toContain("Vibing");
});

test("the Editor's suggestions are composed from parts, and wait for a selection", () => {
  const html = renderToStaticMarkup(
    <Editor label="Summary" value="<p>Some text</p>" onValueChange={() => {}}>
      <EditorContent />
      <EditorAI onRequestEdit={async () => ""}>
        <EditorAIToolbar>
          <EditorAITools>
            <EditorAIAsk />
            <EditorAIAction instruction="Make this shorter">Shorten</EditorAIAction>
          </EditorAITools>
          <EditorAIPrompt />
          <EditorAISuggestion />
        </EditorAIToolbar>
      </EditorAI>
    </Editor>,
  );
  // It is the Editor's field. The label names the document, and the instructions are there.
  expect(html).toMatch(/<label[^>]*class="x-govuk-ui-label[^>]*>Summary<\/label>/);
  expect(html).toContain("Select text to show editing suggestions.");
  // The toolbar waits for a selection.
  expect(html).not.toContain('aria-label="Suggest an edit"');
});

test("a suggestion is fitted into the text word by word, so the words it keeps stay as they are", () => {
  const apply = (before: string, after: string) => {
    let text = before;
    for (const edit of textEdits(before, after).reverse())
      text = text.slice(0, edit.from) + edit.text + text.slice(edit.to);
    return text;
  };
  const before = "In order to process the claim, please provide the evidence by Friday.";
  const after = "To process the claim, provide the evidence by Friday.";
  // Only the words that change are replaced, so the rest keep their formatting.
  expect(textEdits(before, after)).toEqual([
    { from: 0, to: 11, text: "To" },
    { from: 30, to: 37, text: "" },
  ]);
  expect(apply(before, after)).toBe(after);
  // Paragraphs, as the document's text joins them, are pieces like any other.
  const two = "First line.\n\nSecond line, regarding fees.";
  expect(apply(two, "First line.\n\nSecond line, about fees.")).toBe(
    "First line.\n\nSecond line, about fees.",
  );
  expect(textEdits(two, "First line. Second line, regarding fees.")).toEqual([
    { from: 11, to: 13, text: " " },
  ]);
  expect(textEdits("Same text.", "Same text.")).toEqual([]);
  expect(apply("Some words", "")).toBe("");
});

test("the orb is decorative unless labelled", () => {
  expect(renderToStaticMarkup(<Orb />)).toContain('aria-hidden="true"');
  const labelled = renderToStaticMarkup(<Orb label="Assistant" state="working" />);
  expect(labelled).toContain('role="img"');
  expect(labelled).toContain('aria-label="Assistant"');
  expect(labelled).toContain('data-state="working"');
});

test("message suggestions are a named list of outline buttons, which take a className", () => {
  const html = renderToStaticMarkup(
    <MessageSuggestions className="mine">
      <MessageSuggestion className="ask">When will my passport arrive?</MessageSuggestion>
    </MessageSuggestions>,
  );
  expect(html).toContain(
    '<ul aria-label="Suggested questions" class="x-govuk-ui-message-suggestions mine">',
  );
  expect(html).toMatch(
    /<li class="x-govuk-ui-message-suggestion"><button[^>]*x-govuk-ui-button--outline x-govuk-ui-button--small/,
  );
  expect(html).toContain("x-govuk-ui-message-suggestion-button ask");
  expect(
    renderToStaticMarkup(
      <MessageSuggestions aria-label="Ask next">
        <li />
      </MessageSuggestions>,
    ),
  ).toContain('aria-label="Ask next"');
});

test("a streaming message hides its content from screen readers and says a reply is being written", () => {
  const html = renderToStaticMarkup(
    <Conversation assistantName="Benefits assistant">
      <ConversationMessage from="assistant" streaming>
        <ConversationContent>You can apply if</ConversationContent>
      </ConversationMessage>
    </Conversation>,
  );
  expect(html).toMatch(/<article [^>]*aria-busy="true"/);
  expect(html).toContain('role="status">Benefits assistant is writing a reply</span>');
  expect(html).toMatch(/class="x-govuk-ui-message-content" aria-hidden="true"/);
});

test("a conversation's messages are headed at the level it is given, and a quiet note is muted text", () => {
  const html = renderToStaticMarkup(
    <Conversation headingLevel={4}>
      <ConversationMessage from="assistant">
        <ConversationNote>You stopped this reply.</ConversationNote>
      </ConversationMessage>
    </Conversation>,
  );
  expect(html).toContain('<h4 class="x-govuk-ui-visually-hidden">Service assistant</h4>');
  expect(html).toContain('<p class="x-govuk-ui-message-note">You stopped this reply.</p>');
});

test("an empty conversation shows its start beside the log, not in it, with the composer at its foot", () => {
  const html = renderToStaticMarkup(
    <Conversation
      empty={
        <Item>
          <ItemMedia variant="tile">✎</ItemMedia>Explain a letter
        </Item>
      }
    >
      {[]}
    </Conversation>,
  );
  expect(html).toMatch(/class="x-govuk-ui-conversation" data-empty="true" data-start="true"/);
  const log = html.slice(
    html.indexOf('role="log"'),
    html.indexOf("x-govuk-ui-message-scroller-spacer"),
  );
  expect(log).not.toContain("Explain a letter");
  expect(html).toContain('class="x-govuk-ui-message-scroller-empty"');
  expect(html).toContain('<div class="x-govuk-ui-item-media" data-variant="tile">✎</div>');
});

test("a chat input lists what goes with the message: its files, or a service's own attachments", () => {
  const files = renderToStaticMarkup(
    <ChatInput defaultFiles={[new File(["x"], "passport.pdf")]} />,
  );
  expect(files).toContain(
    '<ul aria-label="Attached files" class="x-govuk-ui-file-chips x-govuk-ui-chat-input-attachments">',
  );
  expect(files).toContain('aria-label="Remove passport.pdf"');
  const own = renderToStaticMarkup(
    <ChatInput
      attachments={
        <ChatInputAttachments label="Sent with the message">
          <ChatInputAttachment name="Rod fishing byelaws" kind="Document" onRemove={() => {}} />
          <ChatInputAttachment name="Your licence" />
        </ChatInputAttachments>
      }
    />,
  );
  expect(own).toContain('aria-label="Sent with the message"');
  expect(own).toContain('<span class="x-govuk-ui-file-chip-kind">Document</span>');
  expect(own).toContain('aria-label="Remove Rod fishing byelaws"');
  // Something that cannot be removed has no button to remove it.
  expect(own).not.toContain('aria-label="Remove Your licence"');
});

test("file chips list a sent question's documents outside a chat input, each name a link if given one", () => {
  const html = renderToStaticMarkup(
    <FileChips label="Documents with this question">
      <FileChip name="Rod fishing byelaws 2026.pdf" kind="PDF" render={<a href="/documents/1" />} />
    </FileChips>,
  );
  expect(html).toContain(
    '<ul aria-label="Documents with this question" class="x-govuk-ui-file-chips">',
  );
  // The name is the link, and shows in full in its title when it is cut short.
  expect(html).toContain(
    '<a href="/documents/1" class="x-govuk-ui-file-chip-name" title="Rod fishing byelaws 2026.pdf">',
  );
  // It is cut short in its middle, so its last word and extension keep their space. Screen readers
  // hear it in full, once.
  expect(html).toContain(
    '<span class="x-govuk-ui-file-chip-start" aria-hidden="true">Rod fishing byelaws </span><span class="x-govuk-ui-file-chip-end" aria-hidden="true">2026.pdf</span><span class="x-govuk-ui-visually-hidden x-govuk-ui-file-chip-whole">Rod fishing byelaws 2026.pdf</span>',
  );
  expect(html).toContain('<span class="x-govuk-ui-file-chip-kind">PDF</span>');
  expect(html).not.toContain("x-govuk-ui-file-chip-remove");
});
