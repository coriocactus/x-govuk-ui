import { RichText } from "x-govuk-ui";

type Props = {
  html?: string;
};

export default function RichTextExample({
  html = '<h2>Who can apply</h2><p>You can apply for a <strong>rod fishing licence</strong> if you are 13 or over. Children under 13 do not need one.</p><p>A licence covers:</p><ul><li>salmon and sea trout, or</li><li>trout, coarse fish and eels</li></ul><p>Read the <a href="https://www.gov.uk/">byelaws for your region</a> before you fish.</p>',
}: Props) {
  return <RichText html={html} />;
}
