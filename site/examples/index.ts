import type { ComponentType } from "react";
import type { ComponentName } from "../catalogue";
import accordion from "./accordion";
import aside from "./aside";
import aspectRatio from "./aspect-ratio";
import attachment from "./attachment";
import avatar from "./avatar";
import backLink from "./back-link";
import barList from "./bar-list";
import breadcrumbs from "./breadcrumbs";
import bubble from "./bubble";
import bulletChart from "./bullet-chart";
import button from "./button";
import calendarHeatmap from "./calendar-heatmap";
import callout from "./callout";
import card from "./card";
import carousel from "./carousel";
import chart from "./chart";
import chartSet from "./chart-set";
import chatInput from "./chat-input";
import checkboxes from "./checkboxes";
import choices from "./choices";
import choroplethMap from "./choropleth-map";
import codeBlock from "./code-block";
import combobox from "./combobox";
import commandMenu from "./command-menu";
import contextMenu from "./context-menu";
import conversation from "./conversation";
import cookieBanner from "./cookie-banner";
import dataTable from "./data-table";
import dateInput from "./date-input";
import details from "./details";
import dialog from "./dialog";
import dropdownMenu from "./dropdown-menu";
import editor from "./editor";
import emptyState from "./empty-state";
import errorSummary from "./error-summary";
import exitThisPage from "./exit-this-page";
import feedback from "./feedback";
import field from "./field";
import fieldset from "./fieldset";
import figure from "./figure";
import fileChips from "./file-chips";
import fileDiff from "./file-diff";
import fileUpload from "./file-upload";
import filterChips from "./filter-chips";
import footer from "./footer";
import form from "./form";
import gauge from "./gauge";
import groupedTable from "./grouped-table";
import header from "./header";
import hoverCard from "./hover-card";
import imageGeneration from "./image-generation";
import inlineCitation from "./inline-citation";
import input from "./input";
import inputOtp from "./input-otp";
import insetText from "./inset-text";
import item from "./item";
import kbd from "./kbd";
import languageNavigation from "./language-navigation";
import lightbox from "./lightbox";
import link from "./link";
import logoCarousel from "./logo-carousel";
import marker from "./marker";
import menubar from "./menubar";
import messageScroller from "./message-scroller";
import multiSelect from "./multi-select";
import navigationMenu from "./navigation-menu";
import notificationBanner from "./notification-banner";
import organisationName from "./organisation-name";
import page from "./page";
import pagination from "./pagination";
import panel from "./panel";
import phaseBanner from "./phase-banner";
import planCard from "./plan-card";
import popover from "./popover";
import progress from "./progress";
import prose from "./prose";
import qrCode from "./qr-code";
import questionCard from "./question-card";
import radios from "./radios";
import reasoningSteps from "./reasoning-steps";
import richText from "./rich-text";
import sankey from "./sankey";
import scrollArea from "./scroll-area";
import searchBox from "./search-box";
import select from "./select";
import separator from "./separator";
import serviceNavigation from "./service-navigation";
import sheet from "./sheet";
import sidebar from "./sidebar";
import skeleton from "./skeleton";
import skipLink from "./skip-link";
import slider from "./slider";
import SoundExample from "./sound";
import sparkline from "./sparkline";
import spinner from "./spinner";
import stat from "./stat";
import streamingText from "./streaming-text";
import summaryList from "./summary-list";
import sunburst from "./sunburst";
import switchExample from "./switch";
import table from "./table";
import tabs from "./tabs";
import tag from "./tag";
import taskList from "./task-list";
import textShimmer from "./text-shimmer";
import textarea from "./textarea";
import ThemePickerExample from "./theme-picker";
import tiles from "./tiles";
import timeInput from "./time-input";
import timeline from "./timeline";
import toast from "./toast";
import toggleGroup from "./toggle-group";
import tooltip from "./tooltip";
import tour from "./tour";
import treemap from "./treemap";
import visuallyHidden from "./visually-hidden";
import waffle from "./waffle";
import warningText from "./warning-text";
import widthContainer from "./width-container";

/**
 * The example for each component. The workbench renders it as the preview and shows its source
 * file as the usage code, so the two always match. Each example takes the props its catalogue
 * entry lists, with the same names as the component's own props.
 */
export const examples: Record<ComponentName, ComponentType<never>> = {
  accordion,
  button,
  carousel,
  "command-menu": commandMenu,
  conversation,
  input,
  "input-otp": inputOtp,
  "inset-text": insetText,
  kbd,
  "navigation-menu": navigationMenu,
  sidebar,
  "text-shimmer": textShimmer,
  toast,
  tooltip,
  checkboxes,
  "error-summary": errorSummary,
  form,
  field,
  fieldset,
  radios,
  select,
  slider,
  switch: switchExample,
  textarea,
  editor,
  prose,
  "rich-text": richText,
  "toggle-group": toggleGroup,
  details,
  separator,
  tabs,
  table,
  "code-block": codeBlock,
  "scroll-area": scrollArea,
  dialog,
  sheet,
  popover,
  "dropdown-menu": dropdownMenu,
  "context-menu": contextMenu,
  "hover-card": hoverCard,
  tag,
  spinner,
  progress,
  skeleton,
  "empty-state": emptyState,
  "notification-banner": notificationBanner,
  panel,
  "warning-text": warningText,
  header,
  "service-navigation": serviceNavigation,
  footer,
  "phase-banner": phaseBanner,
  page,
  "width-container": widthContainer,
  breadcrumbs,
  "back-link": backLink,
  pagination,
  "skip-link": skipLink,
  "language-navigation": languageNavigation,
  "exit-this-page": exitThisPage,
  "date-input": dateInput,
  tiles,
  "time-input": timeInput,
  "file-upload": fileUpload,
  combobox,
  "multi-select": multiSelect,
  "search-box": searchBox,
  "summary-list": summaryList,
  "task-list": taskList,
  "plan-card": planCard,
  "question-card": questionCard,
  "file-diff": fileDiff,
  lightbox,
  link,
  "visually-hidden": visuallyHidden,
  card,
  aside,
  "aspect-ratio": aspectRatio,
  item,
  avatar,
  marker,
  attachment,
  "cookie-banner": cookieBanner,
  feedback,
  "filter-chips": filterChips,
  menubar,
  "chat-input": chatInput,
  "file-chips": fileChips,
  "streaming-text": streamingText,
  "reasoning-steps": reasoningSteps,
  "inline-citation": inlineCitation,
  "grouped-table": groupedTable,
  "data-table": dataTable,
  chart,
  "chart-set": chartSet,
  "calendar-heatmap": calendarHeatmap,
  "choropleth-map": choroplethMap,
  treemap,
  sunburst,
  sankey,
  "bar-list": barList,
  "bullet-chart": bulletChart,
  gauge,
  waffle,
  sparkline,
  stat,
  figure,
  timeline,
  "qr-code": qrCode,
  "organisation-name": organisationName,
  "logo-carousel": logoCarousel,
  "image-generation": imageGeneration,
  bubble,
  "message-scroller": messageScroller,
  callout,
  tour,
  choices,
  sound: SoundExample,
  "theme-picker": ThemePickerExample,
};
