import { type ReactNode, useEffect, useRef, useState } from "react";
import {
  Callout,
  ChatInput,
  ChatInputAttach,
  ChatInputDictation,
  ChatInputModel,
  type ChatInputModelOption,
  type CitationSource,
  Conversation,
  ConversationActions,
  ConversationContent,
  ConversationCopy,
  ConversationMessage,
  ConversationNote,
  ConversationThinking,
  InlineCitation,
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
  Link,
  MessageRating,
  MessageRetry,
  ReasoningStep,
  ReasoningSteps,
  RichText,
  type RichTextComponents,
  StreamingText,
} from "x-govuk-ui";

type Reply = { text: string; markdown: string; sources: CitationSource[] };
type Message = {
  id: string;
  from: "user" | "assistant";
  text: string;
  /** The names of the files sent with a message. */
  files?: string[];
  sources?: CitationSource[];
  /** The reply in Markdown, and how much of it has streamed in. */
  markdown?: string;
  shown?: number;
  /** A reply works through its steps, then writes, and is done or stopped. */
  phase?: "steps" | "writing" | "done" | "stopped";
  step?: number;
};

type Props = {
  label?: string;
  assistantName?: string;
  /** Keeps the assistant thinking, to show ConversationThinking. */
  thinking?: boolean;
  /** Gives each message a Copy button in ConversationActions. */
  actions?: boolean;
  /** Shows ReasoningSteps before each reply. */
  reasoning?: boolean;
  /** Ends each reply with an InlineCitation. */
  citations?: boolean;
  /** A Callout by the composer suggests sending something, until the conversation starts. */
  tip?: boolean;
  /** Writes each reply in Markdown, streamed in pieces into a Rich text. */
  markdown?: boolean;
  /** Shows what the assistant can do in the empty log, with the composer waiting at its foot. */
  start?: boolean;
};

const replies: Reply[] = [
  {
    text: "Thanks for your message. This is an example, so nothing was sent to a service. In a real service, the answer would cite the pages it draws on.",
    markdown:
      "**Thanks for your message.** This is an example, so nothing was sent to a service. In a real service, the answer would cite the pages it draws on, such as the [GOV.UK Design System](#design-system).",
    sources: [
      {
        title: "GOV.UK Design System",
        url: "#design-system",
        crown: true,
        site: "GOV.UK",
        description: "Styles, components and patterns for building government services.",
      },
      {
        title: "Service Manual",
        url: "#service-manual",
        crown: true,
        site: "GOV.UK",
        description: "Guidance on building and running a government service.",
      },
    ],
  },
  {
    text: "Replies arrive a word at a time. You can stop one with the Stop button, and scroll up to read earlier messages.",
    markdown:
      "Replies arrive a piece at a time:\n\n- a **Rich text** draws the Markdown that has come so far\n- the **Stop** button keeps what has come\n\nScroll up to read earlier messages.",
    sources: [
      {
        title: "Writing for GOV.UK",
        url: "#writing-for-gov-uk",
        crown: true,
        site: "GOV.UK",
        description: "How to write clearly for people using government services.",
      },
    ],
  },
  {
    text: "Screen readers hear each reply once, as a whole, rather than a word at a time.",
    markdown:
      "Screen readers hear each reply once, as a whole:\n\n1. while it streams, they hear that it is being written\n2. once it is done, they hear all of it",
    sources: [
      {
        title: "Understanding WCAG 2.2",
        url: "#understanding-wcag",
        crown: true,
        site: "GOV.UK",
        description: "What the accessibility guidelines mean for a government service.",
      },
      {
        title: "Web Content Accessibility Guidelines 2.2",
        url: "#wcag-2-2",
        site: "W3C",
        description: "The standard itself, with every success criterion.",
      },
    ],
  },
];

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

const steps = ["Read your question", "Searched GOV.UK guidance", "Chose the best page"];

// What the assistant can do, which the empty log shows, each with its icon in a tile.
const abilities = [
  {
    title: "Answer questions about a service",
    description: "From GOV.UK's guidance, with the pages it used.",
    icon: "M4 5h16v11H8l-4 4zM8 9h8M8 12h5",
  },
  {
    title: "Explain a letter",
    description: "Attach it, and ask what it means for you.",
    icon: "M5 3h10l4 4v14H5zM14 3v5h5M8 13h8M8 17h6",
  },
];
const abilitiesOffer = (
  <>
    <h2 className="preview-chat-start-title">What can I help with?</h2>
    <ItemGroup>
      {abilities.map((ability) => (
        <li key={ability.title}>
          <Item>
            <ItemMedia variant="tile">
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                <path
                  d={ability.icon}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
              </svg>
            </ItemMedia>
            <ItemContent>
              <ItemTitle>{ability.title}</ItemTitle>
              <ItemDescription>{ability.description}</ItemDescription>
            </ItemContent>
          </Item>
        </li>
      ))}
    </ItemGroup>
  </>
);

// A reply's links are the library's Link.
const replyParts: RichTextComponents = {
  a: ({ attributes, children }) => <Link href={attributes.href}>{children}</Link>,
};

export default function ConversationExample({
  label = "Conversation",
  assistantName = "Service assistant",
  thinking = false,
  actions = true,
  reasoning = true,
  citations = true,
  tip = true,
  markdown = false,
  start = false,
}: Props) {
  // The conversation starts empty, with the composer waiting in the middle.
  const [messages, setMessages] = useState<Message[]>([]);
  // The tip disappears once the conversation starts, or once it is closed.
  const [tipClosed, setTipClosed] = useState(false);
  // Without steps, the assistant thinks before its reply arrives.
  const [waiting, setWaiting] = useState(false);
  const sent = useRef(0);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (run: () => void, wait: number) => {
    const timer = setTimeout(() => {
      timers.current.delete(timer);
      run();
    }, wait);
    timers.current.add(timer);
  };
  const update = (id: string, change: Partial<Message>) =>
    setMessages((previous) => previous.map((m) => (m.id === id ? { ...m, ...change } : m)));
  const finish = (id: string) =>
    setMessages((previous) =>
      previous.map((m) => (m.id === id && m.phase === "writing" ? { ...m, phase: "done" } : m)),
    );
  const busy = waiting || messages.some((m) => m.phase === "steps" || m.phase === "writing");
  // A reply in Markdown streams in pieces, as a model sends them, until all of it has arrived.
  useEffect(() => {
    const writing = messages.find((m) => m.phase === "writing");
    if (!markdown || !writing?.markdown) return;
    const timer = setTimeout(
      () =>
        setMessages((previous) =>
          previous.map((m) => {
            if (m.id !== writing.id || m.phase !== "writing" || !m.markdown) return m;
            const shown = Math.min(m.markdown.length, (m.shown ?? 0) + 6);
            return { ...m, shown, phase: shown < m.markdown.length ? "writing" : "done" };
          }),
        ),
      40,
    );
    return () => clearTimeout(timer);
  }, [markdown, messages]);

  const send = (text: string, files: File[]) => {
    // A count is enough of an id for messages that exist only on this page, and works on any
    // address. crypto.randomUUID needs a secure one, such as localhost or https.
    const turn = sent.current++;
    const id = `message-${turn}`;
    const reply = replies[turn % replies.length] as Reply;
    const answer: Message = { id: `${id}-reply`, from: "assistant", ...reply };
    setMessages((previous) => [
      ...previous,
      { id, from: "user", text, files: files.map((file) => file.name) },
    ]);
    if (reasoning) {
      // The reply arrives at once and works through its steps, then writes.
      later(
        () => setMessages((previous) => [...previous, { ...answer, phase: "steps", step: 0 }]),
        400,
      );
      for (let index = 0; index < steps.length; index++) {
        const next: Partial<Message> =
          index < steps.length - 1 ? { step: index + 1 } : { phase: "writing" };
        later(() => update(answer.id, next), 1300 + index * 900);
      }
    } else {
      setWaiting(true);
      later(
        () => {
          setWaiting(false);
          setMessages((previous) => [...previous, { ...answer, phase: "writing" }]);
        },
        2000 + Math.random() * 800,
      );
    }
  };
  // Trying again writes another reply instead of this one.
  const retry = (id: string) => {
    const reply = replies[sent.current++ % replies.length] as Reply;
    update(id, { ...reply, shown: 0, phase: "writing" });
  };
  const stop = () => {
    timers.current.forEach(clearTimeout);
    timers.current.clear();
    setWaiting(false);
    // A reply stopped during its steps has no text. One stopped while writing keeps what it wrote.
    setMessages((previous) =>
      previous.map((m) => {
        if (m.phase === "steps") return { ...m, phase: "stopped", text: "" };
        if (m.phase === "writing") return { ...m, phase: "stopped" };
        return m;
      }),
    );
  };

  return (
    // The log fills the preview and scrolls beneath the composer floating over its foot.
    <div className="preview-chat">
      <Conversation
        label={label}
        assistantName={assistantName}
        empty={start ? abilitiesOffer : undefined}
        composer={
          <ChatInput busy={busy} onSubmit={send} onStop={stop} tools={<ChatInputAttach />}>
            <ChatInputModel models={models} defaultValue="atlas" />
            <ChatInputDictation />
          </ChatInput>
        }
      >
        {messages.map((message) => {
          const step = message.step ?? 0;
          // A reply stopped during its steps has no text, so it never wrote.
          const wrote = message.phase !== "steps" && message.text !== "";
          // A step under way when the reply was stopped is left unfinished.
          const statusOf = (index: number) => {
            if (index < step || wrote) return "done";
            return message.phase === "steps" ? "active" : "pending";
          };
          // The user's words and any files, or a note that the reply was stopped before it wrote,
          // or the reply writing itself out, with its sources once done.
          let content: ReactNode;
          if (message.from === "user")
            content = (
              <>
                {message.text}
                {message.files?.length ? (
                  <span className="preview-chat-files">Attached {message.files.join(", ")}</span>
                ) : null}
              </>
            );
          else if (!message.text)
            content = <ConversationNote>You stopped this reply.</ConversationNote>;
          else if (markdown && message.markdown)
            content = (
              <>
                <RichText
                  markdown={message.markdown.slice(0, message.shown ?? 0)}
                  components={replyParts}
                />
                {citations && message.sources && message.phase === "done" && (
                  <InlineCitation sources={message.sources} />
                )}
              </>
            );
          else
            content = (
              <>
                <StreamingText
                  // A new reply writes itself out from the start.
                  key={message.text}
                  text={message.text}
                  stopped={message.phase === "stopped"}
                  onComplete={() => finish(message.id)}
                />
                {citations && message.sources && message.phase === "done" && (
                  <InlineCitation sources={message.sources} />
                )}
              </>
            );
          return (
            <ConversationMessage
              key={message.id}
              from={message.from}
              streaming={markdown && message.phase === "writing"}
            >
              {message.step !== undefined && (
                <ReasoningSteps
                  active={message.phase === "steps"}
                  activeTitle="Checking GOV.UK guidance"
                  title={message.text ? "Checked 3 pages" : "Stopped checking"}
                >
                  {steps.slice(0, step + 1).map((name, index) => (
                    <ReasoningStep key={name} status={statusOf(index)}>
                      {name}
                    </ReasoningStep>
                  ))}
                </ReasoningSteps>
              )}
              {message.phase !== "steps" &&
                (message.text ? <ConversationContent>{content}</ConversationContent> : content)}
              {actions && message.phase !== "steps" && message.phase !== "writing" && (
                <ConversationActions>
                  <ConversationCopy />
                  {message.from === "assistant" && message.text && (
                    <>
                      <MessageRating />
                      <MessageRetry onRetry={() => retry(message.id)} disabled={busy} />
                    </>
                  )}
                </ConversationActions>
              )}
            </ConversationMessage>
          );
        })}
        {(waiting || thinking) && <ConversationThinking key="thinking" />}
      </Conversation>
      <Callout
        anchor=".preview-chat .x-govuk-ui-chat-input"
        open={tip && !tipClosed && messages.length === 0}
        onOpenChange={(open) => setTipClosed(!open)}
        side="top"
        title="Try it"
      >
        Ask anything and send it.
      </Callout>
    </div>
  );
}
