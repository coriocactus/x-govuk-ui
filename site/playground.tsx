import { type ReactNode, useLayoutEffect, useRef } from "react";
import {
  Button,
  Checkbox,
  Checkboxes,
  EmptyState,
  EmptyStateActions,
  EmptyStateDescription,
  EmptyStateTitle,
  FilterChip,
  FilterChips,
  Input,
  Select,
  SelectItem,
  Skeleton,
  Slider,
  Switch,
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
} from "x-govuk-ui";
import type { ComponentName } from "./catalogue";
import type { PartProps } from "./llms";
import { useLoaded } from "./loaded";
import { met, type Preset, type PropDoc, presetAt, startingArgs } from "./props";

type Args = Record<string, unknown>;
type Change = (prop: PropDoc, value: unknown) => void;

/** Words with `names` in code, as the reasons and the JSDoc write them. */
function withCode(text: string): ReactNode {
  // Each name's key is where it starts, because JSDoc can give one name twice.
  let at = 0;
  return text.split(/`([^`]+)`/).map((part, index) => {
    const start = at;
    at += part.length;
    return index % 2 ? <code key={start}>{part}</code> : part;
  });
}

/**
 * What a setting needs of the others, such as "Only with `dim` on", or nothing when it needs
 * nothing. It shows whether or not the needs are met now, so the hint keeps its size as other
 * settings change, and users learn the dependency before they meet it.
 */
function needsOf(prop: PropDoc, all: readonly PropDoc[]): ReactNode {
  const needs = prop.needs ?? [];
  if (needs.length === 0) return null;
  const parts = needs.map((need) => {
    if (!("prop" in need) || !("is" in need)) return need.says;
    const other = all.find((each) => each.name === need.prop);
    if (other?.control?.kind === "switch") return `\`${need.prop}\` ${need.is[0] ? "on" : "off"}`;
    const options = other?.control && "options" in other.control ? other.control.options : [];
    const labels = need.is.map(
      (value) => options.find(([option]) => option === value)?.[1] ?? String(value),
    );
    return `\`${need.prop}\` set to ${listed(labels, "or")}`;
  });
  return withCode(`Only with ${listed(parts, "and")}.`);
}

/** Words in a list, as one writes them, such as "A, B or C". */
function listed(words: readonly string[], last: "and" | "or") {
  if (words.length < 2) return words.join("");
  return `${words.slice(0, -1).join(", ")} ${last} ${words.at(-1)}`;
}

/**
 * A prop's type, where its control does not already say it. A switch is a boolean, a select offers
 * each value of its union, and a number field takes a number. A text field says its type where it
 * takes more than a string, such as a ReactNode.
 */
function typeOf(prop: PropDoc) {
  const control = prop.control;
  if (!control) return prop.type;
  if (control.kind === "switch" && prop.type === "boolean") return null;
  if (control.kind === "number" && prop.type === "number") return null;
  if (control.kind === "text" && prop.type === "string") return null;
  if (control.kind === "range" || control.kind === "checklist") return null;
  if (
    control.kind === "select" &&
    prop.type === control.options.map(([option]) => option).join(" | ")
  )
    return null;
  return prop.type;
}

/**
 * One prop the playground can set, as a control. Every control is the library's own, named by the
 * prop, with any note, and its type where the control does not say it, as its hint. A setting
 * that needs another says so in its hint, and is disabled until it is set.
 */
function PropRow({
  prop,
  value,
  onChange,
  needs,
  disabled,
}: {
  prop: PropDoc;
  value: unknown;
  onChange: Change;
  needs: ReactNode;
  disabled: boolean;
}) {
  const control = prop.control;
  const name = <code>{prop.name}</code>;
  const type = typeOf(prop);
  // What the hint says of the prop, which is its type, where the control does not say it, then its
  // note.
  const said: [name: string, part: ReactNode][] = [];
  if (type) said.push(["type", type]);
  if (prop.note) said.push(["note", withCode(prop.note)]);
  const hint =
    said.length || needs ? (
      <>
        {said.map(([name, part], index) => (
          <span key={name}>
            {index > 0 && ". "}
            {part}
          </span>
        ))}
        {needs && (
          <span className="prop-needs" data-unmet={disabled || undefined}>
            {needs}
          </span>
        )}
      </>
    ) : undefined;
  if (!control) return null;

  switch (control.kind) {
    case "switch":
      return (
        <li className="prop-row" data-prop={prop.name}>
          <Switch
            label={name}
            hint={hint}
            disabled={disabled}
            checked={Boolean(value)}
            onCheckedChange={(checked) => onChange(prop, checked)}
          />
        </li>
      );
    case "checklist": {
      const order = control.options.map(([option]) => String(option));
      return (
        <li className="prop-row prop-row--stacked" data-prop={prop.name}>
          <Checkboxes
            size="small"
            name={prop.name}
            legend={name}
            hint={hint}
            disabled={disabled}
            value={(value as string[] | undefined) ?? []}
            // Kept in the order the options are listed.
            onValueChange={(next) =>
              onChange(
                prop,
                order.filter((each) => next.includes(each)),
              )
            }
          >
            {control.options.map(([option, label]) => (
              <Checkbox key={option} value={String(option)}>
                {label}
              </Checkbox>
            ))}
          </Checkboxes>
        </li>
      );
    }
    case "text":
      return (
        <li className="prop-row prop-row--stacked" data-prop={prop.name}>
          {control.rows ? (
            <Textarea
              label={name}
              hint={hint}
              disabled={disabled}
              rows={control.rows}
              value={String(value ?? "")}
              onChange={(event) => onChange(prop, event.target.value)}
            />
          ) : (
            <Input
              label={name}
              hint={hint}
              disabled={disabled}
              value={String(value ?? "")}
              onChange={(event) => onChange(prop, event.target.value)}
            />
          )}
        </li>
      );
    case "number":
      return (
        <li className="prop-row prop-row--stacked" data-prop={prop.name}>
          <Input
            label={name}
            hint={hint}
            disabled={disabled}
            type="number"
            inputMode="numeric"
            min={control.min}
            // Emptied, the field shows the default and the example uses its own, so a number can be
            // erased and typed over.
            value={value === undefined ? "" : String(value)}
            placeholder={prop.value === undefined ? undefined : String(prop.value)}
            onChange={(event) =>
              onChange(prop, event.target.value === "" ? undefined : Number(event.target.value))
            }
          />
        </li>
      );
    case "range":
      return (
        <li className="prop-row prop-row--stacked" data-prop={prop.name}>
          <Slider
            label={name}
            hint={hint}
            disabled={disabled}
            min={control.min}
            max={control.max}
            step={control.step}
            // A range from 0 to 1, such as a volume, reads as a percentage.
            format={control.max <= 1 ? { style: "percent" } : undefined}
            value={Number(value)}
            onValueChange={(next) => onChange(prop, next)}
          />
        </li>
      );
    case "select":
      return (
        <li className="prop-row prop-row--stacked" data-prop={prop.name}>
          <Select
            label={name}
            hint={hint}
            disabled={disabled}
            size="small"
            value={String(value)}
            onValueChange={(next) => {
              const option = control.options.find(([each]) => String(each) === next);
              if (option) onChange(prop, option[0]);
            }}
          >
            {control.options.map(([option, label]) => (
              <SelectItem key={option} value={String(option)}>
                {label}
              </SelectItem>
            ))}
          </Select>
        </li>
      );
  }
}

/**
 * The settings as the example sees them. A field emptied of its number falls back to its default.
 */
function effectiveArgs(all: readonly PropDoc[], args: Args) {
  const effective = { ...startingArgs(all) };
  for (const [name, value] of Object.entries(args))
    if (value !== undefined) effective[name] = value;
  return effective;
}

/** Whether every setting a prop needs is set, as the example sees the settings. */
const applies = (prop: PropDoc, effective: Args) =>
  (prop.needs ?? []).every((need) => met(need, effective));

/** Props the playground can set, each as a control, disabled while what it needs is not set. */
function ControlList({
  props,
  all,
  args,
  effective,
  onChange,
  saysNeeds = true,
}: {
  props: readonly PropDoc[];
  /** Every setting of the component, which a setting's needs can name. */
  all: readonly PropDoc[];
  args: Args;
  /** The settings as the example sees them, from `effectiveArgs`. */
  effective: Args;
  onChange: Change;
  /** Says what each needs. A list shown only while its needs are met does not need to. */
  saysNeeds?: boolean;
}) {
  return (
    <ul className="prop-list">
      {props.map((prop) => (
        <PropRow
          key={prop.name}
          prop={prop}
          value={args[prop.name]}
          onChange={onChange}
          needs={saysNeeds ? needsOf(prop, all) : null}
          disabled={!applies(prop, effective)}
        />
      ))}
    </ul>
  );
}

/**
 * The props set only in code, which are each part's own props that the playground has no control
 * for. Each part has a table, with each prop's type, what it does and its default. The site reads
 * them from the library's types as it builds. They load when the panel opens, and lines of
 * skeleton stand in for them only if that takes a while.
 */
function CodedProps({
  name,
  heading,
  controlled,
}: {
  name: ComponentName;
  heading: string;
  /** The props that have a control, by name. */
  controlled: ReadonlySet<string>;
}) {
  const { document, failed, slow, retry } = useLoaded<PartProps[]>(`/props/${name}.json`);
  const parts = document
    ?.map((part) => ({ ...part, props: part.props.filter((prop) => !controlled.has(prop.name)) }))
    .filter((part) => part.props.length > 0);
  if (parts?.length === 0) return null;
  return (
    <section className="props-section" aria-labelledby="coded-heading">
      <h3 id="coded-heading">{heading}</h3>
      {failed ? (
        <EmptyState size="small" className="styling-status">
          <EmptyStateTitle level={4}>The props could not be loaded</EmptyStateTitle>
          <EmptyStateDescription>Check your connection, then try again.</EmptyStateDescription>
          <EmptyStateActions>
            <Button variant="secondary" size="small" onClick={retry}>
              Try again
            </Button>
          </EmptyStateActions>
        </EmptyState>
      ) : parts ? (
        parts.map((part) => (
          <Table key={part.name} className="prop-table">
            <TableCaption>
              <code className="styling-name">{part.name}</code>
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Prop</TableHead>
                <TableHead>Default</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {part.props.map((prop) => (
                <TableRow key={prop.name}>
                  <TableHead>
                    <code>{prop.name}</code>
                    <span className="prop-type">{prop.type}</span>
                    {prop.doc && <span className="prop-note">{withCode(prop.doc)}</span>}
                  </TableHead>
                  <TableCell>
                    {(prop.default ?? prop.required) && (
                      <code className="prop-default">{prop.default ?? "Required"}</code>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ))
      ) : (
        <div className="styling-status" aria-busy="true">
          <span className="visually-hidden" role="status">
            Loading props
          </span>
          {slow && <Skeleton lines={6} />}
        </div>
      )}
    </section>
  );
}

/**
 * The playground, from the general to the particular.
 *
 * 1. The examples, which are named starting points that each set the props for one use. They are
 *    filter chips, with at most one on. Picked again, an example starts over. Changing any setting
 *    deselects it, because the settings are then the user's own.
 * 2. The example's own settings, each shown only while what it needs is set.
 * 3. The props the playground can set, each always shown, and disabled while what it needs is not
 *    set.
 * 4. The props set only in code, for each of the component's parts.
 *
 * As example settings appear and disappear above a setting just changed, the panel scrolls by the
 * same amount, so the setting stays under the pointer.
 */
export function PropsPanel({
  name,
  props,
  example = [],
  presets = [],
  args,
  onChange,
  onReplace,
}: {
  name: ComponentName;
  props: readonly PropDoc[];
  example?: readonly PropDoc[];
  presets?: readonly Preset[];
  args: Args;
  onChange: Change;
  /** Sets every setting at once, as an example does. */
  onReplace: (args: Args) => void;
}) {
  const all = [...props, ...example];
  const effective = effectiveArgs(all, args);
  const controls = props.filter((prop) => prop.control);
  const applying = example.filter((prop) => prop.control && applies(prop, effective));
  const chosen = presetAt(presets, effective, startingArgs(all));

  // The setting just changed, and where it was on the screen, to keep it there. The browser's own
  // scroll anchoring keeps the first setting in view still, not the one under the pointer. A
  // setting shown or hidden above the changed one would therefore move it.
  const panel = useRef<HTMLDivElement>(null);
  const held = useRef<{ element: HTMLElement; top: number } | null>(null);
  const hold = (selector: string) => {
    const element = panel.current?.querySelector<HTMLElement>(selector);
    held.current = element ? { element, top: element.getBoundingClientRect().top } : null;
  };
  const change: Change = (prop, value) => {
    hold(`[data-prop="${CSS.escape(prop.name)}"]`);
    onChange(prop, value);
  };
  // Runs after every render, as any change of settings can show or hide example settings above.
  useLayoutEffect(() => {
    const kept = held.current;
    held.current = null;
    if (!kept?.element.isConnected) return;
    const moved = kept.element.getBoundingClientRect().top - kept.top;
    const viewport = kept.element.closest<HTMLElement>(".x-govuk-ui-scroll-area-viewport");
    if (moved && viewport) viewport.scrollTop += moved;
  });

  return (
    <div ref={panel} className="inspector-stack">
      {presets.length > 0 && (
        <section className="props-section" aria-labelledby="presets-heading">
          <h3 id="presets-heading">Examples</h3>
          <p className="inspector-description">
            Each sets the props for one use. Pick it again to start over.
          </p>
          <FilterChips
            label="Examples"
            multiple={false}
            size="small"
            className="prop-presets"
            value={chosen ? [chosen.name] : []}
            onValueChange={(next) => {
              const preset = presets.find((each) => each.name === next[0]);
              hold(".prop-presets");
              onReplace({ ...startingArgs(all), ...preset?.args });
            }}
          >
            {presets.map((preset) => (
              <FilterChip key={preset.name} value={preset.name}>
                {preset.name}
              </FilterChip>
            ))}
          </FilterChips>
        </section>
      )}
      {applying.length > 0 && (
        <section className="props-section" aria-labelledby="example-heading">
          <h3 id="example-heading">Example settings</h3>
          <p className="inspector-description">These change the example, not the component.</p>
          <ControlList
            props={applying}
            all={all}
            args={args}
            effective={effective}
            onChange={change}
            saysNeeds={false}
          />
        </section>
      )}
      {controls.length > 0 && (
        <section className="props-section" aria-labelledby="props-heading">
          <h3 id="props-heading">Props</h3>
          <ControlList
            props={controls}
            all={all}
            args={args}
            effective={effective}
            onChange={change}
          />
        </section>
      )}
      <CodedProps
        name={name}
        heading={controls.length ? "Set in code" : "Props"}
        controlled={new Set(controls.map((prop) => prop.name))}
      />
    </div>
  );
}
