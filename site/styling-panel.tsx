import {
  Button,
  EmptyState,
  EmptyStateActions,
  EmptyStateDescription,
  EmptyStateTitle,
  Skeleton,
} from "x-govuk-ui";
import type { ComponentName } from "./catalogue";
import { useLoaded } from "./loaded";
import type { StylingContract } from "./styling";

/** Names, one on each line, each in full, under a label if it has one. */
function Lines({
  label,
  names,
  prefix = "",
}: {
  label?: string;
  names: readonly string[];
  prefix?: string;
}) {
  return (
    <span className="styling-lines">
      {label && <span className="styling-note">{label}</span>}
      {names.map((name) => (
        <code key={name}>
          {prefix}
          {name}
        </code>
      ))}
    </span>
  );
}

/**
 * The playground's Styling tab, which shows the component's styling contract. The site reads it
 * from the library's source as it builds. It loads when the tab opens, and lines of skeleton stand
 * in for it only if it takes a while.
 */
export function StylingPanel({ name }: { name: ComponentName }) {
  const {
    document: contract,
    failed,
    slow,
    retry,
  } = useLoaded<StylingContract>(`/styling/${name}.json`);

  if (failed)
    return (
      <EmptyState size="small" className="styling-status">
        <EmptyStateTitle level={3}>The styling could not be loaded</EmptyStateTitle>
        <EmptyStateDescription>Check your connection, then try again.</EmptyStateDescription>
        <EmptyStateActions>
          <Button variant="secondary" size="small" onClick={retry}>
            Try again
          </Button>
        </EmptyStateActions>
      </EmptyState>
    );
  if (!contract)
    return (
      <div className="styling-status" aria-busy="true">
        <span className="visually-hidden" role="status">
          Loading styling
        </span>
        {slow && <Skeleton lines={6} />}
      </div>
    );

  return (
    <div className="inspector-stack">
      <p className="inspector-description styling-intro">
        Style any part from your own stylesheet. The library's rules sit in the{" "}
        <code>x-govuk-ui</code> cascade layer, so yours override them.
      </p>
      <section className="props-section" aria-labelledby="styling-classes">
        <h3 id="styling-classes">Classes</h3>
        <ul className="styling-list">
          {contract.parts.map((part) => (
            <li key={part.name} className="styling-row">
              <code className="styling-name">{part.name}</code>
              {part.classes.length > 0 ? (
                <Lines names={part.classes} prefix="." />
              ) : (
                <span className="styling-note">No element of its own</span>
              )}
              {part.inner.length > 0 && <Lines label="Inside" names={part.inner} prefix="." />}
            </li>
          ))}
        </ul>
      </section>
      {contract.states.length > 0 && (
        <section className="props-section" aria-labelledby="styling-states">
          <h3 id="styling-states">Data attributes</h3>
          <ul className="styling-list">
            {contract.states.map((state) => (
              <li key={state.attribute} className="styling-row">
                <code className="styling-name">{state.attribute}</code>
                {state.values.length > 0 && (
                  <Lines label="Values" names={state.values.map((value) => `"${value}"`)} />
                )}
                <Lines label="On" names={state.classes} prefix="." />
                <span className="styling-note">Set by {state.by}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {contract.properties.length > 0 && (
        <section className="props-section" aria-labelledby="styling-properties">
          <h3 id="styling-properties">Custom properties</h3>
          <ul className="styling-list">
            {contract.properties.map((property) => (
              <li key={property.name} className="styling-row">
                <code className="styling-name">{property.name}</code>
                {property.value && <code className="prop-default">{property.value}</code>}
                {property.classes.length > 0 && (
                  <Lines label="On" names={property.classes} prefix="." />
                )}
                {property.inline && (
                  <span className="styling-note">
                    The component writes it on the element, from a prop or a measurement, and what
                    it writes overrides your stylesheet.
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
      {contract.tokens.length > 0 && (
        <section className="props-section" aria-labelledby="styling-tokens">
          <h3 id="styling-tokens">Theme tokens</h3>
          <p className="inspector-description">
            It reads these. Changing one changes every component that reads it.
          </p>
          <div className="styling-tokens">
            <Lines names={contract.tokens} />
          </div>
        </section>
      )}
    </div>
  );
}
