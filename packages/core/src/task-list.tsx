"use client";

import { type ComponentPropsWithRef, type ReactNode, useId } from "react";
import { Anchor, type AnchorProps } from "./anchor";
import { useLabels } from "./labels";
import { Spinner } from "./spinner";
import { Tag, type TagColour } from "./tag";

export type TaskStatus =
  | "completed"
  | "incomplete"
  | "not-started"
  | "in-progress"
  | "cannot-start"
  | "error"
  | "working";

export type TaskListProps = ComponentPropsWithRef<"ul"> & {
  /** `TaskListItem` parts. */
  children: ReactNode;
};

/**
 * The tasks users need to complete, and where they are with each, as GOV.UK's task list does. An
 * agent can work through one too. Its current task shows a spinner, and each status that changes
 * rises into place. Compose it from `TaskListItem` parts.
 */
export function TaskList({ children, className = "", ...props }: TaskListProps) {
  return (
    <ul {...props} className={`x-govuk-ui-task-list ${className}`.trim()}>
      {children}
    </ul>
  );
}

export type TaskListItemProps = ComponentPropsWithRef<"li"> & {
  /** The task's name. */
  children: ReactNode;
  /** The task's address. Without one, the task is not a link. */
  href?: string;
  /** Renders a router's link in place of the task's anchor. */
  render?: AnchorProps["render"];
  hint?: ReactNode;
  status: TaskStatus;
  /** Replaces the status's words for this task, such as "Saved" for completed. */
  statusText?: string;
};

/** The words for each status, which a LabelsProvider can change. */
export type TaskListLabels = Record<TaskStatus, string>;

export const defaultTaskListLabels: TaskListLabels = {
  completed: "Completed",
  incomplete: "Incomplete",
  "not-started": "Not yet started",
  "in-progress": "In progress",
  "cannot-start": "Cannot start yet",
  error: "There is a problem",
  working: "Working on it",
};

const colours: Partial<Record<TaskStatus, TagColour>> = {
  incomplete: "blue",
  "not-started": "blue",
  "in-progress": "teal",
  error: "red",
};

/**
 * One task. Its link covers the whole row, which tints under the pointer. A task that cannot start
 * yet has no link. Screen readers hear the hint and status with the task's name.
 */
export function TaskListItem({
  children,
  href,
  render,
  hint,
  status,
  statusText,
  className = "",
  ...props
}: TaskListItemProps) {
  const id = useId();
  const labels = useLabels("taskList", defaultTaskListLabels);
  const colour = colours[status];
  const label = statusText ?? labels[status];
  const linked = (href !== undefined || render !== undefined) && status !== "cannot-start";
  const described = [hint && `${id}-hint`, `${id}-status`].filter(Boolean).join(" ");
  return (
    <li
      {...props}
      className={`x-govuk-ui-task-list-item ${className}`.trim()}
      data-linked={linked || undefined}
      data-status={status}
    >
      <div className="x-govuk-ui-task-list-name">
        {linked ? (
          <Anchor
            href={href}
            render={render}
            className="x-govuk-ui-task-list-link"
            aria-describedby={described}
          >
            {children}
          </Anchor>
        ) : (
          <span>{children}</span>
        )}
        {hint && (
          <div id={`${id}-hint`} className="x-govuk-ui-task-list-hint">
            {hint}
          </div>
        )}
      </div>
      {/* Each new status rises into place. Its key restarts the movement. */}
      <div
        id={`${id}-status`}
        key={status}
        className="x-govuk-ui-task-list-status"
        // A task that becomes complete by itself, as an agent's tasks do, ticks softly.
        data-sound-enter={status === "completed" ? "tick" : undefined}
      >
        {status === "working" && <Spinner size="small" />}
        {colour ? <Tag colour={colour}>{label}</Tag> : label}
      </div>
    </li>
  );
}
