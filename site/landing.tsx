import { Kbd } from "x-govuk-ui";
import { type ComponentName, catalogue, componentNames, componentOrder, groups } from "./catalogue";
import { LandingArt } from "./landing-art";
import { ExperimentalMark, opensInPlace } from "./workbench-sidebar";

/**
 * The workbench's own page, at /workbench. It draws every component under its group, as a
 * catalogue pictures its parts. It counts them and says how to find one, and each drawing opens
 * its component. The preview has the window to itself, because there are no props to show. An
 * experimental component's drawing has the sidebar's flask on its top edge, which the lead
 * explains, so its name needs no flask beside it.
 */
export function WorkbenchLanding({ onOpen }: { onOpen: (name: ComponentName) => void }) {
  const experimental = componentNames.some((key) => catalogue[key].experimental);
  return (
    <div className="landing">
      <p className="landing-count">
        <span className="landing-number">{componentNames.length}</span> components
      </p>
      <p className="landing-lead">
        Each has an example to try, props to change and code to copy. Choose one here or from the
        sidebar, or press <Kbd shortcut="K" /> to find it.
        {experimental && " A flask marks one that is experimental, whose API may change."}
      </p>
      <div className="landing-groups">
        {groups.map((group) => {
          const heading = `landing-${group.toLowerCase().replaceAll(" ", "-")}`;
          return (
            <section key={group} className="landing-group" aria-labelledby={heading}>
              <h2 id={heading} className="landing-heading">
                {group}
              </h2>
              <ul className="landing-tiles">
                {componentOrder
                  .filter((key) => catalogue[key].group === group)
                  .map((key) => (
                    <li key={key}>
                      <a
                        className="landing-tile"
                        href={`/workbench/${key}`}
                        onClick={(event) => {
                          if (!opensInPlace(event)) return;
                          event.preventDefault();
                          onOpen(key);
                        }}
                      >
                        <span className="landing-figure">
                          <span className="landing-art">
                            <LandingArt name={key} />
                          </span>
                          {/* Screen readers hear Experimental after the name instead. */}
                          {catalogue[key].experimental && (
                            <span className="landing-flask" aria-hidden="true">
                              <ExperimentalMark />
                            </span>
                          )}
                        </span>
                        <span className="landing-name">
                          {catalogue[key].name}
                          {catalogue[key].experimental && (
                            <>
                              {" "}
                              <span className="x-govuk-ui-visually-hidden">Experimental</span>
                            </>
                          )}
                        </span>
                      </a>
                    </li>
                  ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
