"use client";

import {
  type ComponentPropsWithRef,
  type CSSProperties,
  type DragEvent,
  type ReactNode,
  useId,
  useRef,
  useState,
} from "react";
import { both } from "./events";
import { ErrorMessage, Field, Hint, Label, present, useControlProps } from "./field";
import { useLabels, useLocale } from "./labels";
import { useMergedRef } from "./refs";
import { useScopeSound } from "./sound-scope";

export type FileUploadProps = Omit<
  ComponentPropsWithRef<"input">,
  "type" | "value" | "defaultValue" | "onChange"
> & {
  label: ReactNode;
  hint?: ReactNode;
  /** Hides the label visually. Screen readers still announce it. */
  hideLabel?: boolean;
  errorMessage?: ReactNode;
  /** Called with the chosen files, after choosing, dropping or removing one. */
  onFilesChange?: (files: File[]) => void;
  /** Its words, in place of a LabelsProvider's or the defaults. */
  labels?: Partial<FileUploadLabels>;
};

/** The words FileUpload writes, which a LabelsProvider or its `labels` can change. */
export type FileUploadLabels = {
  /** The zone's button, for one file and for several. */
  choose: string;
  chooseMany: string;
  /** What the zone says beside the button, for one file and for several. */
  drop: string;
  dropMany: string;
  /** Shown while nothing is chosen, for one file and for several. */
  noFile: string;
  noFiles: string;
  /** Each file's button. Screen readers hear the file's name after it. */
  remove: string;
  /** A file's size, given as a number already written in the language. */
  kilobytes: (size: string) => string;
  megabytes: (size: string) => string;
};

export const defaultFileUploadLabels: FileUploadLabels = {
  choose: "Choose file",
  chooseMany: "Choose files",
  drop: "or drop a file here",
  dropMany: "or drop files here",
  noFile: "No file chosen",
  noFiles: "No files chosen",
  remove: "Remove",
  kilobytes: (size) => `${size} KB`,
  megabytes: (size) => `${size} MB`,
};

/**
 * GOV.UK's file upload, as a drop zone. The native file input lies over the whole zone, so pressing
 * anywhere opens the picker, and dropping files onto it works as the browser's own does. While
 * files are dragged over it, the zone lights up in brand blue, and its contents lean towards the
 * pointer. Each chosen file is listed with its size and a button to remove it.
 *
 * It is a bound Field with a Label, a Hint, an ErrorMessage and a FileUploadControl. Compose those
 * parts yourself to put something between them.
 */
export function FileUpload({
  label,
  hint,
  hideLabel = false,
  errorMessage,
  id,
  "aria-describedby": describedBy,
  ...props
}: FileUploadProps) {
  const generated = useId();
  return (
    <Field
      controlId={id ?? `field-${generated}`}
      name={props.name}
      hasHint={present(hint)}
      errorMessage={errorMessage}
      describedBy={describedBy}
    >
      <Label visuallyHidden={hideLabel}>{label}</Label>
      <Hint>{hint}</Hint>
      <ErrorMessage />
      <FileUploadControl {...props} />
    </Field>
  );
}

export type FileUploadControlProps = Omit<
  FileUploadProps,
  "label" | "hint" | "hideLabel" | "errorMessage"
>;

/**
 * File upload's control on its own, for a field composed from Field's parts. It is the drop zone,
 * with the native input over it, and the list of chosen files beneath. In a bound Field, the input
 * takes its id, name and descriptions from the field. The input is described by the list too, so
 * screen readers hear which files are chosen. Its `className` goes on the zone.
 *
 * Your own drag and drop handlers run before the zone's own, which run whatever yours do, because
 * preventing a drop's default is how a page takes files.
 */
export function FileUploadControl(given: FileUploadControlProps) {
  const {
    onFilesChange,
    multiple = false,
    labels: ownLabels,
    className = "",
    disabled,
    ref,
    onDragEnter,
    onDragOver,
    onDragLeave,
    onDrop,
    ...props
  } = useControlProps(given);
  const generated = useId();
  const controlId = props.id ?? `file-${generated}`;
  const invalid = props["aria-invalid"] === true || props["aria-invalid"] === "true";
  const labels = useLabels("fileUpload", defaultFileUploadLabels, ownLabels);
  const number = new Intl.NumberFormat(useLocale(), { maximumFractionDigits: 1 });
  const sizeOf = (bytes: number) =>
    bytes < 1024 * 1024
      ? labels.kilobytes(number.format(Math.max(1, bytes / 1024)))
      : labels.megabytes(number.format(bytes / 1024 / 1024));
  const input = useRef<HTMLInputElement>(null);
  const inputRef = useMergedRef(input, ref);
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [pull, setPull] = useState({ x: 0, y: 0 });
  const play = useScopeSound();
  const listId = `${controlId}-files`;

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
    <>
      <div
        className={`x-govuk-ui-file-upload ${className}`.trim()}
        data-dragging={dragging || undefined}
        data-disabled={disabled || undefined}
        data-invalid={invalid || undefined}
        style={
          {
            "--x-govuk-ui-pull-x": `${pull.x}px`,
            "--x-govuk-ui-pull-y": `${pull.y}px`,
          } as CSSProperties
        }
      >
        <input
          ref={inputRef}
          type="file"
          multiple={multiple}
          disabled={disabled}
          {...props}
          id={controlId}
          aria-describedby={[props["aria-describedby"], listId].filter(Boolean).join(" ")}
          className="x-govuk-ui-file-upload-input"
          onChange={(event) => {
            const next = Array.from(event.target.files ?? []);
            update(next);
            if (next.length) play("select");
          }}
          onDragEnter={both(onDragEnter, (event) => {
            setDragging(true);
            lean(event);
          })}
          onDragOver={both(onDragOver, lean)}
          onDragLeave={both(onDragLeave, () => {
            setDragging(false);
            setPull({ x: 0, y: 0 });
          })}
          onDrop={both(onDrop, () => {
            setDragging(false);
            setPull({ x: 0, y: 0 });
          })}
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
            <span className="x-govuk-ui-file-upload-choose">
              {multiple ? labels.chooseMany : labels.choose}
            </span>{" "}
            {multiple ? labels.dropMany : labels.drop}
          </span>
        </span>
      </div>
      <div id={listId} className="x-govuk-ui-file-upload-files" aria-live="polite">
        {files.length ? (
          <ul className="x-govuk-ui-file-upload-list">
            {files.map((file) => (
              <li key={`${file.name}-${file.size}-${file.lastModified}`}>
                <span className="x-govuk-ui-file-upload-name">{file.name}</span>
                <span className="x-govuk-ui-file-upload-size">{sizeOf(file.size)}</span>
                <button
                  type="button"
                  className="x-govuk-ui-file-upload-remove"
                  onClick={() => remove(file)}
                  disabled={disabled}
                >
                  {labels.remove}
                  <span className="x-govuk-ui-visually-hidden"> {file.name}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="x-govuk-ui-file-upload-empty">
            {multiple ? labels.noFiles : labels.noFile}
          </p>
        )}
      </div>
    </>
  );
}
