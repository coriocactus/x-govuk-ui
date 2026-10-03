import { Kbd } from "x-govuk-ui";
import { type ComponentName, catalogue, componentNames, componentOrder, groups } from "./catalogue";
import { LandingArt } from "./landing-art";
import { ExperimentalMark, opensInPlace } from "./workbench-sidebar";

/**
 * The workbench's own page, at /workbench. It draws every component under its group, as a
 * catalogue pictures its parts. It counts them and says how to find one, and each drawing opens
 * its component. The preview has the window to itself, because there are no props to show.
 */
export function WorkbenchLanding({ onOpen }: { onOpen: (name: ComponentName) => void }) {
  return (
    <div className="landing">
      <p className="landing-count">
        <span className="landing-number">{componentNames.length}</span> components
      </p>
      <p className="landing-lead">
        Each has an example to try, props to change and code to copy. Choose one here or from the
        sidebar, or press <Kbd shortcut="K" /> to find it.
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
                        <span className="landing-art">
                          <LandingArt name={key} />
                        </span>
                        <span className="landing-name">
                          {catalogue[key].name}
                          {catalogue[key].experimental && (
                            <>
                              {" "}
                              <ExperimentalMark />
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
