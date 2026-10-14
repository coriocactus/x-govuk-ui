/*
 * The library's conventions for props, checked against each package's exported types, as a service
 * meets them. `bun run typecheck` checks this file. A part that breaks a convention makes one of the
 * checks below fail, and the error names the part and the prop.
 *
 * Each check reads a component's whole props type, with every prop it inherits, such as those of
 * the element it renders.
 */

import type * as Belsize from "@x-govuk-ui/belsize";
import type * as Jorjorwel from "@x-govuk-ui/jorjorwel";
import type * as Memetics from "@x-govuk-ui/memetics";
import type { ComponentProps, DOMAttributes, JSXElementConstructor } from "react";
import type * as Core from "x-govuk-ui";
import type { ComponentLabels } from "x-govuk-ui";
import type {
  boxed,
  described,
  elementless,
  notRouted,
  ownWords,
  reportedBy,
  unchecked,
  unstyled,
} from "./exceptions";

type Exports = typeof Core & typeof Jorjorwel & typeof Memetics & typeof Belsize;

type Capital = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I" | "J" | "K" | "L" | "M";
type Capitals =
  | Capital
  | "N"
  | "O"
  | "P"
  | "Q"
  | "R"
  | "S"
  | "T"
  | "U"
  | "V"
  | "W"
  | "X"
  | "Y"
  | "Z";

/** Every exported component, by name. A component's name starts with a capital letter. */
type Components = {
  [Name in keyof Exports as Name extends `${Capitals}${string}`
    ? // biome-ignore lint/suspicious/noExplicitAny: a component of any props.
      Exports[Name] extends JSXElementConstructor<any>
      ? Name
      : never
    : never]: Exports[Name];
};

/** A component's props, every one optional, so each name can be looked up. */
type PropsOf<Name extends keyof Components> = Required<ComponentProps<Components[Name]>>;

/** Fails to compile unless `T` is `never`. The error shows `T`, which names what is wrong. */
type None<T extends never> = T;

type Elementless = (typeof elementless)[number];
type Described = (typeof described)[number];
type Unstyled = (typeof unstyled)[number];
type Boxed = (typeof boxed)[number];
type NotRouted = (typeof notRouted)[number];
type OwnWords = typeof ownWords;
type ReportedBy = typeof reportedBy;
type Unchecked = (typeof unchecked)[keyof typeof unchecked][number];

/** Every name the exceptions list is a part that a package exports. */
export type UnknownExceptions = None<
  Exclude<
    | Elementless
    | Described
    | Unstyled
    | Boxed
    | NotRouted
    | Unchecked
    | keyof OwnWords
    | keyof ReportedBy,
    keyof Components
  >
>;

export type WithoutClassName = None<
  {
    [Name in Exclude<keyof Components, Elementless>]: "className" extends keyof PropsOf<Name>
      ? never
      : Name;
  }[Exclude<keyof Components, Elementless>]
>;

/** Names that say an idea another prop already names. Each points to the name to use. */
type Retired = {
  isActive: "current";
  showLabel: "hideLabel";
  small: 'size: "small"';
  hotkey: "keyboardShortcut";
  emptyText: "labels.empty";
  emptyLabel: "labels.empty";
  shortcuts: "shortcutScope";
};

export type RetiredNames = None<
  {
    [Name in keyof Components]: Extract<keyof PropsOf<Name>, keyof Retired> extends never
      ? never
      : `${Name}: ${Extract<keyof PropsOf<Name>, keyof Retired> & string}`;
  }[keyof Components]
>;

/**
 * A component's words are its `labels`. A prop ending in Label names data of a service's own, such
 * as a chart's column, or is a choice about a label.
 */
type NotWords = "hideLabel" | "categoryLabel" | "nameLabel" | "valueLabel" | "scrollLabel";

/** The prop a part that keeps its own words names them with. */
type OwnWordsOf<Name> = Name extends keyof OwnWords ? OwnWords[Name] : never;

export type WordsOutsideLabels = None<
  {
    [Name in keyof Components]: Exclude<
      Extract<keyof PropsOf<Name>, `${Lowercase<string>}${string}Label`>,
      NotWords | OwnWordsOf<Name>
    > extends never
      ? never
      : `${Name}: ${Exclude<Extract<keyof PropsOf<Name>, `${string}Label`>, NotWords> & string}`;
  }[keyof Components]
>;

export type HideLabelIsBoolean = None<
  {
    [Name in keyof Components]: "hideLabel" extends keyof PropsOf<Name>
      ? PropsOf<Name>["hideLabel" & keyof PropsOf<Name>] extends boolean | undefined
        ? never
        : Name
      : never;
  }[keyof Components]
>;

/** A map of words is an object, never a string. */
export type LabelsAreMaps = None<
  {
    [Name in keyof Components]: "labels" extends keyof PropsOf<Name>
      ? PropsOf<Name>["labels" & keyof PropsOf<Name>] extends object | undefined
        ? never
        : Name
      : never;
  }[keyof Components]
>;

/** Each map of words has its English defaults exported under its key, as `defaultPaginationLabels`. */
export type DefaultsNamedByKey = None<
  {
    [Key in keyof ComponentLabels & string]: `default${Capitalize<Key>}Labels` extends keyof Exports
      ? Exports[`default${Capitalize<Key>}Labels`] extends ComponentLabels[Key]
        ? never
        : `default${Capitalize<Key>}Labels`
      : `default${Capitalize<Key>}Labels`;
  }[keyof ComponentLabels & string]
>;

/** A component's words, without a chart's own `locale`, which is no word. */
type WordsOf<Name extends keyof Components> = Omit<
  NonNullable<PropsOf<Name>["labels" & keyof PropsOf<Name>]>,
  "locale"
>;

/** The provider's map that has every word a component's `labels` take, if one does. */
type MapOf<Words> = {
  [Key in keyof ComponentLabels]: [keyof Words] extends [keyof ComponentLabels[Key]]
    ? [Words] extends [Partial<ComponentLabels[Key]>]
      ? Key
      : never
    : never;
}[keyof ComponentLabels];

/** Every word a component takes in `labels`, a LabelsProvider can give it too. */
export type LabelsOutsideProvider = None<
  {
    [Name in Exclude<keyof Components, keyof OwnWords>]: "labels" extends keyof PropsOf<Name>
      ? [MapOf<WordsOf<Name>>] extends [never]
        ? Name
        : never
      : never;
  }[Exclude<keyof Components, keyof OwnWords>]
>;

/**
 * Handlers that report what users do, which the part does not keep, need no value. Every other
 * `on…Change` has the value it reports, which a service can control, and a default to start it.
 */
type Reported = "Dragging" | "Share" | "Page" | "Code" | "Checked";

type Uncontrolled<Props, Also extends string = never> = {
  // The element's own events, such as a video's `onDurationChange`, are the DOM's.
  [Key in Exclude<keyof Props, keyof DOMAttributes<Element>>]: Key extends `on${infer Thing}Change`
    ? Thing extends Reported | Also | ""
      ? never
      : Uncapitalize<Thing> extends keyof Props
        ? `default${Thing}` extends keyof Props
          ? never
          : `default${Thing}`
        : Uncapitalize<Thing>
    : never;
}[Exclude<keyof Props, keyof DOMAttributes<Element>>];

export type ControlledWithDefaults = None<
  {
    [Name in keyof Components]: Uncontrolled<
      PropsOf<Name>,
      Name extends keyof ReportedBy ? ReportedBy[Name] : never
    > extends never
      ? never
      : `${Name}: ${Uncontrolled<PropsOf<Name>> & string}`;
  }[keyof Components]
>;

/** Motion's own props never reach a part's type, which is an element's. */
type MotionOnly = "whileHover" | "whileTap" | "layoutId" | "variants" | "transition";

export type MotionPropsHidden = None<
  {
    [Name in keyof Components]: Extract<keyof PropsOf<Name>, MotionOnly> extends never
      ? never
      : `${Name}: ${Extract<keyof PropsOf<Name>, MotionOnly> & string}`;
  }[keyof Components]
>;

export type WithoutRef = None<
  {
    [Name in Exclude<keyof Components, Elementless | Described>]: "ref" extends keyof PropsOf<Name>
      ? never
      : Name;
  }[Exclude<keyof Components, Elementless | Described>]
>;

export type WithoutStyle = None<
  {
    [Name in Exclude<
      keyof Components,
      Elementless | Described | Unstyled
    >]: "style" extends keyof PropsOf<Name> ? never : Name;
  }[Exclude<keyof Components, Elementless | Described | Unstyled>]
>;

/** A part that loses a style says so, by taking none. */
export type StyleTakenAndLost = None<
  { [Name in Unstyled]: "style" extends keyof PropsOf<Name> ? Name : never }[Unstyled]
>;

/** A part that keeps something under a `storageKey` takes `storage`, where it keeps it. */
export type StorageKeyWithoutStorage = None<
  {
    [Name in keyof Components]: "storageKey" extends keyof PropsOf<Name>
      ? "storage" extends keyof PropsOf<Name>
        ? never
        : Name
      : never;
  }[keyof Components]
>;

/** A part that renders a link takes an `href`. An SVG's `href` is no link, and an SVG has a `viewBox`. */
export type LinkWithoutRender = None<
  {
    [Name in Exclude<keyof Components, NotRouted>]: "href" extends keyof PropsOf<Name>
      ? "viewBox" extends keyof PropsOf<Name>
        ? never
        : "render" extends keyof PropsOf<Name>
          ? never
          : Name
      : never;
  }[Exclude<keyof Components, NotRouted>]
>;
