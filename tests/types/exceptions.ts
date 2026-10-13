/*
 * The parts that the conventions treat apart, each with its reason. The type check,
 * `conventions.ts`, and the unit test of what each part passes on, `tests/unit/composition.test.tsx`,
 * read the same lists.
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
  "ScrollAreaBars",
  "EditorAI",
  "EditorRoot",
  "FieldBinding",
] as const;

/**
 * Parts whose props describe what their group draws, rather than an element of their own. A
 * TourStep's class goes on the Tour's card, a FormStep's on the fieldset FormSteps draws for it,
 * and an entry's menu is a whole DropdownMenu. Every other part that renders an element passes its
 * `ref` to it.
 */
export const described = ["TourStep", "FormStep", "SidebarItemMenu"] as const;

/**
 * Parts that take no `style`, because what they are built on sets it. input-otp sets the style of
 * its input and of its row of slots. Every other part that renders an element keeps a service's
 * style beside its own.
 */
export const unstyled = ["InputOTP", "InputOTPControl"] as const;
