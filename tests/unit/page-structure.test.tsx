import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import {
  Aside,
  Attachment,
  Avatar,
  AvatarGroup,
  BackLink,
  Card,
  CardTitle,
  ChevronIcon,
  CookieBanner,
  Feedback,
  FilterChip,
  FilterChips,
  Footer,
  Form,
  GovukCrown,
  GovukLockup,
  GovukWordmark,
  GridColumn,
  GridRow,
  Header,
  Input,
  Kbd,
  Link,
  MainWrapper,
  MoreIcon,
  Page,
  SearchIcon,
  ServicePage,
  VisuallyHidden,
  WidthContainer,
} from "x-govuk-ui";
import { brandPaths } from "../../site/brand";

test("pages follow GOV.UK's template, and forms leave validation to themselves", () => {
  const page = renderToStaticMarkup(
    <Page header={<Header />} footer={<Footer />} width={1100}>
      <MainWrapper>
        <GridRow>
          <GridColumn width="two-thirds">Content</GridColumn>
        </GridRow>
      </MainWrapper>
    </Page>,
  );
  // The skip link comes first and goes to the main content.
  expect(page).toMatch(
    /^<div class="x-govuk-ui-page" style="--x-govuk-ui-page-width:1100px"><a href="#main-content"/,
  );
  expect(page).toContain(
    '<main id="main-content" class="x-govuk-ui-main-wrapper" data-size="large">',
  );
  expect(page).toContain(
    'class="x-govuk-ui-grid-column" data-width="two-thirds" data-from="tablet"',
  );
  // The header and footer keep their content in width containers, so they line up with the page.
  expect(page.match(/x-govuk-ui-width-container/g)).toHaveLength(3);
  // With something above the content, the main wrapper leaves GOV.UK's usual space.
  expect(
    renderToStaticMarkup(
      <Page skipLink={null} beforeContent={<BackLink />}>
        <MainWrapper render={<div />}>Content</MainWrapper>
      </Page>,
    ),
  ).toContain('<div id="main-content" class="x-govuk-ui-main-wrapper">Content</div>');
  expect(renderToStaticMarkup(<WidthContainer width="40rem" gutters={false} />)).toBe(
    '<div class="x-govuk-ui-width-container" data-gutters="none" style="--x-govuk-ui-container-width:40rem"></div>',
  );
  const form = renderToStaticMarkup(
    <Form validate={() => ({})}>
      <Input name="email" label="Email address" />
    </Form>,
  );
  // The browser's own validation is off, as GOV.UK advises.
  expect(form).toMatch(/^<form novalidate="" class="x-govuk-ui-form">/i);
  // Nothing is wrong until the form is sent.
  expect(form).not.toContain("x-govuk-ui-error-summary");
  expect(form).not.toContain("aria-invalid");
});

test("a service page puts the usual GOV.UK parts around its content", () => {
  const page = renderToStaticMarkup(
    <ServicePage serviceName="Apply for a licence" phase="Beta" back="#start">
      <p>Content</p>
    </ServicePage>,
  );
  expect(page).toContain("Apply for a licence");
  expect(page).toContain("Beta");
  expect(page).toContain('href="#start"');
  expect(page).toContain("<main");
  expect(page).toContain('data-width="two-thirds"');
  expect(page).toContain("Accessibility statement");
});

test("links, cards, avatars and page parts follow GOV.UK and name themselves", () => {
  const link = renderToStaticMarkup(
    <Link href="/photos" newTab visited={false}>
      Photo rules
    </Link>,
  );
  expect(link).toContain('target="_blank"');
  expect(link).toContain('rel="noreferrer noopener"');
  expect(link).toContain("Photo rules (opens in new tab)");
  expect(link).toContain("data-no-visited");
  expect(renderToStaticMarkup(<VisuallyHidden> name</VisuallyHidden>)).toContain(
    'class="x-govuk-ui-visually-hidden"',
  );
  const card = renderToStaticMarkup(
    <Card>
      <CardTitle href="/apply" headingLevel={3}>
        Apply
      </CardTitle>
    </Card>,
  );
  expect(card).toContain('<h3 class="x-govuk-ui-card-title"><a href="/apply"');
  const avatar = renderToStaticMarkup(<Avatar name="Tony Blair" />);
  expect(avatar).toContain('role="img"');
  expect(avatar).toContain('aria-label="Tony Blair"');
  expect(avatar).toContain(">TB<");
  expect(renderToStaticMarkup(<AvatarGroup more={3} />)).toContain("and 3 more");
  expect(renderToStaticMarkup(<Aside title="Related content" />)).toMatch(
    /<aside class="x-govuk-ui-aside" aria-labelledby="([^"]+)"><h2 id="\1"/,
  );
  const attachment = renderToStaticMarkup(
    <Attachment
      title="Fees"
      href="/fees.pdf"
      format="PDF"
      size="245 KB"
      pages={12}
      accessibleFormatEmail="a@b.gov.uk"
    />,
  );
  expect(attachment).toContain("PDF, 245 KB, 12 pages");
  expect(attachment).toContain("mailto:a@b.gov.uk");
  const banner = renderToStaticMarkup(<CookieBanner serviceName="Apply for a licence" />);
  expect(banner).toContain('aria-label="Cookies on Apply for a licence"');
  expect(banner).toContain("Accept analytics cookies");
  expect(renderToStaticMarkup(<CookieBanner choice="accepted" />)).toBe("");
  const feedback = renderToStaticMarkup(<Feedback />);
  expect(feedback).toContain("Is this page useful?");
  expect(feedback).toContain(
    'No<span class="x-govuk-ui-visually-hidden"> this page is not useful</span>',
  );
  const chips = renderToStaticMarkup(
    <FilterChips label="Filter by status" defaultValue={["new"]}>
      <FilterChip value="new" count={3}>
        New
      </FilterChip>
    </FilterChips>,
  );
  expect(chips).toContain('aria-label="Filter by status"');
  expect(chips).toContain('aria-pressed="true"');
  expect(renderToStaticMarkup(<Kbd variant="outline">⌘ K</Kbd>)).toContain(
    'data-variant="outline"',
  );
});

test("GOV.UK's marks are decorative unless named, and the workbench's own marks match its files", async () => {
  const lockup = renderToStaticMarkup(<GovukLockup />);
  expect(lockup).toContain('aria-hidden="true"');
  expect(lockup).toContain('viewBox="0 0 324 60"');
  expect(renderToStaticMarkup(<GovukCrown aria-label="GOV.UK" />)).toContain('role="img"');
  expect(renderToStaticMarkup(<GovukWordmark />)).toContain("x-govuk-ui-logo-dot");
  // The workbench's brand draws the same shapes as the files in site/assets/brand.
  const shapes = async (name: string) =>
    [...(await Bun.file(`site/assets/brand/${name}.svg`).text()).matchAll(/ d="([^"]+)"/g)].map(
      (match) => match[1],
    );
  for (const colour of ["black", "white"]) {
    expect(await shapes(`x-govuk-ui-crown-${colour}`)).toEqual([brandPaths.crown]);
    expect(await shapes(`x-govuk-ui-wordmark-${colour}`)).toEqual([
      brandPaths.wordmark,
      brandPaths.slash,
    ]);
    expect(await shapes(`x-govuk-ui-lockup-${colour}`)).toEqual([
      brandPaths.crown,
      brandPaths.wordmark,
      brandPaths.slash,
    ]);
  }
  expect(await shapes("favicon")).toEqual([brandPaths.crown]);
});

test("visually hidden words can be another element, such as a heading only screen readers hear", () => {
  expect(
    renderToStaticMarkup(
      <VisuallyHidden render={(props) => <h1 {...props} />}>Chats</VisuallyHidden>,
    ),
  ).toBe('<h1 class="x-govuk-ui-visually-hidden">Chats</h1>');
});

test("the library's own icons are hidden from screen readers, unless a service names one", () => {
  expect(renderToStaticMarkup(<MoreIcon />)).toContain('aria-hidden="true"');
  const named = renderToStaticMarkup(<SearchIcon aria-label="Search" />);
  expect(named).toContain('role="img"');
  expect(named).not.toContain("aria-hidden");
  expect(renderToStaticMarkup(<ChevronIcon direction="right" className="next" />)).toContain(
    'class="x-govuk-ui-chevron next" data-direction="right"',
  );
});
