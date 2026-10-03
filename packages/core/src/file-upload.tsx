"use client";

import {
  type ComponentPropsWithRef,
  type CSSProperties,
  type DragEvent,
  type ReactNode,
  useRef,
  useState,
} from "react";
import { ErrorMessage, Field, Hint, Label, useField } from "./field";
import { useScopeSound } from "./sound-scope";

export type FileUploadProps = Omit<
  ComponentPropsWithRef<"input">,
  "type" | "value" | "defaultValue" | "onChange"
> & {
  label: ReactNode;
  hint?: ReactNode;
  /** Hides the label visually. Screen readers still announce it. */
  hideLabel?: boolean;
  errorMessage?: string;
  /** Called with the chosen files, after choosing, dropping or removing one. */
  onFilesChange?: (files: File[]) => void;
  /** What the zone's button says. By default, "Choose file", or "Choose files" for several. */
  chooseText?: string;
  /** What the zone says beside the button. */
  dropText?: string;
  /** Shown while nothing is chosen. */
  noFileText?: string;
};

const size = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 });
const formatSize = (bytes: number) =>
  bytes < 1024 * 1024
    ? `${size.format(Math.max(1, bytes / 1024))} KB`
    : `${size.format(bytes / 1024 / 1024)} MB`;

/**
 * GOV.UK's file upload, as a drop zone. The native file input lies over the whole zone, so pressing
 * anywhere opens the picker, and dropping files onto it works as the browser's own does. While
 * files are dragged over it, the zone lights up in brand blue, and its contents lean towards the
 * pointer. Each chosen file is listed with its size and a button to remove it.
 */
export function FileUpload({
  label,
  hint,
  hideLabel = false,
  errorMessage,
  onFilesChange,
  multiple = false,
  chooseText = multiple ? "Choose files" : "Choose file",
  dropText = multiple ? "or drop files here" : "or drop a file here",
  noFileText = multiple ? "No files chosen" : "No file chosen",
  id,
  className = "",
  disabled,
  "aria-describedby": describedBy,
  ...props
}: FileUploadProps) {
  const field = useField({
    id,
    name: props.name,
    hint,
    errorMessage,
    "aria-describedby": describedBy,
  });
  const input = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [pull, setPull] = useState({ x: 0, y: 0 });
  const play = useScopeSound();
  const listId = `${field.id}-files`;

  const update = (next: File[]) => {
    setFiles(next);
    onFilesChange?.(next);
  };
  const remove = (file: File) => {
    const element = input.current;
    if (!element) return;
    // A file input's list cannot be edited, so it is replaced by one without the file.
    const transfer = new DataTransfer();
    for (const each of files) if (each !== file) transfer.items.add(each);
    element.files = transfer.files;
    update(Array.from(transfer.files));
    element.focus();
  };
  // While files are dragged over the zone, its contents lean a little towards the pointer.
  const lean = (event: DragEvent<HTMLInputElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    setPull({
      x: (event.clientX - box.left - box.width / 2) * 0.06,
      y: (event.clientY - box.top - box.height / 2) * 0.1,
    });
  };

  return (
    <Field invalid={field.invalid}>
      <Label htmlFor={field.id} visuallyHidden={hideLabel}>
        {label}
      </Label>
      <Hint id={field.hintId}>{hint}</Hint>
      <ErrorMessage id={field.errorId}>{field.errorMessage}</ErrorMessage>
      <div
        className={`x-govuk-ui-file-upload ${className}`.trim()}
        data-dragging={dragging || undefined}
        data-disabled={disabled || undefined}
        data-invalid={field.invalid || undefined}
        style={
          {
            "--x-govuk-ui-pull-x": `${pull.x}px`,
            "--x-govuk-ui-pull-y": `${pull.y}px`,
          } as CSSProperties
        }
      >
        <input
          ref={input}
          type="file"
          multiple={multiple}
          disabled={disabled}
          {...props}
          {...field.controlProps}
          aria-describedby={[field.controlProps["aria-describedby"], listId]
            .filter(Boolean)
            .join(" ")}
          className="x-govuk-ui-file-upload-input"
          onChange={(event) => {
            const next = Array.from(event.target.files ?? []);
            update(next);
            if (next.length) play("select");
          }}
          onDragEnter={(event) => {
            setDragging(true);
            lean(event);
          }}
          onDragOver={lean}
          onDragLeave={() => {
            setDragging(false);
            setPull({ x: 0, y: 0 });
          }}
          onDrop={() => {
            setDragging(false);
            setPull({ x: 0, y: 0 });
          }}
        />
        <span className="x-govuk-ui-file-upload-body" aria-hidden="true">
          <svg
            className="x-govuk-ui-file-upload-icon"
            viewBox="0 0 24 24"
            width="28"
            height="28"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 16V4m0 0-5 5m5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
          </svg>
          <span className="x-govuk-ui-file-upload-text">
            <span className="x-govuk-ui-file-upload-choose">{chooseText}</span> {dropText}
          </span>
        </span>
      </div>
      <div id={listId} className="x-govuk-ui-file-upload-files" aria-live="polite">
        {files.length ? (
          <ul className="x-govuk-ui-file-upload-list">
            {files.map((file) => (
              <li key={`${file.name}-${file.size}-${file.lastModified}`}>
                <span className="x-govuk-ui-file-upload-name">{file.name}</span>
                <span className="x-govuk-ui-file-upload-size">{formatSize(file.size)}</span>
                <button
                  type="button"
                  className="x-govuk-ui-file-upload-remove"
                  onClick={() => remove(file)}
                  disabled={disabled}
                >
                  Remove<span className="x-govuk-ui-visually-hidden"> {file.name}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="x-govuk-ui-file-upload-empty">{noFileText}</p>
        )}
      </div>
    </Field>
  );
}
