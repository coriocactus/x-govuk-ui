/**
 * The library's API, read from the TypeScript compiler as the site builds, so the documentation
 * says what the types say. It gives everything a package exports. That is each component's own
 * props, each hook, function and constant, each type, and each map of words in `ComponentLabels`.
 * `site/llms.ts` writes the pages and the records from it.
 *
 * It asks TypeScript's own API, which starts the compiler's program for the platform and answers
 * over a pipe. The compiler checks the whole repository, by the root `tsconfig.json`, so an
 * extension's types and what it adds to `ComponentLabels` are read with core's.
 */
import { resolve } from "node:path";
import {
  type Expression,
  isAsExpression,
  isCallExpression,
  isFunctionDeclaration,
  isIdentifier,
  isInterfaceDeclaration,
  isNoSubstitutionTemplateLiteral,
  isObjectBindingPattern,
  isObjectLiteralExpression,
  isParenthesizedExpression,
  isPropertyAssignment,
  isPropertySignatureDeclaration,
  isSatisfiesExpression,
  isSpreadAssignment,
  isStringLiteral,
  isTypeAliasDeclaration,
  isTypeLiteralNode,
  isTypeReferenceNode,
  isVariableDeclaration,
  isVariableStatement,
  type Node,
} from "typescript/unstable/ast";
import {
  API,
  type Symbol as CompilerSymbol,
  NodeBuilderFlags,
  SignatureKind,
  SymbolFlags,
  type Type,
} from "typescript/unstable/async";

/** One member of an object type. */
export type ApiMember = {
  name: string;
  required: boolean;
  /** Its type as the compiler writes it, without the `| undefined` of an optional member. */
  type: string;
  /** Its JSDoc, each paragraph on one line. */
  doc?: string;
};

/** One prop of a part's own, which the library's source declares. */
export type ApiProp = ApiMember & {
  /** The initialiser the part gives it where it takes its props apart, as written. */
  default?: string;
};

/** An exported component, which is a part of some component's page. */
export type ApiComponent = {
  name: string;
  /** The package it is imported from, such as `x-govuk-ui`. */
  package: string;
  /** The source file that declares it, from the checkout's root. */
  file: string;
  /** Where it starts in its file, which puts a file's parts in the order the file has them. */
  at: number;
  /** The exported type of its props, such as `DialogProps`, where they have one. */
  propsType?: string;
  /** Its own props. Those it takes from React's or Base UI's types are left out. */
  props: ApiProp[];
  /** The keys of the maps of words its `labels` takes, such as `overlay`. */
  labels: string[];
};

/** An exported hook, function or constant, which is any exported value that is not a component. */
export type ApiFunction = {
  name: string;
  /** The package it is imported from, such as `x-govuk-ui`. */
  package: string;
  /** The source file that declares it, from the checkout's root. */
  file: string;
  /** Its type as the compiler writes it, such as `(date: Date) => string`. */
  signature: string;
  /** Its JSDoc, each paragraph on one line. */
  doc?: string;
};

/** An exported type. */
export type ApiType = {
  name: string;
  /** Its type parameters as written, such as `<Row>`. */
  parameters?: string;
  /** The package it is imported from, such as `x-govuk-ui`. */
  package: string;
  /** The source file that declares it, from the checkout's root. */
  file: string;
  /** Its JSDoc, each paragraph on one line. */
  doc?: string;
  /** Its members, where it is an object type, which is an interface or a type literal. */
  members?: ApiMember[];
  /** Any other type, as the compiler writes it, such as `"light" | "dark"`. */
  type?: string;
};

/** One word of a map of words. */
export type ApiWord = {
  name: string;
  type: string;
  /** Its JSDoc, each paragraph on one line. */
  doc?: string;
  /**
   * Its English default. A string is given as it is. Anything else, such as a function, is given as
   * its source text, and `code` says so.
   */
  default?: string;
  code?: true;
};

/** One component's words, which are one map of the `ComponentLabels` interface. */
export type ApiLabels = {
  /** The map's key in `ComponentLabels`, which is its key in a LabelsProvider's `labels`. */
  key: string;
  /** The exported type its words are written in, such as `OverlayLabels`. */
  type?: string;
  /** The export with its English defaults, such as `defaultOverlayLabels`. */
  defaults: string;
  /** The source file that declares the defaults, from the checkout's root. */
  file: string;
  words: ApiWord[];
};

export type Api = {
  /** Every exported component, by its export. */
  components: Record<string, ApiComponent>;
  functions: ApiFunction[];
  types: ApiType[];
  labels: ApiLabels[];
};

/**
 * A JSDoc comment as the compiler gives it, with each paragraph and each item of a list on one
 * line. A fenced block of code keeps its lines.
 */
function flow(comment: string): string | undefined {
  const lines: string[] = [];
  let fenced = false;
  let open = false;
  for (const line of comment.split("\n")) {
    const fence = line.trimStart().startsWith("```");
    if (fence || fenced || !line.trim()) {
      lines.push(line);
      if (fence) fenced = !fenced;
      open = false;
    } else if (open && !/^\s*(?:-|\d+\.)\s/.test(line)) {
      lines[lines.length - 1] += ` ${line.trim()}`;
    } else {
      lines.push(line);
      open = true;
    }
  }
  return lines.join("\n").trim() || undefined;
}

/**
 * An optional prop's type without its `| undefined`. The compiler writes `undefined` last, and
 * puts a function's type in brackets beside it, which then go too.
 */
function withoutUndefined(type: string) {
  if (!type.endsWith(" | undefined")) return type;
  const rest = type.slice(0, -" | undefined".length);
  if (!rest.startsWith("(")) return rest;
  let depth = 0;
  for (let index = 0; index < rest.length; index++) {
    if (rest[index] === "(") depth++;
    else if (rest[index] === ")" && --depth === 0)
      return index === rest.length - 1 ? rest.slice(1, -1) : rest;
  }
  return rest;
}

/** An expression without the brackets, `as` and `satisfies` around it. */
function bare(expression: Expression): Expression {
  let inner = expression;
  while (isParenthesizedExpression(inner) || isAsExpression(inner) || isSatisfiesExpression(inner))
    inner = inner.expression;
  return inner;
}

/**
 * The defaults a component gives its props where it takes them apart, by prop, as written. That is
 * in its parameter, as `({ size = "medium", ...props })`, or in its body, from the parameter or
 * from a call given it, as `const { type = "text" } = useControlProps(given)`.
 */
function defaultsOf(declaration: Node | undefined) {
  const defaults = new Map<string, string>();
  if (!declaration || !isFunctionDeclaration(declaration)) return defaults;
  const [props] = declaration.parameters;
  if (!props) return defaults;
  const read = (pattern: Node) => {
    if (!isObjectBindingPattern(pattern)) return;
    for (const element of pattern.elements) {
      const name = element.propertyName ?? element.name;
      if (name && element.initializer) defaults.set(name.getText(), element.initializer.getText());
    }
  };
  const whole = props.name;
  read(whole);
  if (!isIdentifier(whole)) return defaults;
  const isProps = (node: Node) => isIdentifier(node) && node.text === whole.text;
  for (const statement of declaration.body?.statements ?? []) {
    if (!isVariableStatement(statement)) continue;
    for (const { name, initializer } of statement.declarationList.declarations)
      if (
        initializer &&
        (isProps(initializer) ||
          (isCallExpression(initializer) && initializer.arguments.some(isProps)))
      )
        read(name);
  }
  return defaults;
}

/** The library's API, read once from the compiler. */
export async function readApi(): Promise<Api> {
  const root = process.cwd();
  const api = new API({ cwd: root });
  try {
    const config = resolve(root, "tsconfig.json");
    const snapshot = await api.updateSnapshot({ openProjects: [config] });
    const project = snapshot.getProject(config) ?? snapshot.getProjects()[0];
    if (!project) throw new Error(`The compiler found no project at ${config}`);
    const { checker, program } = project;

    // The compiler writes a file's path in lower case where the file system ignores case.
    const sources = `${root}/packages/`.toLowerCase();
    const ours = (path: string) => path.toLowerCase().startsWith(sources);
    const fileOf = (path: string) => path.slice(root.length + 1);
    const textOf = (type: Type) =>
      checker.typeToString(type, undefined, NodeBuilderFlags.NoTruncation);
    const docOf = async (symbol: CompilerSymbol) =>
      flow(await symbol.getDocumentationComment(checker));
    const named = async (symbol: CompilerSymbol) =>
      symbol.flags & SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
    /**
     * A prop's JSDoc. A prop declared more than once has each declaration's JSDoc, as a part that
     * takes one of several sets of props declares it in each. Only the library's declarations are
     * read, because React's types declare some props too, such as `aria-label`, and what the two
     * say the same is said once.
     */
    const propDocOf = async (prop: CompilerSymbol) => {
      if (prop.declarations.length === 1) return docOf(prop);
      const docs = await Promise.all(
        prop.declarations
          .filter(({ path }) => ours(path))
          .map(async (handle) => {
            const declared = await handle.resolve();
            const symbol =
              declared &&
              isPropertySignatureDeclaration(declared) &&
              (await checker.getSymbolAtLocation(declared.name));
            return symbol ? symbol.getDocumentationComment(checker) : "";
          }),
      );
      return flow([...new Set(docs.filter(Boolean))].join("\n"));
    };

    // Every export of every package, core's first, each with the symbol it names.
    const packages = [...new Bun.Glob("packages/*/package.json").scanSync(".")].sort(
      (a, b) => Number(b.includes("/core/")) - Number(a.includes("/core/")) || a.localeCompare(b),
    );
    const exported: { name: string; from: string; symbol: CompilerSymbol }[] = [];
    for (const manifest of packages) {
      const { name: from } = await Bun.file(manifest).json();
      const index = await program.getSourceFile(
        resolve(root, manifest.replace("package.json", "src/index.ts")),
      );
      const module = index && (await checker.getSymbolAtLocation(index));
      if (!module) throw new Error(`The compiler found no exports for ${from}`);
      for (const symbol of await checker.getExportsOfModule(module))
        exported.push({
          name: symbol.name,
          from,
          symbol: await named(symbol),
        });
    }
    const byName = new Map(exported.map((one) => [one.name, one.symbol]));

    // The maps of words. Each is a property of `ComponentLabels`, with its English defaults in the
    // export named for its key, as `defaultOverlayLabels` is for `overlay`.
    const interfaceFile = await program.getSourceFile(
      resolve(root, "packages/core/src/labels.tsx"),
    );
    const maps =
      interfaceFile &&
      (await checker.resolveName("ComponentLabels", SymbolFlags.Interface, interfaceFile));
    if (!maps) throw new Error("The compiler found no ComponentLabels");
    const keys = await checker.getPropertiesOfType(await checker.getDeclaredTypeOfSymbol(maps));
    // A map by the type its words are written in, so that `Partial<OverlayLabels>` is known for
    // `overlay`, and `Partial<ChartLabels>` for `chart`, which is `Omit<ChartLabels, "locale">`.
    // That type is found inside the helpers around it, such as `Partial`, and beside `undefined`.
    const mapTypes = async (type: Type): Promise<number[]> => {
      const given = await type.getAliasTypeArguments();
      const within = given.length ? given : type.isUnionType() ? await type.getTypes() : [];
      if (within?.length) return (await Promise.all(within.map(mapTypes))).flat();
      return type.isObjectType() || type.isIntersectionType() ? [type.id] : [];
    };
    const keyOf = new Map<number, string>();
    /** The words an object of defaults gives, by name, as each is written. */
    const defaultsIn = async (object: Expression, found = new Map<string, Expression>()) => {
      const literal = bare(object);
      if (!isObjectLiteralExpression(literal)) return found;
      for (const property of literal.properties) {
        if (isPropertyAssignment(property))
          found.set(
            isStringLiteral(property.name) ? property.name.text : property.name.getText(),
            property.initializer,
          );
        // Another map's defaults, spread in, as a QuestionCard starts from a FormSteps's words.
        else if (isSpreadAssignment(property)) {
          const from = await checker.getSymbolAtLocation(property.expression);
          const declared = from && (await (await named(from)).valueDeclaration?.resolve());
          if (declared && isVariableDeclaration(declared) && declared.initializer)
            await defaultsIn(declared.initializer, found);
        }
      }
      return found;
    };
    const labels = await Promise.all(
      keys.map(async (key): Promise<ApiLabels> => {
        const type = await checker.getTypeOfSymbol(key);
        if (!type) throw new Error(`The compiler found no type for the words of ${key.name}`);
        for (const id of await mapTypes(type)) keyOf.set(id, key.name);
        const defaults = `default${key.name[0]?.toUpperCase()}${key.name.slice(1)}Labels`;
        const declared = await byName.get(defaults)?.valueDeclaration?.resolve();
        if (!declared || !isVariableDeclaration(declared) || !declared.initializer)
          throw new Error(`The words of ${key.name} have no ${defaults}`);
        const given = await defaultsIn(declared.initializer);
        const words = await checker.getPropertiesOfType(type);
        const types = await checker.getTypeOfSymbol(words);
        return {
          key: key.name,
          defaults,
          file: fileOf(declared.getSourceFile().path),
          words: await Promise.all(
            words.map(async (word, index): Promise<ApiWord> => {
              const wordType = types[index];
              const value = given.get(word.name);
              const literal = value && bare(value);
              const string =
                literal && (isStringLiteral(literal) || isNoSubstitutionTemplateLiteral(literal))
                  ? literal.text
                  : undefined;
              return {
                name: word.name,
                type: wordType ? await textOf(wordType) : "unknown",
                doc: await docOf(word),
                ...(string !== undefined
                  ? { default: string }
                  : value && { default: value.getText(), code: true }),
              };
            }),
          ),
        };
      }),
    );

    const defaults = new Set(labels.map((map) => map.defaults));
    const typed = (symbol: CompilerSymbol) =>
      symbol.flags & (SymbolFlags.TypeAlias | SymbolFlags.Interface);
    const types = new Set(exported.flatMap(({ name, symbol }) => (typed(symbol) ? [name] : [])));
    /** A type's members, or a part's props, each with its type and JSDoc. */
    const membersOf = async (members: readonly CompilerSymbol[]) => {
      const memberTypes = await checker.getTypeOfSymbol(members);
      return Promise.all(
        members.map(async (member, index): Promise<ApiMember> => {
          const type = memberTypes[index];
          const text = type ? await textOf(type) : "unknown";
          const required = !(member.flags & SymbolFlags.Optional);
          return {
            name: member.name,
            required,
            type: required ? text : withoutUndefined(text),
            doc: await propDocOf(member),
          };
        }),
      );
    };

    /** An export's value, which is a component, or a hook, function or constant. */
    const exportedValue = async ({ name, from, symbol }: (typeof exported)[number]) => {
      // A map's defaults are given with its words.
      if (!symbol.valueDeclaration || defaults.has(name)) return {};
      const type = await checker.getTypeOfSymbol(symbol);
      if (!type) return {};
      const file = fileOf(symbol.valueDeclaration.path);
      // A component is a function named with a capital, as React asks.
      if (!(symbol.flags & SymbolFlags.Function) || !/^[A-Z]/.test(name)) {
        const value: ApiFunction = {
          name,
          package: from,
          file,
          signature: await textOf(type),
          doc: await docOf(symbol),
        };
        return { value };
      }
      const [signature] = await checker.getSignaturesOfType(type, SignatureKind.Call);
      const taken = signature && (await checker.getParameterType(signature, 0));
      const declaration = await symbol.valueDeclaration.resolve();
      const all = taken ? await checker.getPropertiesOfType(taken) : [];
      // A prop is the part's own when the library's source declares it. A part can declare a
      // prop that React's types declare too, such as a `children` it requires.
      const own = all.filter((prop) => prop.declarations.some(({ path }) => ours(path)));
      const given = defaultsOf(declaration);
      const takes = own.find((prop) => prop.name === "labels");
      const takesType = takes && (await checker.getTypeOfSymbol(takes));
      // The type its props are written as, such as `DialogProps`, where a package exports it.
      const written =
        declaration && isFunctionDeclaration(declaration) && declaration.parameters[0]?.type;
      const propsType =
        written && isTypeReferenceNode(written) && isIdentifier(written.typeName)
          ? written.typeName.text
          : undefined;
      const component: ApiComponent = {
        name,
        package: from,
        file,
        at: declaration?.getStart() ?? 0,
        ...(propsType && types.has(propsType) && { propsType }),
        props: (await membersOf(own)).map((prop): ApiProp => {
          const fallback = given.get(prop.name);
          return fallback === undefined ? prop : { ...prop, default: fallback };
        }),
        labels: takesType
          ? [...new Set((await mapTypes(takesType)).flatMap((id) => keyOf.get(id) ?? []))]
          : [],
      };
      return { component };
    };

    /** An export's type. An interface or a type literal gives its members. */
    const exportedType = async ({ name, from, symbol }: (typeof exported)[number]) => {
      if (!typed(symbol)) return {};
      const declared = await symbol.declarations[0]?.resolve();
      if (!declared || !(isInterfaceDeclaration(declared) || isTypeAliasDeclaration(declared)))
        return {};
      const declaredType = await checker.getDeclaredTypeOfSymbol(symbol);
      const object = isInterfaceDeclaration(declared) || isTypeLiteralNode(declared.type);
      const type: ApiType = {
        name,
        ...(declared.typeParameters && {
          parameters: `<${declared.typeParameters.map((one) => one.getText()).join(", ")}>`,
        }),
        package: from,
        file: fileOf(declared.getSourceFile().path),
        doc: await docOf(symbol),
        ...(object
          ? { members: await membersOf(await checker.getPropertiesOfType(declaredType)) }
          : {
              type: await checker.typeToString(
                declaredType,
                undefined,
                NodeBuilderFlags.NoTruncation | NodeBuilderFlags.InTypeAlias,
              ),
            }),
      };
      return { type, words: keyOf.get(declaredType.id) };
    };

    // Each export's answer keeps its export's place, whichever answer came first.
    const read = await Promise.all(
      exported.map(async (one) => ({
        ...(await exportedValue(one)),
        ...(await exportedType(one)),
      })),
    );
    // The type each map's words are written in, by the map's key.
    const wordsTypes = new Map(
      read.flatMap((one) => (one.words && one.type ? [[one.words, one.type.name] as const] : [])),
    );
    return {
      components: Object.fromEntries(
        read.flatMap((one) => (one.component ? [[one.component.name, one.component]] : [])),
      ),
      functions: read.flatMap((one) => one.value ?? []),
      types: read.flatMap((one) => one.type ?? []),
      labels: labels.map((map) => {
        const type = wordsTypes.get(map.key);
        return type ? { ...map, type } : map;
      }),
    };
  } finally {
    await api.close();
  }
}

if (import.meta.main) {
  const api = await readApi();
  const name = process.argv[2];
  console.log(
    JSON.stringify(
      name
        ? (api.components[name] ??
            api.functions.find((one) => one.name === name) ??
            api.types.find((one) => one.name === name) ??
            api.labels.find((one) => one.key === name))
        : api,
      null,
      2,
    ),
  );
}
