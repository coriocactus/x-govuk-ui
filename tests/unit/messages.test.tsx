import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import {
  EmptyState,
  EmptyStateTitle,
  Link,
  NotificationBanner,
  Panel,
  Progress,
  Prose,
  RichText,
  Skeleton,
  Spinner,
  Tag,
} from "x-govuk-ui";
import { parseHtmlTree, safeAddress } from "../../packages/core/src/html-tree";

test("rich text draws the Editor's HTML on the server, with only what a document may hold", () => {
  const html = renderToStaticMarkup(
    <RichText
      className="mine"
      html={
        '<h2>Who can apply</h2><p>You <strong>can</strong> apply if you are <a href="https://www.gov.uk/">13 or over</a>.</p><ul><li>salmon</li><li>trout</li></ul>'
      }
    />,
  );
  expect(html).toContain('<div class="x-govuk-ui-rich-text x-govuk-ui-prose mine">');
  expect(html).toContain("<h2>Who can apply</h2>");
  expect(html).toContain("<strong>can</strong>");
  expect(html).toContain('<a href="https://www.gov.uk/">13 or over</a>');
  expect(html).toContain("<ul><li>salmon</li><li>trout</li></ul>");
  // Code is coloured by its syntax on the server, as Code block and the Editor colour it.
  expect(
    renderToStaticMarkup(<RichText html={'<pre data-language="ts">const fee = "free";</pre>'} />),
  ).toContain(
    '<pre data-language="ts"><code><span class="x-govuk-ui-code-keyword">const</span> fee <span class="x-govuk-ui-code-sign">=</span>',
  );
  // Scripts, frames, handlers, styles other than colour, and links that run code are dropped.
  const hostile = renderToStaticMarkup(
    <RichText
      html={
        '<p onclick="steal()">Hi<script>steal()</script><iframe src="x"></iframe> <a href="javascript:steal()">link</a> <mark style="color: #ca3535; position: fixed">red</mark> <img src="x" onerror="steal()"></p>'
      }
    />,
  );
  expect(hostile).not.toMatch(/onclick|onerror|script|iframe|javascript|position/);
  expect(hostile).toContain("<a>link</a>");
  expect(hostile).toContain('<mark style="color:#ca3535">red</mark>');
  // An address is read as the browser reads it, which drops tabs and line breaks anywhere and
  // control characters at its ends, so no spelling of a script's scheme gets through.
  const spellings = [
    "java&#9;script:steal()",
    "java\nscript:steal()",
    "&#1;javascript:steal()",
    " JAVASCRIPT:steal()",
    "vbscript:steal()",
    "data:text/html,<script>steal()</script>",
  ];
  const tree = parseHtmlTree(
    spellings
      .map((href) => `<a href="${href}">a</a><img src="${href}"><video poster="${href}"></video>`)
      .join(""),
  );
  const kept = JSON.stringify(tree);
  expect(kept).not.toMatch(/"(href|src|poster)"/);
  expect(safeAddress("https://www.gov.uk/x")).toBe("https://www.gov.uk/x");
  expect(safeAddress("/relative#part")).toBe("/relative#part");
  expect(safeAddress("data:image/svg+xml,<svg/>", { allow: "image" })).toBeNull();
  expect(safeAddress("data:image/png;base64,AA==", { allow: "image" })).not.toBeNull();
  expect(safeAddress("data:application/pdf;base64,AA==", { allow: "file" })).not.toBeNull();
  expect(safeAddress("data:text/html,x", { allow: "file" })).toBeNull();
  // Attachments, galleries and mentions, as the Editor writes them.
  const attached = renderToStaticMarkup(
    <RichText
      html={
        '<div data-gallery=""><figure data-attachment="" data-content-type="image/png"><img src="/a.png" alt="A"><figcaption>One</figcaption></figure><figure data-attachment="" data-content-type="image/png"><img src="/b.png" alt="B"></figure></div><p>Ask <span data-mention="person" data-value="baldwin">Stanley Baldwin</span></p>'
      }
    />,
  );
  expect(attached).toContain('<div data-gallery="" data-count="2">');
  expect(attached).toContain(
    '<img src="/a.png" alt="A" loading="lazy"/><figcaption>One</figcaption>',
  );
  expect(attached).toContain(
    '<span data-mention="person" data-value="baldwin">Stanley Baldwin</span>',
  );
  // Markdown, as an Editor with that format writes it.
  expect(
    renderToStaticMarkup(<RichText markdown={"## Heading\n\n*italic* and ~~struck~~"} />),
  ).toContain("<h2>Heading</h2>\n<p><em>italic</em> and <del>struck</del></p>");
});

test("status components carry their roles and are quiet where they should be", () => {
  expect(renderToStaticMarkup(<Tag colour="green">Approved</Tag>)).toBe(
    '<strong class="x-govuk-ui-tag" data-colour="green">Approved</strong>',
  );
  const spinner = renderToStaticMarkup(<Spinner label="Loading results" />);
  expect(spinner).toContain('role="status"');
  expect(spinner).toContain("Loading results");
  expect(renderToStaticMarkup(<Spinner />)).not.toContain("role=");
  expect(
    renderToStaticMarkup(<Skeleton lines={3} />).match(/x-govuk-ui-skeleton-line/g),
  ).toHaveLength(3);
  expect(renderToStaticMarkup(<Skeleton />)).toContain('aria-hidden="true"');
  const progress = renderToStaticMarkup(<Progress label="Uploading" value={100} />);
  expect(progress).toContain('role="progressbar"');
  expect(progress).toContain('data-success="true"');
  const important = renderToStaticMarkup(<NotificationBanner>Seven days left</NotificationBanner>);
  expect(important).toContain('role="region"');
  expect(important).toContain(">Important</h2>");
  const success = renderToStaticMarkup(
    <NotificationBanner type="success">Sent</NotificationBanner>,
  );
  expect(success).toContain('role="alert"');
  expect(success).toContain('data-sound-enter="success"');
  expect(renderToStaticMarkup(<Panel title="Application complete" />)).toContain(
    '<h1 class="x-govuk-ui-panel-title">Application complete</h1>',
  );
  expect(
    renderToStaticMarkup(
      <EmptyState size="small">
        <EmptyStateTitle level={3}>No results</EmptyStateTitle>
      </EmptyState>,
    ),
  ).toContain('<h3 class="x-govuk-ui-empty-state-title">No results</h3>');
});

test("rich text draws chosen elements with parts, and moves its headings down the page", () => {
  const html = renderToStaticMarkup(
    <RichText
      markdown={[
        "# Your licence",
        "",
        "Read [the byelaws](https://www.gov.uk/).",
        "",
        "```ts",
        "const fee = 0;",
        "```",
        "",
        "| Licence | Fee |",
        "| --- | ---: |",
        "| Junior | £0 |",
      ].join("\n")}
      headingOffset={1}
      components={{
        a: ({ attributes, children }) => <Link href={attributes.href}>{children}</Link>,
        pre: ({ attributes, text }) => (
          <output data-language={attributes["data-language"]}>{text}</output>
        ),
      }}
    />,
  );
  // A reply's top heading sits under the page's.
  expect(html).toContain("<h2>Your licence</h2>");
  // The link is the library's Link, and the code block a part given its code and its language.
  expect(html).toMatch(/<a [^>]*href="https:\/\/www.gov.uk\/"[^>]*class="x-govuk-ui-link"/);
  expect(html).toContain('<output data-language="ts">const fee = 0;</output>');
  // A column Markdown aligns to the right keeps its alignment.
  expect(html).toContain('<td style="text-align:right">£0</td>');
});

test("rich text leaves out the line breaks between a table's rows and cells, where HTML has no text", () => {
  type Node = ReturnType<typeof parseHtmlTree>[number];
  // Each text node inside a table part, as "part: text".
  const strays = (nodes: Node[], parent = ""): string[] =>
    nodes.flatMap((node) => {
      if (node.type === "element") return strays(node.children, node.tag);
      if (["table", "thead", "tbody", "tr"].includes(parent))
        return [`${parent}: ${JSON.stringify(node.text)}`];
      return [];
    });
  // A Markdown table, and one the Editor's Source lays out with one block on each line.
  const markdown = renderToStaticMarkup(
    <RichText markdown={"| Licence | Fee |\n| --- | ---: |\n| Junior | £0 |\n| Adult | £35 |"} />,
  );
  expect(markdown).toContain("<table><thead><tr><th>Licence</th>");
  expect(markdown).toContain("</tr></thead><tbody><tr><td>Junior</td>");
  const tree = parseHtmlTree(
    "<table>\n  <tbody>\n    <tr>\n      <td> Junior </td>\n      <td>£0</td>\n    </tr>\n  </tbody>\n</table>",
  );
  expect(strays(tree)).toEqual([]);
  // A cell's own spaces stay, as they are its text.
  expect(JSON.stringify(tree)).toContain('" Junior "');
});

test("prose sets plain elements in GOV.UK's body text, and takes a class of a service's own", () => {
  expect(
    renderToStaticMarkup(
      <Prose className="profile">
        <p>Your details</p>
      </Prose>,
    ),
  ).toBe('<div class="x-govuk-ui-prose profile"><p>Your details</p></div>');
});

test("an empty state can be the whole page, headed at level 1", () => {
  expect(
    renderToStaticMarkup(
      <EmptyState>
        <EmptyStateTitle level={1}>Redbox is not answering</EmptyStateTitle>
      </EmptyState>,
    ),
  ).toContain('<h1 class="x-govuk-ui-empty-state-title">Redbox is not answering</h1>');
});

test("rich text takes its document as html or as markdown, not both", () => {
  // @ts-expect-error TypeScript reports a document given both ways.
  const both = renderToStaticMarkup(<RichText html="<p>As HTML</p>" markdown="As Markdown" />);
  // If both reach it anyway, as from JavaScript, it draws the HTML.
  expect(both).toContain("<p>As HTML</p>");
  expect(both).not.toContain("As Markdown");
});
