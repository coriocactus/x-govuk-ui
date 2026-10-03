import { SugarHigh, tokenize } from "sugar-high/core";
import { languages } from "sugar-high/lang";

/** A run of code, and the kind of token it is, such as "keyword", or null for plain text. */
export type CodeToken = [kind: string | null, text: string];

// Plain tokens stay as text, so only coloured runs need an element.
const plain = new Set(["identifier", "space", "break", "jsxliterals"]);

function findLanguage(name: string) {
  const wanted = name.trim().toLowerCase().replace(/^\./, "");
  return languages.find(
    (language) =>
      language.id === wanted || language.extension === wanted || language.aliases.includes(wanted),
  );
}

/**
 * sugar-high's name for the language that a name, alias or file extension refers to, such as
 * "typescript" for "ts". It is undefined for a language that sugar-high does not colour.
 * @internal
 */
export function codeLanguage(name: string | null | undefined) {
  return name ? findLanguage(name)?.id : undefined;
}

/** Every language sugar-high colours, by sugar-high's name for it. @internal */
export const codeLanguages: readonly string[] = languages.map((language) => language.id);

/**
 * Code split into runs by sugar-high, each with its kind of token. The language is given by name,
 * alias or file extension. Code in a language sugar-high does not know is one plain run. Code
 * block, File diff, the Editor and Rich text all colour code with it, so code looks the same
 * wherever it is. Each run's class is `x-govuk-ui-code-` followed by its kind.
 * @internal
 */
export function codeTokens(code: string, language: string | null | undefined): CodeToken[] {
  const config = language ? findLanguage(language)?.config : undefined;
  if (!config) return [[null, code]];
  return tokenize(code, config).map(([type, text]) => {
    const kind = SugarHigh.TokenTypes[type] ?? "identifier";
    return [plain.has(kind) ? null : kind, text];
  });
}
