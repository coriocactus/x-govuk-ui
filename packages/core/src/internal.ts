/**
 * What x-govuk-ui's own extension packages, jorjorwel, memetics and belsize, build on that is not
 * for services. These are parts and helpers shared inside the library, whose API may change in any
 * release.
 * @internal
 */
export { AutoHeight, type AutoHeightProps } from "./auto-height";
export {
  CharacterCountNote,
  type CharacterCountWords,
  characterCountWords,
  countWords,
} from "./character-count";
export { type CodeToken, codeLanguage, codeLanguages, codeTokens } from "./code-tokens";
export { trackHighlight } from "./highlight";
export { type HtmlNode, parseHtmlTree, safeAddress, treeText, treeToDom } from "./html-tree";
export { useMediaQuery } from "./media-query";
export { duration } from "./motion";
export { Orb } from "./orb";
export { useMergedRef } from "./refs";
export { renderTree } from "./rich-text";
export { ScrollAreaBars } from "./scroll-area";
export { type SoundVoice, soundFamilies, voicesOf } from "./sound";
export { useStoredState } from "./stored-state";
