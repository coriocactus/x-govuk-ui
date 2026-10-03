import { VisuallyHidden } from "x-govuk-ui";

type Props = { reveal?: boolean };

export default function VisuallyHiddenExample({ reveal = false }: Props) {
  // Revealing outlines the hidden words, to show what screen readers hear.
  return (
    <dl className="preview-hidden" data-reveal={reveal || undefined}>
      <div>
        <dt>Name</dt>
        <dd>Clement Attlee</dd>
        <dd>
          <a href="#name" className="x-govuk-ui-link">
            Change<VisuallyHidden> name</VisuallyHidden>
          </a>
        </dd>
      </div>
      <div>
        <dt>Phone number</dt>
        <dd>07700 900457</dd>
        <dd>
          <a href="#phone" className="x-govuk-ui-link">
            Change<VisuallyHidden> phone number</VisuallyHidden>
          </a>
        </dd>
      </div>
    </dl>
  );
}
