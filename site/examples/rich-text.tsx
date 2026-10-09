import { RichText } from "x-govuk-ui";

type Props = {
  format?: "html" | "markdown";
  html?: string;
  markdown?: string;
};

export default function RichTextExample({
  format = "html",
  html = '<h2>Who can apply</h2><p>You can apply for a <strong>rod fishing licence</strong> if you are 13 or over. Children under 13 do not need one.</p><p>A licence covers:</p><ul><li>salmon and sea trout, or</li><li>trout, coarse fish and eels</li></ul><p>Read the <a href="https://www.gov.uk/">byelaws for your region</a> before you fish.</p>',
  markdown = "## Who can apply\n\nYou can apply for a **rod fishing licence** if you are 13 or over. Children under 13 do not need one.\n\nA licence covers:\n\n- salmon and sea trout, or\n- trout, coarse fish and eels\n\nRead the [byelaws for your region](https://www.gov.uk/) before you fish.\n",
}: Props) {
  return format === "markdown" ? <RichText markdown={markdown} /> : <RichText html={html} />;
}
