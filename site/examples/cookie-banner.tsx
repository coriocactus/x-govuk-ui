import { useState } from "react";
import { Button, CookieBanner } from "x-govuk-ui";

export default function CookieBannerExample({ serviceName = "Apply for a licence" }) {
  // Once users have chosen, each round shows the banner again, as on a first visit.
  const [round, setRound] = useState(0);
  const [chosen, setChosen] = useState(false);
  return (
    <div className="preview-page-top">
      <CookieBanner
        key={round}
        serviceName={serviceName}
        cookiesHref="#cookies"
        onChoose={() => setChosen(true)}
      />
      <div className="preview-cookie-page">
        <p>The page carries on beneath the banner.</p>
        {chosen && (
          <Button
            variant="outline"
            size="small"
            onClick={() => {
              setChosen(false);
              setRound(round + 1);
            }}
          >
            Show the banner again
          </Button>
        )}
      </div>
    </div>
  );
}
