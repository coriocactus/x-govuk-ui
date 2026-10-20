import { type FormEvent, useEffect, useState } from "react";
import { Button, FileUpload, Stack } from "x-govuk-ui";

type Props = {
  label?: string;
  hint?: string;
  multiple?: boolean;
  errorMessage?: string;
  disabled?: boolean;
};

/** Whether a file is of a kind the service takes, as its own check would say. */
const taken = (file: File) => /\.(jpe?g|png|pdf)$/i.test(file.name);

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
  const send = (event: FormEvent<HTMLFormElement>) => {
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
    setStatus(`${files.length === 1 ? "Your file is" : "Your files are"} ready. Nothing was sent.`);
  };

  return (
    <Stack render={<form noValidate onSubmit={send} />}>
      <FileUpload
        id="passport"
        name="passport"
        label={label}
        hint={hint || undefined}
        accept=".jpg,.jpeg,.png,.pdf"
        multiple={multiple}
        errorMessage={problem || undefined}
        disabled={disabled}
        // The service keeps the files, and refuses a file of a kind it does not take, so the field
        // keeps the files it had.
        files={files}
        onFilesChange={(next) => {
          setStatus("");
          if (!next.every(taken)) return setProblem("The selected file must be a JPG, PNG or PDF.");
          setFiles(next);
          setProblem("");
        }}
      />
      <Button type="submit" disabled={disabled}>
        Continue
      </Button>
      <p className="preview-message" role="status">
        {status}
      </p>
    </Stack>
  );
}
