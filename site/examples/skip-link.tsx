import { SkipLink } from "x-govuk-ui";

export default function SkipLinkExample() {
  return (
    <div className="preview-skip">
      <SkipLink href="#example-content" />
      <p className="preview-hint">
        Press Tab to show the skip link. Follow it, and focus moves to the content below.
      </p>
      <main id="example-content" className="preview-skip-content">
        <h2>Apply for a licence</h2>
        <p>Use this service to apply for a premises licence.</p>
      </main>
    </div>
  );
}
