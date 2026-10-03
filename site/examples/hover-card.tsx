import { Avatar, HoverCard, HoverCardContent, HoverCardTrigger } from "x-govuk-ui";

type Props = { side?: "top" | "bottom" | "left" | "right"; arrow?: boolean; delay?: number };

export default function HoverCardExample({ side = "bottom", arrow = true, delay = 200 }: Props) {
  return (
    <p className="preview-prose-line">
      Your application is with{" "}
      <HoverCard>
        <HoverCardTrigger href="#winston-churchill" delay={delay}>
          Winston Churchill
        </HoverCardTrigger>
        <HoverCardContent side={side} arrow={arrow}>
          <div className="preview-person">
            <Avatar name="Winston Churchill" />
            <div>
              <strong>Winston Churchill</strong>
              <span>Caseworker, Licensing team</span>
            </div>
          </div>
          <p className="preview-person-note">
            Winston usually replies within 5 working days, and closed 126 cases last month.
          </p>
        </HoverCardContent>
      </HoverCard>
      , who will contact you if we need anything else.
    </p>
  );
}
