import { useRef, useState } from "react";
import {
  Bubble,
  BubbleContent,
  BubbleGroup,
  type BubbleReaction,
  BubbleReactionPicker,
  BubbleReactions,
  type BubbleVariant,
} from "x-govuk-ui";

type Props = { variant?: BubbleVariant };

const reactions: BubbleReaction[] = [
  { emoji: "👍", label: "thumbs up" },
  { emoji: "❤️", label: "heart" },
  { emoji: "😂", label: "laughing" },
  { emoji: "😮", label: "surprised" },
  { emoji: "🙏", label: "thank you" },
];

const messages = [
  { id: "received", from: "office", text: "We have received your application." },
  { id: "write", from: "office", text: "We will write to you within 3 weeks." },
  { id: "travel", from: "you", text: "Thanks. Can I still travel on my old passport?" },
  { id: "fly", from: "you", text: "I fly on 12 April." },
  { id: "valid", from: "office", text: "Yes, if it is still valid on the day you travel." },
  { id: "pass", from: "you", text: "Here is my boarding pass." },
] as const;

/**
 * A short exchange with the Passport Office. The office's bubbles are secondary, and the user's
 * take the chosen variant. Hold any message to react to it. Press the message that failed to send
 * it again, after which it can take reactions too.
 */
export default function BubbleExample({ variant = "default" }: Props) {
  const [reacted, setReacted] = useState<Record<string, string[]>>({ valid: ["👍"] });
  const [sent, setSent] = useState(false);
  // The sent message is no longer a button, so focus moves to its status, which says it arrived.
  const status = useRef<HTMLParagraphElement>(null);

  const bubble = ({ id, from, text }: (typeof messages)[number]) => {
    const chosen = reacted[id] ?? [];
    const shown = reactions.filter((reaction) => chosen.includes(reaction.emoji));
    return (
      <Bubble
        key={id}
        variant={from === "you" ? variant : "secondary"}
        align={from === "you" ? "end" : "start"}
      >
        <BubbleContent>{text}</BubbleContent>
        <BubbleReactions
          align={from === "you" ? "start" : "end"}
          {...(shown.length
            ? {
                role: "img",
                "aria-label": `Reactions: ${shown.map((reaction) => reaction.label).join(", ")}`,
              }
            : { "aria-hidden": true })}
        >
          {shown.map((reaction) => (
            <span key={reaction.emoji}>{reaction.emoji}</span>
          ))}
        </BubbleReactions>
        <BubbleReactionPicker
          options={reactions}
          value={chosen}
          onValueChange={(next) => setReacted((current) => ({ ...current, [id]: next }))}
        />
      </Bubble>
    );
  };

  return (
    <div className="preview-bubbles">
      <BubbleGroup>{messages.slice(0, 2).map(bubble)}</BubbleGroup>
      <BubbleGroup>{messages.slice(2, 4).map(bubble)}</BubbleGroup>
      {bubble(messages[4])}
      <div>
        {sent ? (
          bubble(messages[5])
        ) : (
          <Bubble variant="destructive" align="end">
            <BubbleContent
              render={
                <button
                  type="button"
                  onClick={() => {
                    setSent(true);
                    requestAnimationFrame(() => status.current?.focus());
                  }}
                />
              }
              aria-describedby="boarding-pass-status"
            >
              Here is my boarding pass.
            </BubbleContent>
          </Bubble>
        )}
        <p
          ref={status}
          tabIndex={-1}
          id="boarding-pass-status"
          className="preview-bubble-status"
          role="status"
          data-success={sent ? "" : undefined}
        >
          {sent ? "Delivered" : "Not sent. Press the message to send it again."}
        </p>
      </div>
      <p className="preview-bubble-hint">Hold a message to react to it.</p>
    </div>
  );
}
