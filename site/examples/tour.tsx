import { useState } from "react";
import { Button, Link, SearchBox, Tag, Tour, TourStep } from "x-govuk-ui";

type Props = {
  variant?: "brand" | "plain";
  dim?: boolean;
  dimPadding?: number;
  resume?: boolean;
  closing?: "ends" | "pauses";
  closeOnPressOutside?: boolean;
  closeButton?: boolean;
  /** Starts with a welcome in the middle of the screen. */
  welcome?: boolean;
  /** Keeps progress between visits, in this browser. */
  remember?: boolean;
};

export default function TourExample({
  variant = "brand",
  dim = false,
  dimPadding = 6,
  resume = true,
  closing = "ends",
  closeOnPressOutside = false,
  closeButton = true,
  welcome = false,
  remember = false,
}: Props) {
  const [open, setOpen] = useState(false);
  return (
    <div className="preview-tour">
      <div className="preview-tour-head">
        <h2 className="preview-tour-title">Your applications</h2>
        <Button variant="secondary" size="small" data-sound="open" onClick={() => setOpen(true)}>
          Take the tour
        </Button>
      </div>
      <SearchBox
        className="preview-tour-search"
        label="Search your applications"
        placeholder="Search by name or reference"
        onSearch={() => {}}
      />
      <ul className="preview-tour-list">
        <li id="tour-passport">
          <span>
            <strong>Renew a passport</strong>
            <span>Reference LIC 4821 7730 21</span>
          </span>
          <Tag colour="blue">In progress</Tag>
        </li>
        <li>
          <span>
            <strong>Apply for a provisional driving licence</strong>
            <span>Sent 2 April 2026</span>
          </span>
          <Tag colour="green">Sent</Tag>
        </li>
      </ul>
      <div className="preview-tour-actions">
        <Button id="tour-start">Start a new application</Button>
        <Link id="tour-help" href="#help" onClick={(event) => event.preventDefault()}>
          Get help
        </Link>
      </div>
      <Tour
        open={open}
        onOpenChange={setOpen}
        variant={variant}
        dim={dim}
        dimPadding={dimPadding}
        resume={resume}
        closing={closing}
        closeOnPressOutside={closeOnPressOutside}
        closeButton={closeButton}
        storageKey={remember ? "x-govuk-ui-example-tour" : undefined}
      >
        {welcome && (
          <TourStep title="Welcome to your applications">
            This short tour shows you where everything is. It takes about a minute.
          </TourStep>
        )}
        <TourStep target=".preview-tour-search" title="Find an application">
          Search by the service’s name, or by the reference number we sent you.
        </TourStep>
        <TourStep target="#tour-passport" title="Carry on where you left off">
          Applications you have not sent yet stay here for 30 days.
        </TourStep>
        <TourStep target="#tour-start" title="Start something new">
          Apply for another service. Your details are filled in for you.
        </TourStep>
        <TourStep target="#tour-help" title="Get help">
          Talk to us by phone or webchat, Monday to Friday, 8am to 6pm.
        </TourStep>
      </Tour>
    </div>
  );
}
