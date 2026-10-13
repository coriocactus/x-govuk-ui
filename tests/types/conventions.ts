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

/**
 * Roots and providers, which render nothing of their own, or only through their parts. Every other
 * part takes `className`, for its element.
 */
type Elementless =
  | "SoundScope"
  | "LabelsProvider"
  | "ShownProvider"
  | "Callout"
  | "Popover"
  | "HoverCard"
  | "Sheet"
  | "Dialog"
  | "Tooltip"
  | "TooltipProvider"
  | "TooltipGroup"
  | "DropdownMenu"
  | "ContextMenu"
  | "MenuSubmenu"
  | "SidebarProvider"
  | "TilesProvider"
  | "ToastProvider"
  | "CommandMenu"
  | "CommandMenuPage"
  | "BubbleReactionPicker"
  | "ScrollAreaBars"
  | "EditorAI"
  | "EditorRoot";

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
 * as a chart's column, or is a choice about a label. Header renders on the server, where no
 * LabelsProvider reaches, so it names its logo itself.
 */
type NotWords = "hideLabel" | "categoryLabel" | "nameLabel" | "valueLabel" | "scrollLabel";

export type WordsOutsideLabels = None<
  {
    [Name in keyof Components]: Exclude<
      Extract<keyof PropsOf<Name>, `${Lowercase<string>}${string}Label`>,
      NotWords | (Name extends "Header" ? "logoLabel" : never)
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

/**
 * Handlers that report what users do, which the part does not keep, need no value. Every other
 * `on…Change` has the value it reports, which a service can control, and a default to start it.
 */
type Reported = "Dragging" | "Share" | "Page" | "Files" | "Code" | "Checked";

/**
 * Parts that report a value another part keeps. An Accordion's `value` keeps which items are open.
 * A context menu opens where it is pressed, so a service can only hear that it opened.
 */
type ReportedBy = { AccordionItem: "Open"; ContextMenu: "Open" };

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

/**
 * Parts whose props describe what their group draws, rather than an element of their own. A
 * TourStep's class goes on the Tour's card, a FormStep's on the fieldset FormSteps draws for it,
 * and an entry's menu is a whole DropdownMenu. Every other part that renders an element passes its
 * `ref` to it.
 */
type Described = "TourStep" | "FormStep" | "SidebarItemMenu";

export type WithoutRef = None<
  {
    [Name in Exclude<keyof Components, Elementless | Described>]: "ref" extends keyof PropsOf<Name>
      ? never
      : Name;
  }[Exclude<keyof Components, Elementless | Described>]
>;
