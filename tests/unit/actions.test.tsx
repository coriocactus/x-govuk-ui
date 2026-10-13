import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { Button, Card, CardTitle, Pagination, TaskList, TaskListItem } from "x-govuk-ui";

test("pending buttons preserve their name and prevent repeated activation", () => {
  let calls = 0;
  const props = {
    loading: true,
    children: "Save",
    onClick: () => {
      calls++;
    },
  };
  // The element a Button renders is given the Button's own click handler.
  let onClick: ((event: { preventDefault: () => void }) => void) | undefined;
  renderToStaticMarkup(
    <Button
      {...props}
      render={(given) => {
        onClick = given.onClick as typeof onClick;
        return <button type="button" {...given} />;
      }}
    />,
  );
  let prevented = false;
  onClick?.({
    preventDefault() {
      prevented = true;
    },
  });
  expect(prevented).toBe(true);
  expect(calls).toBe(0);
  const html = renderToStaticMarkup(<Button {...props} />);
  expect(html).toContain('aria-busy="true"');
  expect(html).toContain('aria-disabled="true"');
  expect(html).toContain("Save");
  expect(html).not.toContain(" disabled=");
  // Another element, such as GOV.UK's Start button as a link, takes the Button's look and no type.
  const start = renderToStaticMarkup(
    <Button render={<a href="/start" />} variant="primary">
      Start now
    </Button>,
  );
  expect(start).toMatch(/^<a href="\/start" class="x-govuk-ui-button x-govuk-ui-button--primary"/);
  expect(start).not.toContain("type=");
  // A link cannot be disabled, so a disabled Button rendered as one is marked so, and does nothing.
  let followed = 0;
  let linkClick: ((event: { preventDefault: () => void }) => void) | undefined;
  const link = renderToStaticMarkup(
    <Button
      disabled
      onClick={() => followed++}
      render={(given) => {
        linkClick = given.onClick as typeof linkClick;
        return <a href="/send" {...given} />;
      }}
    >
      Send
    </Button>,
  );
  expect(link).toContain('aria-disabled="true"');
  expect(link).not.toContain(" disabled=");
  let stopped = false;
  linkClick?.({
    preventDefault() {
      stopped = true;
    },
  });
  expect(stopped).toBe(true);
  expect(followed).toBe(0);
  expect(renderToStaticMarkup(<Button>Save</Button>)).toContain('type="button"');
});

test("link parts render a router's link in place of their anchor", () => {
  const router = (props: object) => <a data-router="" {...props} />;
  const card = renderToStaticMarkup(
    <Card>
      <CardTitle href="/licences" render={router}>
        Fishing licences
      </CardTitle>
    </Card>,
  );
  expect(card).toContain('data-router="" href="/licences" class="x-govuk-ui-card-link"');
  const task = renderToStaticMarkup(
    <TaskList>
      <TaskListItem href="/name" render={router} status="completed">
        Your name
      </TaskListItem>
    </TaskList>,
  );
  expect(task).toContain('data-router="" href="/name" class="x-govuk-ui-task-list-link"');
  const pages = renderToStaticMarkup(
    <Pagination page={2} pageCount={3} href={(page) => `?page=${page}`} render={router} />,
  );
  expect(pages.match(/data-router=""/g)?.length).toBe(5);
  expect(pages).toContain('href="?page=3"');
});
