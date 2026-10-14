/*
 * The parts that the conventions treat apart, each with its reason. The type check,
 * `conventions.ts`, and the unit test of what each part passes on, `tests/unit/composition.test.tsx`,
 * read the same lists. The type check fails on a name that no package exports, so a list cannot
 * keep a part that has gone.
 */

/**
 * Roots and providers, which render nothing of their own, or only through their parts. Every other
 * part takes `className`, for its element.
 */
export const elementless = [
  "SoundScope",
  "LabelsProvider",
  "ShownProvider",
  "Callout",
  "Popover",
  "HoverCard",
  "Sheet",
  "Dialog",
  "Tooltip",
  "TooltipProvider",
  "TooltipGroup",
  "DropdownMenu",
  "ContextMenu",
  "MenuSubmenu",
  "SidebarProvider",
  "TilesProvider",
  "ToastProvider",
  "CommandMenu",
  "CommandMenuPage",
  "BubbleReactionPicker",
  "EditorAI",
  "EditorRoot",
  "FieldBinding",
  "FormStepsProvider",
] as const;

/**
 * Parts whose props describe what their group draws, rather than an element of their own. A
 * TourStep's class goes on the Tour's card, and an entry's menu is a whole DropdownMenu. Every
 * other part that renders an element passes its `ref` to it.
 */
export const described = ["TourStep", "SidebarItemMenu"] as const;

/**
 * Parts that take no `style`, because what they are built on sets it. input-otp sets the style of
 * its input and of its row of slots. Every other part that renders an element keeps a service's
 * style beside its own.
 */
export const unstyled = ["InputOTP", "InputOTPControl"] as const;

/**
 * Parts whose box holds a control of its own, such as Combobox's box around its input and buttons,
 * or FormSteps' section around its form. Their `className` and `style` go on the box, which is what
 * users see. Every other prop, including `ref`, goes on the control. Each says so in its JSDoc.
 * Every other part gives all it is given to one element.
 */
export const boxed = [
  "FormSteps",
  "QuestionCard",
  "Combobox",
  "ComboboxControl",
  "MultiSelect",
  "MultiSelectControl",
  "FileUpload",
  "FileUploadControl",
  "SidebarInput",
] as const;

/**
 * Links to a place on the same page, or away from the service, which no router follows. FormSteps'
 * Back goes to the step before, on the same page. Every other part that renders a link takes
 * `render`, for a router's link.
 */
export const notRouted = ["SkipLink", "ErrorSummaryItem", "ExitThisPage", "FormStepsBack"] as const;

/**
 * Parts that render on the server, where no LabelsProvider reaches, so their words are their own,
 * by the prop that gives them. Stat takes a map of its own, the charts set alone take the charts'
 * words, and Header names its logo with `logoLabel`. The LabelsProvider takes every map.
 */
export const ownWords = {
  Stat: "labels",
  BarList: "labels",
  BulletChart: "labels",
  Sparkline: "labels",
  Waffle: "labels",
  Header: "logoLabel",
  LabelsProvider: "labels",
} as const;

/**
 * Parts that report a value another part keeps, by the name of the value. An Accordion's `value`
 * keeps which items are open. A context menu opens where it is pressed, so a service can only
 * hear that it opened.
 */
export const reportedBy = { AccordionItem: "Open", ContextMenu: "Open" } as const;

/**
 * Parts that no example shows with an element as it first renders, so the composition test,
 * `tests/unit/composition.test.tsx`, cannot see what they do with a service's class, data and
 * style. The type check still checks that each takes them. The test fails when a part is neither
 * checked nor listed here, and when a listed part comes to be checked, so the list stays true.
 */
export const unchecked = {
  /** They show only in a popup, which is closed as the page loads. */
  "in a closed popup": [
    "Calendar",
    "CalloutClose",
    "CalloutContent",
    "CommandMenuBestMatches",
    "CommandMenuClose",
    "CommandMenuContent",
    "CommandMenuGroup",
    "CommandMenuItem",
    "DialogClose",
    "DialogContent",
    "DialogDescription",
    "DialogTitle",
    "EditorAIAction",
    "EditorAIAsk",
    "EditorAIPrompt",
    "EditorAISeparator",
    "EditorAISuggestion",
    "EditorAIToolbar",
    "EditorAITools",
    "EditorAttachmentTools",
    "EditorCodeLanguage",
    "EditorLinkTools",
    "EditorPrompt",
    "EditorTableTools",
    "HoverCardContent",
    "MenuCheckboxItem",
    "MenuContent",
    "MenuGroup",
    "MenuHeader",
    "MenuItem",
    "MenuLinkItem",
    "MenuRadioGroup",
    "MenuRadioItem",
    "MenuSeparator",
    "NavigationMenuContent",
    "PopoverClose",
    "PopoverContent",
    "PopoverDescription",
    "PopoverTitle",
    "SelectItem",
    "SheetClose",
    "SheetContent",
    "SheetDescription",
    "SheetTitle",
    "SidebarCustomise",
    "Tour",
  ],
  /**
   * They show once users act, such as sending a message, attaching a file, pointing at a chart's
   * figures or choosing words in the Editor.
   */
  "after users act": [
    "ChartCard",
    "ChatInputAttachment",
    "ChatInputAttachments",
    "ConversationActions",
    "ConversationContent",
    "ConversationCopy",
    "ConversationMessage",
    "ConversationNote",
    "ConversationThinking",
    "EditorTool",
    "EditorTools",
    "TilesDockItem",
  ],
  /** They show under another of their example's settings, or on a narrow screen. */
  "under another setting": [
    "ChartBrush",
    "FormStepsBack",
    "FormStepsProgress",
    "FormStepsSummary",
    "SidebarSkeleton",
    "TilePager",
  ],
} as const;
