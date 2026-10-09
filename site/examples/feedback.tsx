import { useState } from "react";
import { Button, Feedback, Footer, FooterLink, FooterLinks, WidthContainer } from "x-govuk-ui";

const support = ["Help", "Privacy", "Cookies", "Accessibility statement", "Contact"];

/** The foot of a service's page, which is the band at the end of its content, then the footer. */
export default function FeedbackExample({ question = "Is this page useful?" }) {
  // Once users have answered, the example can ask again.
  const [round, setRound] = useState(0);
  const [said, setSaid] = useState("");
  return (
    <div className="preview-page-foot">
      <WidthContainer className="preview-page-foot-content">
        <div className="preview-feedback-after">
          <p className="preview-feedback-said" role="status">
            {said}
          </p>
          {said && (
            <Button
              variant="outline"
              size="small"
              onClick={() => {
                setSaid("");
                setRound(round + 1);
              }}
            >
              Ask again
            </Button>
          )}
        </div>
        <Feedback
          key={round}
          question={question}
          onAnswer={(useful) => useful && setSaid("You said the page is useful.")}
          onReport={() => setSaid("This is an example, so the report was not sent.")}
        />
      </WidthContainer>
      <Footer>
        <FooterLinks>
          {support.map((name) => (
            <FooterLink key={name} href={`#${name.toLowerCase().replaceAll(" ", "-")}`}>
              {name}
            </FooterLink>
          ))}
        </FooterLinks>
      </Footer>
    </div>
  );
}
