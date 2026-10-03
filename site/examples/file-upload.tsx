import { useEffect, useState } from "react";
import { Button, FileUpload } from "x-govuk-ui";

type Props = {
  label?: string;
  hint?: string;
  multiple?: boolean;
  errorMessage?: string;
  disabled?: boolean;
};

export default function FileUploadExample({
  label = "Upload a photo of your passport",
  hint = "It must be a JPG, PNG or PDF, and smaller than 10 MB.",
  multiple = false,
  errorMessage = "",
  disabled = false,
}: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const [problem, setProblem] = useState(errorMessage);
  const [status, setStatus] = useState("");
  useEffect(() => setProblem(errorMessage), [errorMessage]);
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (!files.length) {
          setProblem(multiple ? "Select at least one file." : "Select a file.");
          setStatus("");
          return;
        }
        if (files.some((file) => file.size > 10 * 1024 * 1024)) {
          setProblem("The file must be smaller than 10 MB.");
          return;
        }
        setProblem("");
        setStatus(
          `${files.length === 1 ? "Your file is" : "Your files are"} ready. Nothing was sent.`,
        );
      }}
    >
      <FileUpload
        id="passport"
        name="passport"
        label={label}
        hint={hint || undefined}
        accept=".jpg,.jpeg,.png,.pdf"
        multiple={multiple}
        errorMessage={problem || undefined}
        disabled={disabled}
        onFilesChange={(next) => {
          setFiles(next);
          setProblem("");
          setStatus("");
        }}
      />
      <div className="preview-actions">
        <Button type="submit" disabled={disabled}>
          Continue
        </Button>
      </div>
      <p className="preview-message" role="status">
        {status}
      </p>
    </form>
  );
}
