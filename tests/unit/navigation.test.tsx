import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import {
  BackLink,
  Breadcrumbs,
  BreadcrumbsItem,
  CommandMenu,
  CommandMenuItem,
  ExitThisPage,
  Footer,
  FooterLink,
  FooterLinks,
  Header,
  LanguageNavigation,
  LanguageNavigationItem,
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuTrigger,
  Pagination,
  PhaseBanner,
  pagesAround,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarInset,
  SidebarItem,
  SidebarLayout,
  SidebarPageBar,
  SidebarProvider,
  SidebarText,
  SkipLink,
} from "x-govuk-ui";

test("page structure and navigation follow GOV.UK's markup", () => {
  expect(pagesAround(5, 10)).toEqual([1, null, 4, 5, 6, null, 10]);
  expect(pagesAround(1, 3)).toEqual([1, 2, 3]);
  // Five slots, where there is little space, and still the same number of slots on every page.
  expect(pagesAround(5, 10, 5)).toEqual([1, null, 5, null, 10]);
  expect(pagesAround(3, 10, 5)).toEqual([1, 2, 3, null, 10]);
  expect(pagesAround(8, 10, 5)).toEqual([1, null, 8, 9, 10]);
  expect(pagesAround(2, 4, 5)).toEqual([1, 2, 3, 4]);
  expect(pagesAround(4, 10)).toEqual([1, 2, 3, 4, 5, null, 10]);
  expect(pagesAround(8, 10)).toEqual([1, null, 6, 7, 8, 9, 10]);
  // From seven pages up, there are always seven slots, so the pagination keeps its width.
  for (let page = 1; page <= 30; page++) expect(pagesAround(page, 30)).toHaveLength(7);
  const pagination = renderToStaticMarkup(
    <Pagination page={2} pageCount={3} href={(page) => `?page=${page}`} />,
  );
  expect(pagination).toContain('aria-label="Pagination"');
  expect(pagination).toContain('href="?page=1" rel="prev"');
  // At the last page, Next stays in place, disabled.
  expect(
    renderToStaticMarkup(<Pagination page={3} pageCount={3} href={(page) => `?page=${page}`} />),
  ).toMatch(/role="link" aria-disabled="true"><svg[\s\S]*?Next/);
  expect(pagination).toMatch(/aria-label="Page 2" aria-current="page"/);
  const crumbs = renderToStaticMarkup(
    <Breadcrumbs>
      <BreadcrumbsItem href="/">Home</BreadcrumbsItem>
      <BreadcrumbsItem current>Travel abroad</BreadcrumbsItem>
    </Breadcrumbs>,
  );
  expect(crumbs).toContain('<nav aria-label="Breadcrumb"');
  expect(crumbs).toContain('aria-current="page">Travel abroad</span>');
  expect(crumbs).toContain('data-separator="chevron"');
  const languages = renderToStaticMarkup(
    <LanguageNavigation>
      <LanguageNavigationItem lang="en" current>
        English
      </LanguageNavigationItem>
      <LanguageNavigationItem lang="cy" href="/cy" description="(Welsh)">
        Cymraeg
      </LanguageNavigationItem>
    </LanguageNavigation>,
  );
  expect(languages).toContain('aria-current="true" lang="en"');
  expect(languages).toMatch(
    /href="\/cy" lang="cy" hrefLang="cy"|href="\/cy" lang="cy" hreflang="cy"/,
  );
  expect(languages).toContain("> (Welsh)</span>");
  expect(renderToStaticMarkup(<SkipLink />)).toContain('href="#main-content"');
  expect(renderToStaticMarkup(<BackLink />)).toContain("Back</a>");
  expect(renderToStaticMarkup(<Header />)).toContain(
    '<span class="x-govuk-ui-visually-hidden">GOV.UK</span>',
  );
  expect(renderToStaticMarkup(<PhaseBanner tag="Alpha">New</PhaseBanner>)).toContain(
    ">Alpha</strong>",
  );
  const footer = renderToStaticMarkup(
    <Footer>
      <FooterLinks>
        <FooterLink href="/help">Help</FooterLink>
      </FooterLinks>
    </Footer>,
  );
  expect(footer).toContain('aria-label="Support links"');
  expect(footer).toContain("Open Government Licence v3.0");
  expect(footer).toContain("© Crown copyright");
  const exit = renderToStaticMarkup(<ExitThisPage />);
  expect(exit).toContain('data-sound="off"');
  expect(exit).toContain(
    '<span class="x-govuk-ui-visually-hidden">Emergency</span> Exit this page',
  );
  expect(exit).toContain('href="https://www.bbc.co.uk/weather"');
});

test("navigation menu parts mark the current page and keep top-level links in the list", () => {
  const html = renderToStaticMarkup(
    <NavigationMenu label="Service">
      <NavigationMenuItem>
        <NavigationMenuLink href="/" current>
          Home
        </NavigationMenuLink>
      </NavigationMenuItem>
      <NavigationMenuItem>
        <NavigationMenuTrigger>Help</NavigationMenuTrigger>
        <NavigationMenuContent>
          <NavigationMenuLink href="/contact" target="_blank">
            Contact
          </NavigationMenuLink>
        </NavigationMenuContent>
      </NavigationMenuItem>
    </NavigationMenu>,
  );
  expect(html).toContain('aria-label="Service"');
  expect(html).toMatch(/<li[^>]*><a[^>]*aria-current="page"[^>]*>/);
  expect(html).toContain('aria-expanded="false"');
});

test("the command menu trigger shows its shortcut without adding it to the name", () => {
  const html = renderToStaticMarkup(
    <CommandMenu>
      <CommandMenuItem onSelect={() => {}}>Save</CommandMenuItem>
    </CommandMenu>,
  );
  expect(html).toContain("Open command menu");
  expect(html).toContain('aria-keyshortcuts="Meta+K Control+K"');
  expect(html).toContain('<kbd aria-hidden="true"');
});

test("the sidebar names its groups and marks the current page", () => {
  const html = renderToStaticMarkup(
    <SidebarProvider>
      <Sidebar label="Account" collapsible="icon">
        <SidebarContent>
          <SidebarGroup label="Your account">
            <SidebarItem isActive render={<a href="/details" />}>
              Personal details
            </SidebarItem>
            <SidebarItem badge={2}>Messages</SidebarItem>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    </SidebarProvider>,
  );
  // On a wide screen, the sidebar is a navigation landmark named by its label, so nothing in it is
  // left outside the page's landmarks.
  expect(html).toContain('<nav aria-label="Account" class="x-govuk-ui-sidebar"');
  expect(html).toContain('data-state="expanded"');
  expect(html).toContain('data-collapsible="icon"');
  const label = html.match(/class="x-govuk-ui-sidebar-group-label" id="([^"]+)"/)?.[1];
  expect(html).toContain(`aria-labelledby="${label}"`);
  const current = html.match(/<a [^>]*>/)?.[0] ?? "";
  expect(current).toContain('href="/details"');
  expect(current).toContain('aria-current="page"');
  expect(html).toContain('<button type="button" class="x-govuk-ui-sidebar-item"');
  expect(html).toContain('<span class="x-govuk-ui-sidebar-badge" data-single="true">2</span>');
});

test("an app with a sidebar is framed by its parts, each taking a class of a service's own", () => {
  const html = renderToStaticMarkup(
    <SidebarProvider>
      <SidebarLayout className="app">
        <Sidebar label="Chats">
          <SidebarFooter>
            <SidebarText>Department for Business, Innovation, Science and Trade</SidebarText>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
          <SidebarPageBar>
            <h1>Chats</h1>
          </SidebarPageBar>
        </SidebarInset>
      </SidebarLayout>
    </SidebarProvider>,
  );
  expect(html).toContain('<div class="x-govuk-ui-sidebar-layout app">');
  expect(html).toContain(
    '<p class="x-govuk-ui-sidebar-text"><span class="x-govuk-ui-sidebar-text-inner">Department for Business, Innovation, Science and Trade</span></p>',
  );
  expect(html).toContain(
    '<div class="x-govuk-ui-sidebar-inset"><div class="x-govuk-ui-sidebar-page-bar"><h1>Chats</h1>',
  );
});
