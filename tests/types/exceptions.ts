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
  "SidePanelProvider",
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
 * FormSteps' section around its form, or Timeline's box around its list and its TimelineMore. Their
 * `className` and `style` go on the box, which is what users see. Every other prop, including
 * `ref`, goes on the control. Each says so in its JSDoc. Every other part gives all it is given to
 * one element.
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
  "Timeline",
] as const;

/**
 * Parts that may set space outside their own box, each with its reason. The sweep,
 * `tests/browser/sweep.spec.ts`, fails on any other part with a margin above or below of its own,
 * because the box a part sits in sets the space around it.
 */
export const spaced = {
  Separator:
    "Its `spacing` asks for space above and below it, as GOV.UK's section break does. A vertical one is inset a little from the top and foot of its row.",
  Label: "It keeps GOV.UK's space beneath it, above the control it names, in any field.",
  Hint: "It keeps GOV.UK's space beneath it, above the control it describes, in any field.",
} as const;

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

/**
 * What scrolls with the browser's own scrolling, by the rule or the file that makes it scroll,
 * with the reason. Everything else that scrolls does so in a Scroll area, or a part built on one,
 * such as SidePanelBody, so every scrollbar is the same thin bar in every browser.
 * `tests/unit/invariants.test.tsx` fails on a rule that scrolls and is listed in neither list, and
 * on a listed one that no longer scrolls, so the lists stay true.
 */
export const nativeScroll = {
  "packages/core/src/scroll-area.tsx": "It is the Scroll area, whose viewport scrolls natively.",
  "packages/core/src/textarea.tsx":
    "A field scrolls its own box, so typing and the caret behave as the browser's, under the Scroll area's bars.",
  "packages/core/src/chat-input.tsx":
    "A field scrolls its own box, so typing and the caret behave as the browser's, under the Scroll area's bars.",
  "packages/jorjorwel/src/editor-content.tsx":
    "A field scrolls its own box, so typing and the caret behave as the browser's, under the Scroll area's bars.",
  "packages/core/src/styles/carousel.css: .x-govuk-ui-carousel-viewport":
    "The slides snap as they scroll and are moved by their own buttons, with no scrollbar.",
  "packages/core/src/styles/prose.css: :where(.x-govuk-ui-prose) pre":
    "Markdown draws it as HTML, not React, so no part can wrap it.",
  "packages/core/src/styles/prose.css: .x-govuk-ui-rich-text-table":
    "Markdown draws it as HTML, not React, so no part can wrap it.",
  "packages/jorjorwel/src/styles/editor.css: .x-govuk-ui-prose .x-govuk-ui-editor-code":
    "Lexical draws and owns its elements, so no part can wrap them.",
  "packages/jorjorwel/src/styles/editor.css: .x-govuk-ui-editor-table":
    "Lexical draws and owns its elements, so no part can wrap them.",
} as const;

/**
 * What still scrolls with the browser's own scrolling, and is to move into a Scroll area. Each
 * leaves this list as it moves.
 */
export const toScrollArea = [
  "packages/core/src/styles/menu.css: .x-govuk-ui-menu",
  "packages/core/src/styles/select.css: .x-govuk-ui-select-popup",
  "packages/core/src/styles/navigation-menu.css: .x-govuk-ui-navigation-menu-content",
  "packages/core/src/styles/sheet.css: .x-govuk-ui-sheet",
  "packages/core/src/styles/dialog.css: .x-govuk-ui-dialog-viewport",
  "packages/core/src/styles/tabs.css: .x-govuk-ui-tabs-list",
  "packages/belsize/src/styles/tiles.css: .x-govuk-ui-tiles-empty",
  "site/workbench.css: .home",
] as const;
