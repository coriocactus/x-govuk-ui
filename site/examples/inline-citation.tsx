import { type CitationSource, InlineCitation } from "x-govuk-ui";

type Props = {
  stacked?: boolean;
  /** Cites a passage from a document the user uploaded, which has no address of its own. */
  document?: boolean;
};

const renew: CitationSource = {
  title: "Renew or replace your adult passport",
  url: "#renew-adult-passport",
  crown: true,
  site: "GOV.UK",
  description: "Renew online, by post or with the Passport Office's fast track service.",
  date: "Updated 12 January 2026",
};
const photos: CitationSource[] = [
  {
    title: "Get a passport photo",
    url: "#photos-for-passports",
    crown: true,
    site: "GOV.UK",
    description: "The rules your digital or printed photo must meet.",
    date: "Updated 3 February 2026",
  },
  {
    title: "Passport photo checker",
    url: "#passport-photo-checker",
    crown: true,
    site: "HM Passport Office",
    description: "Check a digital photo before you send it with your application.",
  },
  {
    title: "Taking a passport photo at home",
    url: "#taking-a-passport-photo-at-home",
    site: "Example Times",
    description: "Light, background and expression: what the rules mean in practice.",
    date: "8 November 2025",
  },
];

// A document the user uploaded has no address, so it names where it is, and which pages.
const letter: CitationSource = {
  title: "Your passport renewal letter",
  site: "Your documents",
  detail: "Page 2",
  description: "Your old passport must be sent back once the new one arrives.",
};

export default function InlineCitationExample({ stacked = true, document = false }: Props) {
  return (
    <p className="preview-citation-text">
      You can renew your passport online, and it usually takes 3 weeks.
      <InlineCitation sources={[renew]} /> You'll need a digital photo that meets the rules.
      <InlineCitation sources={stacked ? photos : photos.slice(0, 1)} />
      {document && (
        <>
          {" "}
          Send your old passport back once the new one arrives.
          <InlineCitation sources={[letter]} />
        </>
      )}
    </p>
  );
}
