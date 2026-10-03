import { motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import {
  Bubble,
  BubbleContent,
  BubbleGroup,
  Button,
  Callout,
  ChatInput,
  MessageActions,
  MessageCopy,
  MessageRating,
  MessageRetry,
  MessageScroller,
  type MessageScrollerHandle,
  MessageScrollerItem,
  MessageSuggestion,
  MessageSuggestions,
  StreamingText,
} from "x-govuk-ui";

type Props = {
  autoScroll?: boolean;
  peek?: number;
  defaultPosition?: "start" | "end" | "last-anchor";
  /** A Callout by the message box suggests asking something, until the chat is opened. */
  tip?: boolean;
};

type Message = {
  id: string;
  from: "you" | "office";
  text: string[];
  streaming?: boolean;
  stopped?: boolean;
  /** How many times the reply has been requested again, so it writes itself out again. */
  again?: number;
};

const earlier: Message[] = [
  { id: "e1", from: "you", text: ["I want to renew my passport. Can I do it online?"] },
  {
    id: "e2",
    from: "office",
    text: [
      "Yes. You can renew online if your passport is from the UK and you have a digital photo.",
    ],
  },
  { id: "e3", from: "you", text: ["Does my photo need a plain background?"] },
  {
    id: "e4",
    from: "office",
    text: ["Yes. Stand in front of a plain, light-coloured background, with nothing behind you."],
  },
];

const opening: Message[] = [
  { id: "m1", from: "you", text: ["I sent my application on Monday.", "What happens next?"] },
  {
    id: "m2",
    from: "office",
    text: [
      "We check your application and photo first. If anything is missing, we will email you.",
      "Most renewals are done within 3 weeks.",
    ],
  },
  { id: "m3", from: "you", text: ["Do I need to send my old passport?"] },
  {
    id: "m4",
    from: "office",
    text: [
      "Yes. We will tell you how to send it once we have checked your application. Keep it until then.",
    ],
  },
];

// Suggested questions, each with the office's answer. Anything else typed gets the last reply.
const suggestions = [
  [
    "When will my new passport arrive?",
    "It usually arrives within 3 weeks of us receiving your old passport. We will send it by courier, and you can track it from the email we send when it leaves us. If you are not in, the courier will leave a card so you can arrange another delivery.",
  ],
  [
    "Can I travel while you have my passport?",
    "No. You cannot travel on a passport we are holding. If you need to travel urgently, you may be able to use the Fast Track service, which takes about a week. You will need to book an appointment and pay a higher fee.",
  ],
  [
    "Will my old visas still be valid?",
    "Visas in your old passport stay valid until they expire. We will send your old passport back to you, cancelled, with the visas still in it.",
  ],
] as const;
const fallback =
  "Thanks for your question. This is an example, so nothing was sent to the Passport Office. A real adviser would answer here.";

/** The pinned message, which the bar under the header goes to. */
const PINNED = "e3";

/**
 * A chat with the Passport Office, docked at the foot of a page in the middle, as a documentation
 * site's assistant is. Its message box is always there, and the conversation opens above it and
 * folds back down into it. Its log is a Message scroller, its messages Bubbles and its message box
 * a Chat input. It opens at the newest message. Choosing a suggested question, or writing one,
 * lifts it to near the top with the end of the last reply peeking above. The answer streams into
 * the space below. The pinned question is in the earlier messages, which load above without
 * moving the reader.
 */
export default function MessageScrollerExample({
  autoScroll = true,
  peek = 64,
  defaultPosition = "end",
  tip = true,
}: Props) {
  const panelId = useId();
  const scroller = useRef<MessageScrollerHandle>(null);
  const expand = useRef<HTMLButtonElement>(null);
  const reduced = useReducedMotion();
  // It starts folded, as a help chat does, with a tip by its message box until it is opened.
  const [open, setOpen] = useState(false);
  const [opened, setOpened] = useState(false);
  const [tipClosed, setTipClosed] = useState(false);
  const unfold = () => {
    setOpen(true);
    setOpened(true);
  };
  const [messages, setMessages] = useState(opening);
  const [older, setOlder] = useState(false);
  const [asked, setAsked] = useState(0);
  const waiting = messages.at(-1)?.from === "you";
  const streaming = messages.some((message) => message.streaming);
  const reply = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(reply.current), []);

  const ask = (question: string) => {
    const answer = suggestions.find(([each]) => each === question)?.[1] ?? fallback;
    const id = `q${asked}`;
    setAsked(asked + 1);
    setMessages((current) => [...current, { id, from: "you", text: [question] }]);
    // The office answers a moment later, and the answer streams in.
    reply.current = setTimeout(
      () =>
        setMessages((current) => [
          ...current,
          { id: `${id}-reply`, from: "office", text: [answer], streaming: true },
        ]),
      700,
    );
  };
  const done = (id: string) =>
    setMessages((current) =>
      current.map((message) => (message.id === id ? { ...message, streaming: false } : message)),
    );
  // Trying again writes the answer out again.
  const retry = (id: string) =>
    setMessages((current) =>
      current.map((message) =>
        message.id === id
          ? { ...message, streaming: true, stopped: false, again: (message.again ?? 0) + 1 }
          : message,
      ),
    );
  // Stopping before the reply arrives leaves it unwritten. Stopping as it streams keeps what is
  // shown.
  const stop = () => {
    clearTimeout(reply.current);
    setMessages((current) =>
      current.map((message) =>
        message.streaming ? { ...message, streaming: false, stopped: true } : message,
      ),
    );
  };
  // When it folds down, focus goes to the line that opens it again.
  const fold = () => {
    setOpen(false);
    requestAnimationFrame(() => expand.current?.focus());
  };
  const restart = () => {
    clearTimeout(reply.current);
    setMessages([]);
    setOlder(false);
  };
  const thread = [...(older ? earlier : []), ...messages];
  const unasked = suggestions.filter(([question]) =>
    thread.every((message) => message.text[0] !== question),
  );
  const pinned = messages.length > 0;

  return (
    <div className="preview-help">
      <div className="preview-help-page">
        <h1>Renew your passport</h1>
        <p>
          It costs £94.50 to renew online. Your new passport will usually arrive within 3 weeks.
        </p>
        <p>Use the chat to ask the Passport Office about an application you have made.</p>
      </div>

      {/* Docked at the foot of the page, in the middle. The message box is always there. */}
      <section
        id={panelId}
        className="preview-help-chat"
        data-open={open || undefined}
        aria-labelledby={`${panelId}-title`}
        onKeyDown={(event) => {
          if (event.key === "Escape" && open && !event.defaultPrevented) fold();
        }}
      >
        {/* The conversation opens up out of the message box, and folds back down into it. Folded,
          it is out of reach as well as out of sight, and keeps its place in the log. */}
        <motion.div
          className="preview-help-top"
          initial={false}
          animate={{ height: open ? "auto" : 0 }}
          transition={reduced ? { duration: 0 } : { duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
          inert={!open}
          aria-hidden={!open || undefined}
        >
          <header className="preview-help-header">
            <div>
              <h2 id={`${panelId}-title`}>Passport Office</h2>
              <p>Ask about your application</p>
            </div>
            <Button
              variant="quiet"
              size="small-icon"
              aria-label="Start a new chat"
              onClick={restart}
            >
              <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
                <path
                  d="M16 10a6 6 0 1 1-1.8-4.3M16 3v3.5h-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Button>
            <Button
              variant="quiet"
              size="small-icon"
              aria-label="Fold the chat away"
              onClick={fold}
            >
              <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
                <path
                  d="m5 8 5 5 5-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Button>
          </header>
          {pinned && (
            <button
              type="button"
              className="preview-help-pinned"
              onClick={() => {
                setOlder(true);
                requestAnimationFrame(() => scroller.current?.scrollToMessage(PINNED));
              }}
            >
              <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                <path
                  d="M6 2h4l-.5 4 2.5 2.5H4L6.5 6zM8 8.5V14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="preview-help-pinned-label">Pinned</span>
              <span className="preview-help-pinned-text">
                Does my photo need a plain background?
              </span>
            </button>
          )}
          <div className="preview-help-log">
            <MessageScroller
              // Where the log opens only matters when it opens, so a new choice opens it again.
              key={defaultPosition}
              ref={scroller}
              label="Messages with the Passport Office"
              autoScroll={autoScroll}
              peek={peek}
              defaultPosition={defaultPosition}
              framed={false}
              busy={streaming}
            >
              {messages.length > 0 && (
                <MessageScrollerItem id="history">
                  {older ? (
                    <p className="preview-message-day">Last week</p>
                  ) : (
                    <div className="preview-message-day">
                      <Button variant="quiet" size="small" onClick={() => setOlder(true)}>
                        Show earlier messages
                      </Button>
                    </div>
                  )}
                </MessageScrollerItem>
              )}
              {messages.length === 0 && (
                <MessageScrollerItem id="empty">
                  <div className="preview-help-empty">
                    <p className="preview-help-empty-title">How can we help?</p>
                    <p>Choose a question, or write your own.</p>
                  </div>
                </MessageScrollerItem>
              )}
              {thread.map((message) => (
                <MessageScrollerItem
                  key={message.id}
                  id={message.id}
                  anchor={message.from === "you"}
                >
                  {message.id === "m1" && <p className="preview-message-day">Today</p>}
                  <BubbleGroup>
                    {message.text.map((text, line) => (
                      <Bubble
                        key={text}
                        variant={message.from === "you" ? "default" : "secondary"}
                        align={message.from === "you" ? "end" : "start"}
                      >
                        <BubbleContent>
                          {(message.streaming || message.stopped) &&
                          line === message.text.length - 1 ? (
                            <StreamingText
                              key={message.again ?? 0}
                              text={text}
                              stopped={message.stopped}
                              onComplete={() => done(message.id)}
                            />
                          ) : (
                            text
                          )}
                        </BubbleContent>
                      </Bubble>
                    ))}
                  </BubbleGroup>
                  {/* The office's replies can be copied, rated and requested again. */}
                  {message.from === "office" && !message.streaming && (
                    <MessageActions className="preview-help-tools">
                      <MessageCopy text={message.text.join("\n\n")} />
                      <MessageRating />
                      {/* Only a reply to a question asked here can be requested again. An
                            earlier one keeps the tool, which refuses a press. */}
                      <MessageRetry
                        onRetry={() => retry(message.id)}
                        unavailable={!message.id.endsWith("-reply") || waiting || streaming}
                      />
                    </MessageActions>
                  )}
                </MessageScrollerItem>
              ))}
              {/* Questions to choose from end the log until one is asked. The remaining ones
                    return once the answer has arrived. */}
              {unasked.length > 0 && !waiting && !streaming && (
                <MessageScrollerItem id="suggestions">
                  <MessageSuggestions>
                    {unasked.map(([question]) => (
                      <MessageSuggestion key={question} onClick={() => ask(question)}>
                        {question}
                      </MessageSuggestion>
                    ))}
                  </MessageSuggestions>
                </MessageScrollerItem>
              )}
            </MessageScroller>
          </div>
        </motion.div>
        {!open && (
          <button
            ref={expand}
            type="button"
            className="preview-help-expand"
            aria-expanded={false}
            aria-controls={panelId}
            onClick={unfold}
          >
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
              <path
                d="m4 10 4-4 4 4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {thread.length > 0 ? `${thread.length} messages` : "Chat with the Passport Office"}
          </button>
        )}
        <div className="preview-help-composer">
          <ChatInput
            label="Message the Passport Office"
            placeholder="Ask a question…"
            busy={waiting || streaming}
            onStop={stop}
            onSubmit={(text) => {
              if (!text.trim()) return;
              // Sending from the folded chat opens it, to show the answer.
              unfold();
              ask(text.trim());
            }}
            maxRows={4}
            layout="inline"
            // The docked chat is its box, so it has none of its own.
            framed={false}
          />
        </div>
      </section>
      <Callout
        anchor=".preview-help-chat"
        open={tip && !tipClosed && !opened}
        onOpenChange={(next) => setTipClosed(!next)}
        side="top"
        title="Try it"
      >
        Ask the Passport Office about your application.
      </Callout>
    </div>
  );
}
