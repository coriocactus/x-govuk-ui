"use client";

import { useEffect, useState } from "react";

/** Counts the words in a text, as GOV.UK's character count does when it counts words. */
export const countWords = (text: string) => text.match(/\S+/g)?.length ?? 0;

/** What a character count says for a number of characters or words, in another language. */
export type CharacterCountWords = {
  /** What it says about the field, such as "You can enter up to 200 characters". */
  limit: (amount: number, unit: "character" | "word") => string;
  remaining: (amount: number, unit: "character" | "word") => string;
  over: (amount: number, unit: "character" | "word") => string;
};

const plural = (amount: number, unit: "character" | "word") =>
  `${amount} ${unit}${amount === 1 ? "" : "s"}`;

/** GOV.UK's words for a character count. @internal */
export const characterCountWords: CharacterCountWords = {
  limit: (amount, unit) => `You can enter up to ${plural(amount, unit)}`,
  remaining: (amount, unit) => `You have ${plural(amount, unit)} remaining`,
  over: (amount, unit) => `You have ${plural(amount, unit)} too many`,
};

/**
 * GOV.UK's character count beneath a field. Once a share of the limit is used, it shows how many
 * characters or words are left, or how many are over. A visually hidden line gives the limit, as
 * the field's description. Screen readers hear the count once typing pauses, not at every key.
 * @internal
 */
export function CharacterCountNote({
  id,
  limit,
  count,
  unit,
  threshold,
  words = characterCountWords,
}: {
  /** The id the field is described by. */
  id: string;
  limit: number;
  count: number;
  unit: "character" | "word";
  /** The share of the limit used before the count shows, from 0 to 1. */
  threshold: number;
  /** What it says. By default, it uses GOV.UK's English words. */
  words?: CharacterCountWords;
}) {
  const left = limit - count;
  const message = left >= 0 ? words.remaining(left, unit) : words.over(-left, unit);
  const shown = !threshold || count >= limit * threshold;
  const [spoken, setSpoken] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setSpoken(shown ? message : ""), 1000);
    return () => clearTimeout(timer);
  }, [message, shown]);
  return (
    <>
      <span id={id} className="x-govuk-ui-visually-hidden">
        {words.limit(limit, unit)}
      </span>
      <p
        className="x-govuk-ui-character-count"
        aria-hidden="true"
        data-over={left < 0 || undefined}
        data-shown={shown || undefined}
      >
        {message}
      </p>
      <span className="x-govuk-ui-visually-hidden" aria-live="polite">
        {spoken}
      </span>
    </>
  );
}
