import { useState } from "react";
import {
  BackLink,
  Button,
  Footer,
  FooterLink,
  FooterLinks,
  Form,
  GridColumn,
  GridRow,
  Header,
  MainWrapper,
  Page,
  PhaseBanner,
  Radio,
  Radios,
  ServiceNavigation,
} from "x-govuk-ui";

type Props = { phaseBanner?: boolean; backLink?: boolean };

const support = ["Help", "Privacy", "Cookies", "Accessibility statement", "Contact"];

export default function PageExample({ phaseBanner = true, backLink = true }: Props) {
  const [chosen, setChosen] = useState("");
  return (
    <Page
      header={
        <>
          <Header homepageUrl="#home" />
          <ServiceNavigation serviceName="Get a fishing licence" serviceUrl="#service" />
        </>
      }
      beforeContent={
        (phaseBanner || backLink) && (
          <>
            {phaseBanner && (
              <PhaseBanner tag="Beta">
                This is a new service. Help us improve it and{" "}
                <a href="#feedback">give your feedback</a>.
              </PhaseBanner>
            )}
            {backLink && <BackLink href="#previous" />}
          </>
        )
      }
      footer={
        <Footer>
          <FooterLinks>
            {support.map((name) => (
              <FooterLink key={name} href={`#${name.toLowerCase().replaceAll(" ", "-")}`}>
                {name}
              </FooterLink>
            ))}
          </FooterLinks>
        </Footer>
      }
    >
      <MainWrapper>
        <GridRow>
          <GridColumn width="two-thirds">
            <Form
              validate={(data) => ({
                licence: data.get("licence")
                  ? undefined
                  : "Select how long you need your licence for",
              })}
              onSubmit={(data) => setChosen(String(data.get("licence")))}
            >
              <Radios
                id="licence"
                name="licence"
                legend="How long do you need your licence for?"
                legendSize="large"
                pageHeading
              >
                <Radio value="1 day">1 day</Radio>
                <Radio value="8 days">8 days</Radio>
                <Radio value="12 months">12 months</Radio>
              </Radios>
              <Button type="submit">Continue</Button>
              <p className="preview-message" role="status" data-success={chosen ? "" : undefined}>
                {chosen && `You chose ${chosen}. The next page would ask for your details.`}
              </p>
            </Form>
          </GridColumn>
        </GridRow>
      </MainWrapper>
    </Page>
  );
}
