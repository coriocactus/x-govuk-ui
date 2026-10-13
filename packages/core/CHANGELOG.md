# Changelog

All five x-govuk-ui packages are released together, at one version. A minor version, such as 0.3.0, can break what a service relies on. A patch version, such as 0.2.1, only fixes and adds. [Versions](https://github.com/coriocactus/x-govuk-ui#versions) says what counts as breaking.

## [Unreleased]

### Breaking Changes

- Renamed the classes of five components to start with the component's name, as every other component's do, so a class says which component it belongs to:
  - Command menu's `x-govuk-ui-command-*` classes are now `x-govuk-ui-command-menu-*`, such as `x-govuk-ui-command-menu-item`.
  - Navigation menu's `x-govuk-ui-navigation` and `x-govuk-ui-navigation-*` are now `x-govuk-ui-navigation-menu` and `x-govuk-ui-navigation-menu-*`.
  - Inline citation's `x-govuk-ui-citation` and `x-govuk-ui-citation-*` are now `x-govuk-ui-inline-citation` and `x-govuk-ui-inline-citation-*`.
  - One-time code's `x-govuk-ui-otp` and `x-govuk-ui-otp-*` are now `x-govuk-ui-input-otp` and `x-govuk-ui-input-otp-*`.
  - Conversation's `x-govuk-ui-message`, `x-govuk-ui-message-row`, `x-govuk-ui-message-content`, `x-govuk-ui-message-actions`, `x-govuk-ui-message-note`, `x-govuk-ui-thinking` and `x-govuk-ui-thinking-word` are now `x-govuk-ui-conversation-message`, `x-govuk-ui-conversation-message-row`, `x-govuk-ui-conversation-content`, `x-govuk-ui-conversation-actions`, `x-govuk-ui-conversation-note`, `x-govuk-ui-conversation-thinking` and `x-govuk-ui-conversation-thinking-word`, after the parts that draw them.

  Rename them in your own styles.
- Changed CommandMenu to be built from parts, as Dialog is. CommandMenu keeps its state, `keyboardShortcut`, `disabled` and `labels`. Its dialog is now CommandMenuContent, which holds the groups and takes `placeholder`, `finalFocus` and the dialog's own props, such as `className`, `ref` and `aria-*`, which CommandMenu took before. Its button is CommandMenuTrigger, which takes `render` for another element, in place of the `trigger` prop. Leave the trigger out when something else opens the menu. Write `<CommandMenu><CommandMenuTrigger /><CommandMenuContent>…</CommandMenuContent></CommandMenu>`.
- Changed Callout to be built from parts, as Popover is. Callout keeps its state, its `anchor`, `closeOnPressOutside` and its `labels`, which name its help button and its ×. Its card is now CalloutContent, which takes `title`, `actions`, `variant`, `side`, `align`, `timeout`, `countdown`, `closeButton` and the card's other props. CalloutTrigger goes inside Callout, in place of its `trigger` prop, and takes `render` for another element, as the other triggers do. Write `<Callout><CalloutTrigger label="…" /><CalloutContent title="…">…</CalloutContent></Callout>`.
- Changed ServicePage's `footerLinks` to take FooterLink parts, in place of a list of labels and addresses, so a router's link can be one. It no longer shows GOV.UK's support links at placeholder addresses, such as `#help`, when it is given none. Give your service's own. `ServicePageLink` is removed.
- Changed ServicePage's phase banner to link to feedback only at the service's own `feedbackUrl`, in place of a placeholder `#feedback`. Without `feedbackUrl` or `phaseMessage`, the banner shows only its tag. Give your service's feedback address.
- Changed Footer's `crest` to have no default, in place of GOV.UK Frontend's `/assets/images/govuk-crest.svg`, which most services do not serve. Without it, Crown copyright stands without the Royal Arms, and no image is asked for. Where your service serves GOV.UK Frontend's assets, give `crest="/assets/images/govuk-crest.svg"`. ServicePage's own footer has no Royal Arms. Give it a `footer` of your own with `crest`.
- Changed FileUpload's `chooseText`, `dropText` and `noFileText` to its labels `choose` and `chooseMany`, `drop` and `dropMany`, and `noFile` and `noFiles`, for one file and for several. Its Remove and its sizes are labels too.
- Changed SidebarItem's `isActive` to `current`, as Breadcrumbs, Pagination and the navigation name the page a service is on.
- Changed the props that turn keys on, so `shortcut` always means the keys a part shows or handles. CommandMenu's `hotkey` is now `keyboardShortcut`, FormSteps' `shortcut` is now `keyboardShortcut`, and Choices' `shortcuts` is now `shortcutScope`.
- Changed MainWrapper's `size` from `"default" | "large"` to `"medium" | "large"`, as other parts name their sizes.
- Changed every component's words to labels, which a LabelsProvider or the component's `labels` prop can change, in place of a prop for each word:
  - AccordionShowAll's `showLabel` and `hideLabel` are its labels `showAll` and `hideAll`.
  - CommandMenu's `triggerLabel`, `emptyLabel` and `listLabel` are its labels `trigger`, `empty` and `commands`. CommandMenuContent's `placeholder` comes before its `search` label. The help beneath the list is its labels `help` and `helpBack`.
  - Combobox's and MultiSelect's `emptyText` is their label `empty`.
  - The `closeLabel` of DialogContent, SheetContent, PopoverContent and Callout is their label `close`.
  - SearchBox's `buttonLabel` is its label `button`, and `showLabel` is now `hideLabel`, which is true by default, as other fields name it.
  - ServiceNavigation's `menuLabel` and `navigationLabel` are its labels `menu` and `navigation`.
  - MessageRating's `upLabel` and `downLabel` are its labels `up` and `down`.
  - The `label`, `copiedLabel` and `failedLabel` of CodeBlockCopy and ConversationCopy are their labels `copy`, `copied` and `failed`.
  - FileChip's `removeLabel` is its label `remove`, a function of the file's name.
  - TaskListItem's `statusLabel` is now `statusText`, and the statuses' words are the `taskList` labels.
  - ExitThisPage's `activatedText`, `timedOutText`, `pressTwoMoreTimesText` and `pressOneMoreTimeText` are its labels `activated`, `timedOut`, `pressTwoMoreTimes` and `pressOneMoreTime`.
  - ConversationThinking's `labels`, a list of status words, is now `statuses`. `defaultThinkingLabels` and `playfulThinkingLabels` are now `defaultThinkingStatuses` and `playfulThinkingStatuses`.
- Changed FormSteps, FormStep, Tour and QuestionCard to take their words in `labels`, in place of a prop for each word. FormSteps' `continueLabel`, `backLabel`, `skipLabel`, `submitLabel`, `doneLabel`, `skippedLabel`, `notAnsweredLabel`, `progressLabel` and `checkAnswersTitle` are now its labels `continue`, `back`, `skip`, `submit`, `sent` or `answered`, `skipped`, `notAnswered`, `progress` and `checkAnswers`. FormStep's `continueLabel` is `labels={{ continue }}`. Tour's `stepLabel`, `nextLabel`, `backLabel`, `doneLabel` and `closeLabel` are its labels `step`, `next`, `back`, `done` and `close`. QuestionCard's `submitLabel` is its label `submit`.
- Changed Pagination's `previousLabel` and `nextLabel` to `previousTitle` and `nextTitle`, the titles of the pages in block mode. Pagination no longer takes `aria-label`. Give its `navigation` label instead, in `labels` or a LabelsProvider.
- Removed MessageCopy. Use CopyButton, which copies any text, not only a message's. Its `text` is the text, or a function that reads it. MessageCopy's `label`, `copiedLabel` and `failedLabel` are its labels `copy`, `copied` and `failed`.
- Changed Footer to take its navigation in `navigation`, as `FooterSection` parts, in place of finding FooterSection among its children. A FooterSection among its children now stays with the support links. Move each FooterSection into `navigation`.
- Changed FormSteps' Check your answers to list the fields that take part in its Form, each with the question and answer the field gives. The library's fields take part, as does a field of your own in a Field with `controlId` and `name`, or one that calls `useField` with a `name`. A plain input of your own, outside such a field, is no longer listed. Put it in a bound Field, or give its step a `summary`. A password is listed as covered, never as typed.
- Changed ConversationMessage, ConversationThinking, MessageScrollerItem and CookieBanner to take an element's props, as every other part does, in place of Motion's. Their types no longer take Motion's props, such as `animate`, `whileHover` or a `style` of motion values. To animate one of them, wrap it in a Motion element of your own. `onAnimationStart`, `onDrag`, `onDragStart` and `onDragEnd` are now the DOM's events, as on any element.
- Changed ConversationMessage to put its `className` on the message's row, where its other props already go, in place of the `article` inside. A rule that styled the message through the class should now select `.x-govuk-ui-conversation-message` inside it.
- Changed where some parts put their `className` and `style`, so each part gives one element everything a service gives it. A rule that styled a part through its class should now select the element named here:
  - Switch puts its `className` on its control, as an Input puts its class on its input, in place of its row. Select the row as `.x-govuk-ui-switch`.
  - DateInput and TimeInput put their `className` on their fieldset, where their other props go, as Radios do, in place of the row of boxes. Select the row as `.x-govuk-ui-date-input`.
  - ErrorMessage puts its `className` on its paragraph, where its other props go, in place of the box that opens and closes around it.
  - Combobox, MultiSelect, FileUpload and their controls put their `style` on their box, beside their `className`, in place of their input. Every other prop still goes on the input, which takes focus.
  - FormSteps and QuestionCard put their `style` on their section, beside their `className`, in place of their form. Every other prop still goes on the form.
- Removed `style` from InputOTP's and InputOTPControl's props. input-otp sets the style of its input and of the row of slots itself, so a style given never showed. Style the row through `containerClassName`.
- Changed `small` on Radios and Checkboxes to `size`, `"medium"` or `"small"`, as other parts name their size. Give `size="small"` instead of `small`. The list's `data-small` attribute is now `data-size="small"`.
- Changed SoundScope to choose a press's sound from data attributes that parts set, in place of their classes and names. A warning Button sets `data-sound="destructive"`, a quiet one `data-sound-soft`, and every close button, such as an overlay's ×, `data-sound="close"`. A button of your own named Close no longer plays the close sound by its name. Give it `data-sound="close"`.

### Added

- Added `controlId` to Field, which binds it to its control. A bound Field gives its `Label`, `Hint` and `ErrorMessage` their ids, and shows its own `errorMessage`, or its Form's error by its `name`. A field composed from its parts then needs no `useField`. `hasHint`, `linkTo` and `describedBy` say the rest. A Field without `controlId` works as before.
- Added `label` and `answer` to Field and to `useField`, which say how FormSteps' Check your answers lists the field. A bound Field's `Label` or `FieldsetLegend` gives its question, unless the Field is given a `label`. Without an `answer`, the summary shows what the field sends under its name. `FormField` is the type of what a field tells its Form.
- Added `useFieldSummary`, with which a control of your own, in a bound Field, gives its question, its answer, as Select gives its option's label, or where an error links to, as DateInputControl links to its day. What a part gives goes with it when it leaves the page.
- Added ShownProvider, which tells the fields inside whether users can see them, such as in a disclosure of your own. Check your answers leaves out the answers of fields users cannot see, as it does a closed follow-up question's.
- Added `useLabels`, with which a component of your own takes its words from its `labels`, then a LabelsProvider, then its defaults, as the library's do. Add its map to `ComponentLabels` by augmenting the `x-govuk-ui` module. The words it returns stay the same object while every word does.
- Added CalloutClose and CommandMenuClose, buttons that close a Callout or a Command menu, as PopoverClose and DialogClose do.
- Added `defaultOpen` to SidebarCustomise, whose `open` and `onOpenChange` are now optional, and `children` for a SheetTrigger that opens it.
- Added `labels` to Textarea and TextareaControl, for the words of its character count. Textarea's count and the Editor's share the `characterCount` words of a LabelsProvider.
- Added `errorMessage` to Switch and Slider. Each now takes part in a Form by its `name`, so a Form's error shows on the field, and its error summary links to it. Each starts from the answer the Form keeps for it.
- Added the questions and answers of Combobox, MultiSelect, Slider, Switch, Date input and Time input to FormSteps' Check your answers. Combobox shows its option's label, Slider its value as it shows it, and Switch On or Off.
- Added the ability to put a FormStep inside a wrapper of your own. Each FormStep now draws its own step, in its place, and FormSteps takes its steps in the page's order. A step in a wrapper shows once the page has loaded. Keep every step on the page, and give a step that applies only to some answers a `when`.
- Added the ability to put a TourStep inside a wrapper of your own. Each TourStep now leaves an empty, hidden element in its place, which keeps its order among the Tour's steps.
- Added `render` to Button, which renders another element with the Button's look, such as a link for GOV.UK's Start button, or a router's link. Given `disabled` too, the element is marked `aria-disabled`, takes no `disabled` of its own, and does nothing when pressed.
- Added CopyButton, an icon button that copies any text, such as a reference number. CodeBlockCopy and ConversationCopy are built on it.
- Added LabelsProvider, which gives every component inside it a service's words, such as Welsh, with the `locale` for dates and numbers. Each component's words are a map, and its `labels` prop takes the words it should use in place of the provider's. Pagination, Calendar, Date input, Time input and Input's password words take `labels`, and every word they wrote in English is now a label. The error summary's title and the "Error" before each error message are the `error` labels. Each map's English defaults are exported, such as `defaultPaginationLabels`.
- Added the words of FormSteps, Tour and QuestionCard to LabelsProvider, including Check your answers, Change and QuestionCard's messages in GOV.UK's words.
- Added the words of the rest of the components that write words to LabelsProvider, including Toast's Dismiss notification, Lightbox's and Inline citation's buttons, Chat input's Send, Stop and dictation, Data table's Select every row, Conversation's You and is writing a reply, and Switch's On and Off in Check your answers.
- Added the default words of every part with a name of its own to LabelsProvider, such as BackLink's Back, CarouselNext's Next slide, the Sidebar's buttons and Footer's licence. A part's own `label`, or its children, still come first. Feedback and Cookie banner write every word through labels too.
- Added `render` to Attachment, which renders a router's link in place of its title's anchor.
- Added the last words that components wrote in English to their labels, so every word a component in the browser writes can change. They are Link's "(opens in new tab)", Attachment's notice and request, AvatarGroup's "and 3 more", Carousel's names for screen readers, Combobox's Remove, Data table's buttons and handles, File diff's folds and counts, Grouped table's handle, Inline citation's place, Lightbox's credit, Logo carousel's Play and Pause, QR code's name, Resizable's pixels, ThemePicker's names, Timeline's "by" and dates, ChoiceDivider's "or", and the Sidebar's menu and Customise sheet. The parts that render on the server, such as Header, Phase banner and Stat, take their words from their props.
- Added `useLocale`, which gives the nearest LabelsProvider's language. Calendar and Date input write their dates in it.
- Added `step` and `defaultStep` to FormSteps, which can now be controlled, as its `onStepChange` suggested.
- Added `defaultOpen` to CommandMenu and `defaultSelected` to DataTable, so each can keep track of its own state from a start you choose.
- Added `render`, `header`, `footer` and `crest` to ServicePage. `render` renders a router's link in place of each link the page makes for you. `header` and `footer` replace the usual ones. `crest` gives its footer the Royal Arms, as Footer's `crest` does. Its phase banner's words are its `labels`.
- Added `serviceRender` to ServiceNavigation, which renders a router's link in place of the service name's anchor.
- Added `name` to ToggleGroup and FilterChips, which then send each chosen value with a form. In a Form, they start from the answers the Form keeps, the error summary links to the group, and Check your answers lists the chosen items' words. A disabled ToggleGroup sends nothing.
- Added `useControlProps`, which gives a control of your own the id, name and descriptions of the bound Field around it.
- Added InputControl, TextareaControl and SelectControl, the controls of Input, Textarea and Select on their own. In a bound Field, each takes its id, name and descriptions from the field. A service can then put something between a field's hint and its control, or beside the control, as GOV.UK's search puts a button. InputControl keeps the prefix, suffix, Show button and strength meter, TextareaControl the character or word count, and SelectControl the list. Input, Textarea and Select are now built from these parts, and their markup does not change.
- Added the parts of Radios and Checkboxes, for a group of your own. RadiosRoot and CheckboxesRoot keep the group's state and bind its Field to the group's id. ChoiceList holds the answers, and Radios' dot travels between them. An answer is a ChoiceRoot, with a ChoiceControl, a ChoiceLabel and a ChoiceHint, and a ChoiceConditional after it for its follow-up question. A part can then go between a group's hint and its answers. ChoiceControl takes an input's props, such as `required` and `ref`. Radios and Checkboxes are now built from these parts, and their markup does not change.
- Added the props of an element to Radio and Checkbox, as every other part has them. `ref`, `data-*` and the rest go on the answer's row, which holds its input, box, label and hint.
- Added `controlId` to Radio and Checkbox, to give an answer the id you choose.
- Added SummaryListRowRoot, SummaryListKey, SummaryListValue and SummaryListActions, for a Summary list row of your own. SummaryListValue glows when its text changes, as the row's value does. SummaryListRow is now built from them, and its markup does not change.
- Added `ref` to SummaryListAction, which goes on its link or button.
- Added a button's props to CodeBlockCopy and ConversationCopy, such as `ref`, `aria-*` and `data-*`.
- Added DetailsRoot, DetailsSummary, DetailsPanel and DetailsText, for details of your own. Details is now built from them, and its markup does not change.
- Added NotificationBannerRoot, NotificationBannerHeader, NotificationBannerTitle and NotificationBannerContent, for a banner of your own. The root's `titleId` names the banner, and its title takes that id. NotificationBanner is now built from them, and its markup does not change.
- Added DateInputControl and TimeInputControl, the fields of Date input and Time input on their own, for a date or time composed from Field's parts, such as with a part of your own between the hint and the fields. In a bound Field, each takes its fields' ids and names from the field, and a Form's error summary links to the day or the hour. DateInputControl keeps the calendar. Date input and Time input are now built from these parts, and their markup does not change, except that they now keep their own `aria-describedby`.
- Added ComboboxControl, MultiSelectControl, FileUploadControl and InputOTPControl, the controls of Combobox, MultiSelect, File upload and One-time code on their own, for a field composed from Field's parts. In a bound Field, each takes its id, name and descriptions from the field, and gives Check your answers its answer. Combobox, MultiSelect, File upload and InputOTP are now built from these parts, and their markup does not change.
- Added SwitchControl, Switch's control on its own, for a switch in a Field of your own, such as with its label above it. It takes `size` itself. Switch's row now holds its hint, its error and its control in a FieldBinding, and its markup does not change, except that a small switch's control says it is small too.
- Added FieldBinding, which binds a field's parts to its control's id as a Field with `controlId` does, without the Field's box, for a field with a layout of its own.
- Added SliderRoot, SliderLabel, SliderValue and SliderControl, the parts of a Slider, for a slider of your own. SliderRoot keeps the value, SliderLabel names the thumb, SliderValue shows the value, and SliderControl is the track and thumb. SliderControl gives its own `aria-label` or `aria-labelledby` to the thumb, for a slider named another way. Slider is now built from them, and its markup does not change.
- Added FieldsetRoot and FieldsetLegend, the parts of a Fieldset, for a fieldset of your own. FieldsetLegend takes `size` and `pageHeading`. In a bound Field, FieldsetRoot is described by the field's hint and error. Fieldset is now built from them, and its markup does not change.

### Changed

- Changed the styling contracts of Date input, Time input, Code block and Aspect ratio, which list the classes a service styles. The legend's classes now belong to Fieldset, the copy button's to CopyButton and MediaCredit's to Card, whose parts draw them. The classes on the page do not change.
- Changed Card, Item, Avatar, Aspect ratio, Aside, Marker and VisuallyHidden to have a file each, and each component its own stylesheet. Item and Aspect ratio no longer mark themselves as client components, so they render on the server.
- Changed ErrorSummaryItem to focus the first control inside the element it links to, when that element cannot take focus itself, such as a Slider or a group.
- Changed SummaryListAction's `hiddenText` to take any React content.
- Changed a Form's `defaultValues` to come before a field's own `defaultValue`. A field then shows an answer kept from an earlier visit, or the answer in a record being changed, in place of where it usually starts. FormSteps restores every field it kept, even one with a `defaultValue`. A kept answer with nothing in it, such as a switch that is off, means that nothing was chosen. InputOTP starts from the Form's answer too.
- Changed `errorMessage` on every field to take any React content, as Fieldset's does. `FormErrors` takes any React content too, so a Form's `validate` and `onSubmit` can give a message with a link.

### Fixed

- Fixed an answer in a wrapper of your own, inside Radios or Checkboxes, taking the first answer's id. Its label then named the wrong answer. Such an answer now takes an id of its own, including in a group inside a follow-up question. A Form's error summary links to the first answer on the page.
- Fixed FormSteps with a `storageKey` rendering different first HTML in the browser than on the server. Kept answers and the step now come back once the page has loaded, before it is drawn.
- Fixed the browser's Back and Forward in FormSteps with `history` using the form as it was when the page loaded, such as which steps were skipped.
- Fixed FormSteps' Check your answers listing nothing when the form starts on it, such as from `step`, or comes back to it from a `storageKey`.
- Fixed the browser's Back and Forward in FormSteps with `history` going to the wrong step after the form started on a step in a wrapper of your own, or came back to a step from a `storageKey`. The browser's current entry now always records the step the form is on.
- Fixed FormSteps with a `storageKey` bringing back a field's own default after a reload, where users had cleared the answer, such as a switch turned off or a group with nothing ticked. A field that sends nothing is now kept as empty.
- Fixed Check your answers showing a Select's value in place of its option's label after a reload, when its options are in a component of your own. Check your answers now lists the answers again when a field's question or answer changes while it shows.
- Fixed FormSteps not keeping answers under its `storageKey` when a service's own `onInput` or `onChange` prevented the event's default.
- Fixed Tour failing to render on the server.
- Fixed File upload losing its files' Remove when given a `ref`, which took the place of its own.
- Fixed Slider putting its own `aria-describedby` on its root, which nothing reads. It now describes the thumb, before the hint and the error, as every field's control is described.
- Fixed a Callout notice showing for a moment at the page's top left corner when its anchor left the page, such as a control going behind a toolbar's More. A notice now waits out of sight while its anchor is gone or scrolled out of sight, and comes back where it points.
- Fixed Slider and Progress writing their values in the browser's language, which could differ from the server's. They write them in the nearest LabelsProvider's `locale`.
- Fixed Sidebar dropping a service's `style`, which it now keeps beside the width it sets.
- Fixed parts dropping a service's own props where they set their own. Bubble, CarouselViewport, ConversationContent and FormSteps now take `ref`. ImageGeneration, Lightbox, GroupedTable and QrCode keep their `style`. A service's own handler now runs before the part's own on CarouselViewport, CarouselPrevious, CarouselNext, ChatInput, ChatInputAttach, ChatInputDictation, CommandMenuItem, FileUpload's drag and drop, FormSteps, LogoCarousel, MenuItem, MessageRetry, ResizableHandle, SearchBox and SidebarContent. Calling `preventDefault` in it stops what the part would do, except in FileUpload's drag and drop, where preventing a drop's default is how a page takes files.
- Fixed a SelectItem in a wrapper of your own showing its value in the field, in place of its label, once chosen. Its label now shows once the page has loaded, and follows it as it changes. To find it, a Select with a wrapper among its children renders them once more, outside the page, so a wrapper must only render. A direct child's label is in the first HTML, as before.
- Fixed Radios' dot landing on a follow-up question's chosen radio instead of the group's own.
- Fixed Select dropping its own `aria-describedby` and `aria-invalid`. It now describes its control by them, before its hint and error, as Input and Textarea do.

## [0.3.0] - 2026-10-10

### Breaking Changes

- Changed RichText's types so that `html` and `markdown` cannot both be given. TypeScript now reports passing both, which drew only the HTML and ignored the Markdown. Give the document as one or the other.
- Changed DataTable's `maxHeight`, in pixels, to `maxRows`, in rows of data, as CodeBlock, FileDiff and the Editor count their height. Every row is 44 pixels tall, and the headings and the foot take a row each. For a height in pixels, divide it by 44 and take away 2. The default of 440 pixels is `maxRows={8}`, which is still the default.

### Visual

- Changed FileDiff's fold, the row that opens a run of unchanged lines, to be exactly as tall as a line. It loses its 2-pixel margins and its 2 pixels of padding above and below.

### Added

- Added `size` to OrganisationName. `small` sets the name at 15 pixels, with a smaller Royal Arms, for a sidebar or a footer. `medium`, the size of GOV.UK's organisation logo, is the default.
- Added `wrap` to CodeBlock and FileDiff. Long lines break at the block's width, so it never scrolls sideways. The rest of a wrapped line starts under its code, beside its number. An editable CodeBlock's text box breaks its lines in the same places, so each character still sits on its colour.
- Added `minRows` to DataTable, its least height in rows of data. `rows` is already the data.
- Added `rows` and `maxRows` to CodeBlock and FileDiff, for the least height and the most before it scrolls inside. CodeBlock counts lines of code. FileDiff counts rows, each a line or a fold. With both the same, the block is a box of that height.

### Changed

- Changed DataTable to stop at either end of its rows without a bounce. The headings and the foot scroll in the same box as the rows, so a bounce moved them with the rows.
- Changed LogoCarousel to wait while it is off screen or the page is hidden. It turns over again when users can see it.
- Changed FileDiff to keep the lines that both texts start and end with before it compares the rest. Where a changed line could pair with either of two identical lines, such as two closing brackets, it may now pair with the other one. The counts of added and removed lines are the same.

### Fixed

- Fixed the first press with sounds on taking about 100 milliseconds to paint. Making the AudioContext blocks the main thread for about 80 milliseconds in Chromium. The first cue now waits until the press has painted, and then plays.
- Fixed Progress's sweep, for an unknown amount, laying out its track in every frame. The fill now moves by a transform, which the browser animates off the main thread, so it keeps moving while the page is busy.
- Fixed TableBody laying out the table once for each row that moves, as its rows glide to their new places. Sorting a DataTable of 1,000 rows now takes a fifteenth of the time.
- Fixed GroupedTable laying out the table once for each part that goes as it takes a step, such as a column it leaves out as it narrows. Each part fades out as a copy over its row. The table now measures every row before it adds any copy.
- Fixed StreamingText keeping the main thread busy while a long text streams in. Each step renders only the words that change, and the browser works out the style of only a few of them. While 1,500 words stream in, the main thread is busy half as long.
- Fixed RichText parsing its document again each time it renders. It keeps the 100 documents it drew most recently. A conversation whose earlier replies render again each time the newest one grows does a tenth of the work.
- Fixed FileDiff's comparison taking time and memory that grow with the product of the two texts' lengths. A small change to a file of 6,000 lines now shows in a quarter of the time, with a quarter of the memory.
- Fixed ScrollArea, with `fade`, restyling everything inside it at each step of a scroll and each change of its content. Its `--x-govuk-ui-fade-x` and `--x-govuk-ui-fade-y` are now custom properties that are not inherited, so a new fade restyles the viewport alone. On a CPU slowed four times, each step of the wheel in a CodeBlock of 2,000 lines took 140 milliseconds of the main thread. It now takes less than 1.
- Fixed DataTable's vertical scrollbar running the full height of the table, over the headings and the foot. It now runs beside the rows alone.
- Fixed ScrollArea's focus band being covered by what the region contains, such as FileDiff's tinted lines and folds, or DataTable's sticky cells, and hidden by the fade where the content runs on. The region now draws the band over its content.
- Fixed an editable CodeBlock drawing and rendering every line again at each key. It now draws only the lines a key changes, and ScrollArea no longer searches the whole code for something focusable at each key. Typing in a block of 2,000 lines takes a third less time. The Editor's Source view, with the fix to ScrollArea, takes half the time for a long document.

## [0.2.1] - 2026-10-09

### Changed

- Changed the Base UI and Motion peer dependencies from exact versions to patch ranges, `~1.8.0` and `~14.0.0`, so a service can take their patches without waiting for a release.

### Fixed

- Fixed SidebarText's JSDoc not saying that it keeps the open sidebar's width only as a direct child of SidebarHeader or SidebarFooter.
- Fixed the styling contract cutting a custom property's value short where it ended in a bracket, such as `var(--x-govuk-ui-text)`. The workbench's Styling tab, `llms.txt` and the MCP server all showed the shortened value.

## [0.2.0] - 2026-10-09

### Changed

- Changed the package's description on npm.
- Changed the JSDoc and the bundled documentation to call the people who use a service users.

## [0.1.0] - 2026-10-09

First release.
