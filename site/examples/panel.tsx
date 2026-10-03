import { Panel } from "x-govuk-ui";

type Props = { title?: string };

export default function PanelExample({ title = "Application complete" }: Props) {
  return (
    <Panel title={title}>
      Your reference number
      <br />
      <strong>HDJ2123F</strong>
    </Panel>
  );
}
