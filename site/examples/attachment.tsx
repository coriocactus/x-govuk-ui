import { Attachment } from "x-govuk-ui";

type Props = { accessibility?: boolean };

export default function AttachmentExample({ accessibility = true }: Props) {
  return (
    <Attachment
      title="Passport fees from April 2026"
      href="#fees"
      format="PDF"
      size="245 KB"
      pages={12}
      accessibleFormatEmail={accessibility ? "publications@example.gov.uk" : undefined}
    />
  );
}
