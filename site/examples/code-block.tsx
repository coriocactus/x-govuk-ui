import { useState } from "react";
import { CodeBlock, CodeBlockCopy } from "x-govuk-ui";

type Props = {
  language?: "tsx" | "python" | "ruby" | "html" | "shell";
  lineNumbers?: boolean;
  editable?: boolean;
  wrap?: boolean;
  rows?: number;
  maxRows?: number;
  /** Names the file in a header. Without it, Copy floats over the code. */
  header?: boolean;
  /** Repeats the sample to about 2,000 lines, to try scrolling and typing in a long file. */
  long?: boolean;
};

const samples = {
  tsx: {
    filename: "national-insurance.tsx",
    code: `import { Button, Input } from "x-govuk-ui";

export function NationalInsuranceNumber() {
  return (
    <form method="post">
      <Input
        label="What is your National Insurance number?"
        hint="It’s on your National Insurance card, payslip or P60. For example, ‘QQ 12 34 56 C’."
        name="nino"
      />
      <Button>Continue</Button>
    </form>
  );
}
`,
  },
  python: {
    filename: "forms.py",
    code: `from django import forms


class NationalInsuranceForm(forms.Form):
    # Spaces are allowed, so people can copy the number as it is printed.
    nino = forms.RegexField(
        label="What is your National Insurance number?",
        regex=r"^[A-Z]{2} ?\\d{2} ?\\d{2} ?\\d{2} ?[A-D]$",
        error_messages={
            "invalid": "Enter a National Insurance number in the correct format",
        },
    )
`,
  },
  ruby: {
    filename: "national_insurance_form.rb",
    code: `class NationalInsuranceForm
  include ActiveModel::Model

  attr_accessor :nino

  # Spaces are allowed, so people can copy the number as it is printed.
  validates :nino, format: {
    with: /\\A[A-Z]{2} ?\\d{2} ?\\d{2} ?\\d{2} ?[A-D]\\z/,
    message: "Enter a National Insurance number in the correct format",
  }
end
`,
  },
  html: {
    filename: "national-insurance.html",
    code: `<div class="govuk-form-group">
  <h1 class="govuk-label-wrapper">
    <label class="govuk-label govuk-label--l" for="nino">
      What is your National Insurance number?
    </label>
  </h1>
  <div id="nino-hint" class="govuk-hint">
    It’s on your National Insurance card, payslip or P60. For example, ‘QQ 12 34 56 C’.
  </div>
  <input class="govuk-input govuk-input--width-10" id="nino" name="nino" type="text" spellcheck="false" aria-describedby="nino-hint" autocomplete="off">
</div>
`,
  },
  shell: {
    filename: "setup.sh",
    code: `# Install the tools the service needs, then start it on port 3000.
mise install
bun install
bun run dev
`,
  },
};

/** The sample over and over, to about 2,000 lines. */
const lengthen = (code: string) =>
  Array.from({ length: Math.ceil(2000 / code.split("\n").length) }, () => code).join("");

export default function CodeBlockExample({
  language = "tsx",
  lineNumbers = true,
  header = true,
  editable = false,
  wrap = false,
  rows = 0,
  maxRows = 0,
  long = false,
}: Props) {
  // Each sample, short or long, keeps what was typed in it.
  const [edited, setEdited] = useState<Record<string, string>>({});
  const { filename } = samples[language];
  const sample = `${language}${long ? "-long" : ""}`;
  const code = edited[sample] ?? (long ? lengthen(samples[language].code) : samples[language].code);
  // Without rows, the block is as tall as the short sample, with the empty line an editable
  // block keeps for the caret. A long sample scrolls in a box of that size.
  const fit = samples[language].code.replace(/\n$/, "").split("\n").length + (editable ? 1 : 0);
  return (
    <CodeBlock
      code={code}
      editable={editable}
      onCodeChange={(next) => setEdited({ ...edited, [sample]: next })}
      language={language}
      filename={header ? filename : undefined}
      label={filename}
      lineNumbers={lineNumbers}
      wrap={wrap}
      rows={rows || fit}
      maxRows={maxRows || fit}
    >
      <CodeBlockCopy />
    </CodeBlock>
  );
}
