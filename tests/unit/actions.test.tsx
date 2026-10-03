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
  const button = Button(props);
  let prevented = false;
  button.props.onClick({
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
