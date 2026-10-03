"use client";

import { ScrollArea as ScrollPrimitive } from "@base-ui/react/scroll-area";
import {
  type ComponentPropsWithRef,
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Button } from "./button";
import { useField } from "./field";
import { FileChip, type FileChipProps, FileChips, type FileChipsProps } from "./file-chips";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  MenuContent,
  MenuRadioGroup,
  MenuRadioItem,
} from "./menu";
import { ScrollAreaBars } from "./scroll-area";
import { Tooltip } from "./tooltip";

type ChatInputContextValue = {
  /** Adds files to the message, as ChatInputAttach does. */
  attach: (files: File[]) => void;
  /** Puts focus back in the message, such as when an attachment is removed. */
  focus: () => void;
  /** Adds words to the end of the message, as ChatInputDictation does. */
  insert: (text: string) => void;
  disabled: boolean;
};

const ChatInputContext = createContext<ChatInputContextValue | null>(null);

function useChatInput(part: string) {
  const context = useContext(ChatInputContext);
  if (!context) throw new Error(`${part} must be inside ChatInput.`);
  return context;
}

export type ChatInputProps = Omit<
  ComponentPropsWithRef<"form">,
  "defaultValue" | "onValueChange" | "onSubmit" | "onStop" | "id"
> & {
  /** Names the field for screen readers. It is not shown. */
  label?: string;
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Called with the message and any attached files when it is sent, by Enter or Send. */
  onSubmit?: (message: string, files: File[]) => void;
  /** The attached files, for a box whose files a service keeps. */
  files?: File[];
  /** The files it starts with, for a box that keeps its own. */
  defaultFiles?: File[];
  /** Called with the files as they are attached and removed, and with none once sent. */
  onFilesChange?: (files: File[]) => void;
  /**
   * What goes with the message, shown above it in place of the attached files' own chips. Give a
   * `ChatInputAttachments` list of `ChatInputAttachment`s, for the files and for anything else,
   * such as documents chosen from the service's own store.
   */
  attachments?: ReactNode;
  /** While the assistant is replying, Send becomes Stop. */
  busy?: boolean;
  onStop?: () => void;
  /** The most lines it grows to before it scrolls. */
  maxRows?: number;
  /** Tools at the start of the bar, such as `ChatInputAttach`. */
  tools?: ReactNode;
  /** Parts beside Send, such as `ChatInputModel` and `ChatInputDictation`. */
  children?: ReactNode;
  /**
   * `stacked` puts the message above a bar of tools with Send. `inline` puts the message and Send
   * on one row, one line tall until the message needs more. Use it for a compact chat with few
   * tools.
   */
  layout?: "stacked" | "inline";
  /**
   * Gives the box its own rounded edge, in Input's border. Without it, the message box takes its
   * container's edges, such as a chat panel's, and shows only GOV.UK's focus around itself.
   */
  framed?: boolean;
  disabled?: boolean;
  id?: string;
};

/**
 * What in the box handles its own presses. That is a control, or a file chip's name, which people
 * select and copy. A press anywhere else focuses the message.
 */
const PRESSABLE =
  'button, a, input, select, [role="button"], [role="menuitem"], [role="option"], [role="switch"], [role="checkbox"], [role="radio"], [role="tab"], [role="link"], [role="scrollbar"], [role="slider"], .x-govuk-ui-scroll-area-scrollbar, .x-govuk-ui-file-chip-name';

const sendIcon = (
  <svg
    viewBox="0 0 24 24"
    width="18"
    height="18"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M12 19V5m0 0-6 6m6-6 6 6" />
  </svg>
);
const stopIcon = (
  <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
    <rect x="5" y="5" width="14" height="14" rx="2" fill="currentColor" />
  </svg>
);

/**
 * Where people write to an assistant. It grows with the message, up to `maxRows` lines. Enter
 * sends, and Shift with Enter starts a new line. While the assistant replies, Send becomes Stop.
 * Send is the library's outline icon Button.
 *
 * Tools such as `ChatInputAttach` sit at the start of the bar. Parts such as `ChatInputModel` and
 * `ChatInputDictation` sit beside Send. Attached files show as chips above the message, each with a
 * button to remove it. A service can give `attachments` instead, to show the files with anything
 * else that goes with the message.
 */
export function ChatInput({
  label = "Message",
  placeholder = "Write a message…",
  value,
  defaultValue = "",
  onValueChange,
  onSubmit,
  files: givenFiles,
  defaultFiles,
  onFilesChange,
  attachments,
  busy = false,
  onStop,
  maxRows = 8,
  tools,
  children,
  layout = "stacked",
  framed = true,
  disabled = false,
  id,
  className = "",
  ...props
}: ChatInputProps) {
  const field = useField({ id });
  const [own, setOwn] = useState(defaultValue);
  const text = value ?? own;
  const area = useRef<HTMLTextAreaElement>(null);
  const [ownFiles, setOwnFiles] = useState<File[]>(defaultFiles ?? []);
  const files = givenFiles ?? ownFiles;
  // The latest files, so files attached between renders join the end of them.
  const latestFiles = useRef(files);
  latestFiles.current = files;
  const setFiles = (next: File[]) => {
    latestFiles.current = next;
    if (givenFiles === undefined) setOwnFiles(next);
    onFilesChange?.(next);
  };
  // The latest text, so words dictated between renders join the end of it.
  const latest = useRef(text);
  latest.current = text;
  const set = (next: string) => {
    latest.current = next;
    if (value === undefined) setOwn(next);
    onValueChange?.(next);
  };
  const ready = Boolean(text.trim()) || files.length > 0;
  const send = () => {
    if (busy || disabled || !ready) return;
    onSubmit?.(text.trim(), files);
    set("");
    setFiles([]);
  };
  const context: ChatInputContextValue = {
    attach: (added) => setFiles([...latestFiles.current, ...added]),
    focus: () => area.current?.focus(),
    insert: (words) => {
      const before = latest.current;
      set(before && !/\s$/.test(before) ? `${before} ${words}` : before + words);
    },
    disabled,
  };

  // The field grows with its text, a line at a time, up to its maximum number of lines.
  // biome-ignore lint/correctness/useExhaustiveDependencies: The text is what changes its height.
  useLayoutEffect(() => {
    const element = area.current;
    if (!element) return;
    element.style.height = "auto";
    const line = Number.parseFloat(getComputedStyle(element).lineHeight) || 24;
    element.style.height = `${Math.min(element.scrollHeight, line * maxRows)}px`;
  }, [text, maxRows]);

  return (
    <ChatInputContext value={context}>
      <form
        {...props}
        className={`x-govuk-ui-chat-input ${className}`.trim()}
        data-layout={layout}
        data-plain={framed ? undefined : ""}
        data-disabled={disabled || undefined}
        onSubmit={(event) => {
          event.preventDefault();
          send();
        }}
        // Pressing anywhere in the box that does not handle its own presses focuses the message, as
        // pressing a plain field would. The press's default is prevented, so focus does not go to
        // the box first. That would also stop a selection starting, so a file chip's name is left
        // to the browser.
        onPointerDown={(event) => {
          const target = event.target as Element;
          if (disabled || event.button !== 0 || target === area.current) return;
          if (target.closest(PRESSABLE)) return;
          event.preventDefault();
          area.current?.focus();
        }}
      >
        <label htmlFor={field.id} className="x-govuk-ui-visually-hidden">
          {label}
        </label>
        {attachments ??
          (files.length > 0 && (
            <ChatInputAttachments>
              {files.map((file, index) => (
                <ChatInputAttachment
                  key={`${file.name}-${file.size}-${file.lastModified}`}
                  name={file.name}
                  onRemove={() => setFiles(files.filter((_, at) => at !== index))}
                />
              ))}
            </ChatInputAttachments>
          ))}
        {/* The message scrolls with the library's own thin scrollbar, as a Scroll area does. The
            textarea is the scrolling element itself, so it keeps native editing. */}
        <ScrollPrimitive.Root className="x-govuk-ui-scroll-area x-govuk-ui-chat-input-scroll">
          {/* biome-ignore lint/a11y/useValidAriaRole: Undefined removes Base UI's role rather than setting one. */}
          <ScrollPrimitive.Viewport
            render={
              <textarea
                ref={area}
                id={field.id}
                rows={1}
                placeholder={placeholder}
                value={text}
                disabled={disabled}
                enterKeyHint="send"
                onChange={(event) => set(event.target.value)}
                onInput={(event) => {
                  // Typing can change the text's height without a scroll event, so the scrollbar
                  // is sent one.
                  event.currentTarget.dispatchEvent(new Event("scroll"));
                }}
                onKeyDown={(event) => {
                  // Enter sends, unless Shift is held or a character is still being composed.
                  if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing)
                    return;
                  event.preventDefault();
                  send();
                }}
              />
            }
            // A textarea announces itself and is always a Tab stop, unlike a scrolling box, so
            // Base UI's presentation role is removed.
            role={undefined}
            tabIndex={0}
            className="x-govuk-ui-chat-input-field"
            style={{ overflowX: "hidden", overflowY: "auto" }}
          />
          <ScrollAreaBars vertical horizontal={false} />
        </ScrollPrimitive.Root>
        <div className="x-govuk-ui-chat-input-bar">
          <div className="x-govuk-ui-chat-input-tools">{tools}</div>
          {children && <div className="x-govuk-ui-chat-input-tools">{children}</div>}
          {busy ? (
            <Button
              type="button"
              size="small-icon"
              variant="outline"
              className="x-govuk-ui-chat-input-send"
              aria-label="Stop the reply"
              onClick={onStop}
            >
              {stopIcon}
            </Button>
          ) : (
            <Button
              type="submit"
              size="small-icon"
              variant="outline"
              className="x-govuk-ui-chat-input-send"
              aria-label="Send"
              aria-disabled={!ready || disabled || undefined}
            >
              {sendIcon}
            </Button>
          )}
        </div>
      </form>
    </ChatInputContext>
  );
}

export type ChatInputAttachmentsProps = FileChipsProps;

/**
 * What goes with the message, above it, as File chips named for screen readers. By default, the
 * list is named "Attached files".
 */
export function ChatInputAttachments({
  label = "Attached files",
  className = "",
  ...props
}: ChatInputAttachmentsProps) {
  useChatInput("ChatInputAttachments");
  return (
    <FileChips
      label={label}
      {...props}
      className={`x-govuk-ui-chat-input-attachments ${className}`.trim()}
    />
  );
}

export type ChatInputAttachmentProps = FileChipProps;

/**
 * One thing that goes with the message, such as an attached file or a chosen document, as a File
 * chip. Removing it puts focus back in the message, because the chip and its button are gone. The
 * attached files' own chips are ChatInputAttachment parts too.
 */
export function ChatInputAttachment({
  onRemove,
  className = "",
  ...props
}: ChatInputAttachmentProps) {
  const { focus } = useChatInput("ChatInputAttachment");
  return (
    <FileChip
      {...props}
      className={`x-govuk-ui-chat-input-attachment ${className}`.trim()}
      onRemove={
        onRemove &&
        (() => {
          onRemove();
          focus();
        })
      }
    />
  );
}

export type ChatInputAttachProps = ComponentPropsWithRef<"button"> & {
  /** The kinds of file to offer, as the file input's accept attribute, such as "image/*,.pdf". */
  accept?: string;
  multiple?: boolean;
  /** Names the button, and shows in its tooltip. */
  label?: string;
};

/**
 * Attaches files to the message, from a quiet icon Button with a tooltip that opens the browser's
 * file picker. Each file shows as a chip above the message, and is sent with it.
 */
export function ChatInputAttach({
  accept,
  multiple = true,
  label = "Attach a file",
  className = "",
  ...props
}: ChatInputAttachProps) {
  const { attach, disabled } = useChatInput("ChatInputAttach");
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={input}
        type="file"
        className="x-govuk-ui-visually-hidden"
        accept={accept}
        multiple={multiple}
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          attach([...(event.target.files ?? [])]);
          // The same file can be chosen again after it is removed.
          event.target.value = "";
        }}
      />
      <Tooltip content={label}>
        <Button
          {...props}
          variant="quiet"
          className={`x-govuk-ui-chat-input-attach ${className}`.trim()}
          size="small-icon"
          aria-label={label}
          disabled={disabled}
          onClick={() => input.current?.click()}
        >
          <svg
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="m20 11-8.5 8.5a5 5 0 0 1-7-7L13 4a3.3 3.3 0 0 1 4.7 4.7L9.2 17.2a1.7 1.7 0 0 1-2.4-2.4L14.5 7" />
          </svg>
        </Button>
      </Tooltip>
    </>
  );
}

type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult:
    | ((event: {
        resultIndex: number;
        results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
      }) => void)
    | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

/** The browser's speech recognition, where it has one. */
function speechRecognition() {
  const speech = globalThis as unknown as {
    SpeechRecognition?: new () => Recognition;
    webkitSpeechRecognition?: new () => Recognition;
  };
  return speech.SpeechRecognition ?? speech.webkitSpeechRecognition;
}

/**
 * What turns speech into words for ChatInputDictation. It is the browser's own recogniser, or a
 * service's, such as one that sends the audio to the service's own transcription.
 */
export type DictationRecogniser = {
  /** Whether it can listen here. It is called only in the browser, after the first render. */
  available?: () => boolean;
  /**
   * Starts listening in the language given. Each phrase heard goes to `onPhrase`. `onEnd` is called
   * once, when listening stops by itself, on an error, or when stopped. Returns a function that
   * stops it.
   */
  start: (
    options: { lang: string },
    handlers: { onPhrase: (text: string) => void; onEnd: () => void },
  ) => () => void;
};

/**
 * The browser's own speech recognition, where it has one. Chrome sends the audio to Google to be
 * recognised, which a department's data rules may not allow. Give such a service a recogniser of
 * its own.
 */
export const browserRecogniser: DictationRecogniser = {
  available: () => Boolean(speechRecognition()),
  start: ({ lang }, { onPhrase, onEnd }) => {
    const Speech = speechRecognition();
    if (!Speech) {
      onEnd();
      return () => {};
    }
    const listener = new Speech();
    listener.lang = lang;
    listener.continuous = true;
    listener.interimResults = false;
    listener.onresult = (event) => {
      for (let index = event.resultIndex; index < event.results.length; index++) {
        const result = event.results[index];
        if (result?.isFinal) onPhrase(result[0].transcript.trim());
      }
    };
    listener.onend = onEnd;
    listener.onerror = onEnd;
    listener.start();
    return () => listener.stop();
  },
};

export type ChatInputDictationProps = Omit<ComponentPropsWithRef<"button">, "lang"> & {
  /** The language spoken, such as "cy" for Welsh. By default, the page's language. */
  lang?: string;
  /** What turns the speech into words. By default, the browser's own recogniser. */
  recogniser?: DictationRecogniser;
  /** Classes for the button. */
  className?: string;
};

/**
 * Dictates the message, with the browser's own speech recognition or a service's own recogniser.
 * It is a quiet icon Button that turns brand blue and pulses while it listens. Each phrase joins
 * the end of the message. Where the recogniser cannot listen, such as the browser's own in Firefox,
 * the button is unavailable, and its tooltip says so.
 */
export function ChatInputDictation({
  lang,
  recogniser = browserRecogniser,
  className = "",
  ...props
}: ChatInputDictationProps) {
  const { insert, disabled } = useChatInput("ChatInputDictation");
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const stop = useRef<(() => void) | null>(null);
  const insertLatest = useRef(insert);
  insertLatest.current = insert;
  // Whether it can listen is known only in the browser, so the server renders it unavailable.
  useEffect(() => setSupported(recogniser.available?.() ?? true), [recogniser]);
  useEffect(() => () => stop.current?.(), []);
  let label = listening ? "Stop dictating" : "Dictate";
  if (!supported)
    label =
      recogniser === browserRecogniser
        ? "Dictation is not available in this browser"
        : "Dictation is not available";
  const toggle = () => {
    if (listening) {
      stop.current?.();
      return;
    }
    // Listening is set first, because a recogniser that cannot start ends at once, and its end
    // undoes this.
    setListening(true);
    stop.current = recogniser.start(
      { lang: lang ?? (document.documentElement.lang || "en-GB") },
      {
        onPhrase: (text) => insertLatest.current(text),
        onEnd: () => {
          stop.current = null;
          setListening(false);
        },
      },
    );
  };
  return (
    <Tooltip content={label}>
      <Button
        {...props}
        variant="quiet"
        size="small-icon"
        className={`x-govuk-ui-chat-input-dictation ${className}`.trim()}
        aria-label={label}
        aria-pressed={supported ? listening : undefined}
        aria-disabled={!supported || disabled || undefined}
        data-listening={listening || undefined}
        onClick={() => supported && !disabled && toggle()}
      >
        <svg
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <rect x="9" y="3" width="6" height="11" rx="3" />
          <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" />
        </svg>
      </Button>
    </Tooltip>
  );
}

export type ChatInputModelOption = {
  value: string;
  label: string;
  /** A few words on what the model is for, such as "Fastest, for quick answers". */
  description?: ReactNode;
  icon?: ReactNode;
};

export type ChatInputModelProps = Omit<
  ComponentPropsWithRef<"button">,
  "value" | "defaultValue" | "onValueChange"
> & {
  models: readonly ChatInputModelOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** What the choice is, for screen readers, before the chosen model's name. */
  label?: string;
  /** Classes for the menu's button. */
  className?: string;
};

/**
 * Chooses the model that answers, beside Send. It is a quiet Dropdown menu that shows the chosen
 * model's name. Each model in the menu has its icon, its name and a few words on what it is for. A
 * tick marks the chosen model. Choosing a model closes the menu.
 */
export function ChatInputModel({
  models,
  value,
  defaultValue,
  onValueChange,
  label = "Model",
  className = "",
  ...props
}: ChatInputModelProps) {
  const [own, setOwn] = useState(defaultValue ?? models[0]?.value ?? "");
  const chosen = value ?? own;
  const current = models.find((model) => model.value === chosen) ?? models[0];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        {...props}
        variant="quiet"
        size="small"
        className={`x-govuk-ui-chat-model-trigger ${className}`.trim()}
      >
        <span className="x-govuk-ui-visually-hidden">{label}: </span>
        {current?.label}
      </DropdownMenuTrigger>
      <MenuContent align="end" className="x-govuk-ui-chat-model-menu">
        <MenuRadioGroup
          value={chosen}
          onValueChange={(next) => {
            if (value === undefined) setOwn(next);
            onValueChange?.(next);
          }}
        >
          {models.map((model) => (
            <MenuRadioItem key={model.value} value={model.value} icon={model.icon} closeOnClick>
              <span className="x-govuk-ui-chat-model">
                <span className="x-govuk-ui-chat-model-name">{model.label}</span>
                {model.description && (
                  <span className="x-govuk-ui-chat-model-description">{model.description}</span>
                )}
              </span>
            </MenuRadioItem>
          ))}
        </MenuRadioGroup>
      </MenuContent>
    </DropdownMenu>
  );
}
