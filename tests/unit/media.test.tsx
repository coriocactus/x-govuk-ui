import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import {
  Carousel,
  CarouselControls,
  CarouselNext,
  CarouselPosition,
  CarouselPrevious,
  CarouselSlide,
  CarouselViewport,
  OrganisationName,
} from "x-govuk-ui";

test("carousel parts announce each slide's place and start at the first", () => {
  const html = renderToStaticMarkup(
    <Carousel label="Featured">
      <CarouselViewport>
        <CarouselSlide label="One">First</CarouselSlide>
        <CarouselSlide label="Two">Second</CarouselSlide>
      </CarouselViewport>
      <CarouselControls>
        <CarouselPrevious />
        <CarouselPosition />
        <CarouselNext />
      </CarouselControls>
    </Carousel>,
  );
  expect(html).toContain('aria-roledescription="carousel"');
  expect(html).toContain('aria-label="1 of 2: One"');
  expect(html).toContain('aria-label="2 of 2: Two"');
  expect(html).toMatch(
    /aria-label="Previous slide"[^>]*disabled=""|disabled=""[^>]*aria-label="Previous slide"/,
  );
});

test("an organisation's name sits beside a bar of its colour, under the Royal Arms a service gives", () => {
  const html = renderToStaticMarkup(
    <OrganisationName
      colour="#ff4328"
      crest="/assets/images/govuk-crest.svg"
      render={
        <a href="/government/organisations/department-for-business-innovation-science-trade" />
      }
    >
      Department for Business, Innovation, Science and Trade
    </OrganisationName>,
  );
  expect(html).toMatch(
    /^<a href="\/government\/organisations\/[^"]+" class="x-govuk-ui-organisation-name"/,
  );
  expect(html).toContain('data-crest=""');
  expect(html).toContain('data-size="medium"');
  expect(
    renderToStaticMarkup(<OrganisationName size="small">Cabinet Office</OrganisationName>),
  ).toContain('data-size="small"');
  expect(html).toContain("--x-govuk-ui-organisation-colour:#ff4328");
  expect(html).toContain(
    "--x-govuk-ui-organisation-crest:url(&quot;/assets/images/govuk-crest.svg&quot;)",
  );
});
