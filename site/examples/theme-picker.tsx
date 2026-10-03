import { useRef } from "react";
import { Button, Tag, ThemePicker, useTheme } from "x-govuk-ui";

// Here the picker sets the theme of the panel beneath it, so the workbench keeps its own. In a
// service, leave out `element`, and it sets the whole page's theme.
export default function ThemePickerExample() {
  const panel = useRef<HTMLDivElement>(null);
  const appearance = useTheme({ element: panel });
  return (
    <div ref={panel} className="preview-theme">
      <div className="preview-theme-bar">
        <strong>Apply for a licence</strong>
        <ThemePicker value={appearance.theme} onValueChange={appearance.setTheme} />
      </div>
      <div className="preview-theme-body">
        <p>
          Your application <Tag colour="green">Sent</Tag>
        </p>
        <Button size="small">Continue</Button>
      </div>
    </div>
  );
}
