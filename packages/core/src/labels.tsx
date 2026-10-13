"use client";

import { createContext, type ReactNode, useContext, useMemo, useState } from "react";
import type { AccordionLabels } from "./accordion";
import type { QuestionCardLabels } from "./agent-cards";
import type { AttachmentLabels } from "./attachment";
import type { AvatarGroupLabels } from "./avatar";
import type { BackLinkLabels } from "./back-link";
import type { BreadcrumbsLabels } from "./breadcrumbs";
import type { BubbleLabels } from "./bubble";
import type { CalendarLabels } from "./calendar";
import type { CalloutLabels } from "./callout";
import type { MediaCreditLabels } from "./card";
import type { CarouselLabels } from "./carousel";
import type { CharacterCountLabels } from "./character-count";
import type { ChatInputLabels } from "./chat-input";
import type { ComboboxLabels } from "./combobox";
import type { CommandMenuLabels } from "./command-menu";
import type { ConversationLabels } from "./conversation";
import type { CookieBannerLabels } from "./cookie-banner";
import type { CopyLabels } from "./copy";
import type { DataTableLabels } from "./data-table";
import type { DateInputLabels } from "./date-input";
import type { ErrorLabels } from "./error-summary";
import type { ExitThisPageLabels } from "./exit-this-page";
import type { FeedbackLabels } from "./feedback";
import type { FigureLabels } from "./figure";
import type { FileChipLabels, FileChipsLabels } from "./file-chips";
import type { FileDiffLabels } from "./file-diff";
import type { FileUploadLabels } from "./file-upload";
import type { FooterLabels } from "./footer";
import type { FormStepsLabels } from "./form-steps";
import type { GroupedTableLabels } from "./grouped-table";
import type { ImageGenerationLabels } from "./image-generation";
import type { InlineCitationLabels } from "./inline-citation";
import type { InputLabels } from "./input";
import type { LanguageNavigationLabels } from "./language-navigation";
import type { LightboxLabels } from "./lightbox";
import type { LinkLabels } from "./link";
import type { LogoCarouselLabels } from "./logo-carousel";
import type { MessageActionsLabels, MessageRatingLabels } from "./message-actions";
import type { MessageScrollerLabels } from "./message-scroller";
import type { NavigationMenuLabels } from "./navigation-menu";
import type { OverlayLabels } from "./overlay";
import type { ServicePageLabels } from "./page";
import type { PaginationLabels } from "./pagination";
import type { QrCodeLabels } from "./qr-code";
import type { ReasoningStepsLabels } from "./reasoning-steps";
import type { ResizableLabels } from "./resizable";
import type { SearchBoxLabels } from "./search-box";
import type { ServiceNavigationLabels } from "./service-navigation";
import type { SidebarLabels } from "./sidebar";
import type { SidebarCustomiseLabels, SidebarItemMenuLabels } from "./sidebar-arrangement";
import type { SkipLinkLabels } from "./skip-link";
import type { SummaryListLabels } from "./summary-list";
import type { SwitchLabels } from "./switch";
import type { TaskListLabels } from "./task-list";
import type { ThemePickerLabels } from "./theme-picker";
import type { TimeInputLabels } from "./time-input";
import type { TimelineLabels } from "./timeline";
import type { ToastLabels } from "./toast";
import type { TourLabels } from "./tour";

/**
 * The words each component writes itself, by component, such as Pagination's Previous and Next.
 * Each component's words are a map, typed in its own file, which its `labels` prop takes in part.
 * An extension adds its components' maps to this interface, by augmenting the `x-govuk-ui` module.
 */
export interface ComponentLabels {
  accordion: AccordionLabels;
  attachment: AttachmentLabels;
  avatarGroup: AvatarGroupLabels;
  backLink: BackLinkLabels;
  breadcrumbs: BreadcrumbsLabels;
  bubble: BubbleLabels;
  calendar: CalendarLabels;
  callout: CalloutLabels;
  carousel: CarouselLabels;
  characterCount: CharacterCountLabels;
  chatInput: ChatInputLabels;
  combobox: ComboboxLabels;
  commandMenu: CommandMenuLabels;
  conversation: ConversationLabels;
  cookieBanner: CookieBannerLabels;
  copy: CopyLabels;
  dataTable: DataTableLabels;
  dateInput: DateInputLabels;
  errors: ErrorLabels;
  exitThisPage: ExitThisPageLabels;
  feedback: FeedbackLabels;
  figure: FigureLabels;
  fileChip: FileChipLabels;
  fileChips: FileChipsLabels;
  fileDiff: FileDiffLabels;
  fileUpload: FileUploadLabels;
  footer: FooterLabels;
  formSteps: FormStepsLabels;
  groupedTable: GroupedTableLabels;
  imageGeneration: ImageGenerationLabels;
  inlineCitation: InlineCitationLabels;
  input: InputLabels;
  languageNavigation: LanguageNavigationLabels;
  lightbox: LightboxLabels;
  link: LinkLabels;
  logoCarousel: LogoCarouselLabels;
  mediaCredit: MediaCreditLabels;
  messageActions: MessageActionsLabels;
  messageRating: MessageRatingLabels;
  messageScroller: MessageScrollerLabels;
  navigationMenu: NavigationMenuLabels;
  overlay: OverlayLabels;
  pagination: PaginationLabels;
  qrCode: QrCodeLabels;
  questionCard: QuestionCardLabels;
  reasoningSteps: ReasoningStepsLabels;
  resizable: ResizableLabels;
  searchBox: SearchBoxLabels;
  serviceNavigation: ServiceNavigationLabels;
  servicePage: ServicePageLabels;
  sidebar: SidebarLabels;
  sidebarCustomise: SidebarCustomiseLabels;
  sidebarItemMenu: SidebarItemMenuLabels;
  skipLink: SkipLinkLabels;
  summaryList: SummaryListLabels;
  switch: SwitchLabels;
  taskList: TaskListLabels;
  themePicker: ThemePickerLabels;
  timeInput: TimeInputLabels;
  timeline: TimelineLabels;
  toast: ToastLabels;
  tour: TourLabels;
}

/**
 * Words for any components inside a LabelsProvider, by component, with the `locale` that dates and
 * numbers are written in. Each map may give some words and leave the rest to the defaults.
 */
export type Labels = {
  /** The language for dates and numbers, such as "cy" for Welsh. By default, "en-GB". */
  locale?: string;
} & { [Component in keyof ComponentLabels]?: Partial<ComponentLabels[Component]> };

const LabelsContext = createContext<Labels>({});

export type LabelsProviderProps = {
  /**
   * The words to use, by component. A provider inside another adds to its words. Give the same
   * object at each render, such as a constant, so the components inside need not render again.
   */
  labels: Labels;
  children: ReactNode;
};

/**
 * Gives every component inside it the words of a service's language, such as Welsh, in one place.
 * A component's own `labels` prop comes first, then the nearest provider's words, then the
 * component's English defaults.
 */
export function LabelsProvider({ labels, children }: LabelsProviderProps) {
  const outer = useContext(LabelsContext);
  const merged = useMemo(() => {
    const all: Record<string, unknown> = { ...outer };
    for (const [component, words] of Object.entries(labels)) {
      const before = all[component];
      all[component] =
        words && typeof words === "object" && before && typeof before === "object"
          ? { ...before, ...words }
          : words;
    }
    return all as Labels;
  }, [outer, labels]);
  return <LabelsContext value={merged}>{children}</LabelsContext>;
}

/** Whether two maps of words have the same words. */
function sameWords(a: object, b: object) {
  const first = Object.entries(a);
  return (
    first.length === Object.keys(b).length &&
    first.every(([key, value]) => Object.is(value, (b as Record<string, unknown>)[key]))
  );
}

/**
 * A component's words, from its own `labels`, then the nearest LabelsProvider, then its defaults.
 * Use it in a component of your own, with its words added to `ComponentLabels`.
 *
 * The result is the same object while every word stays the same, even when `own` is a new object
 * at each render, so an effect can depend on it.
 */
export function useLabels<Component extends keyof ComponentLabels>(
  component: Component,
  defaults: ComponentLabels[Component],
  own?: Partial<ComponentLabels[Component]>,
): ComponentLabels[Component] {
  const given = useContext(LabelsContext)[component] as
    | Partial<ComponentLabels[Component]>
    | undefined;
  const words = { ...defaults, ...given, ...own };
  // The words of the last render, kept as React suggests for information from earlier renders.
  const [kept, keep] = useState(words);
  if (sameWords(kept, words)) return kept;
  keep(words);
  return words;
}

/** The language that dates and numbers are written in, from the nearest LabelsProvider. */
export function useLocale(): string {
  return useContext(LabelsContext).locale ?? "en-GB";
}
