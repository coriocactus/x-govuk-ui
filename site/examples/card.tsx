import { Card, CardDescription, CardFooter, CardMedia, CardTitle, MediaCredit } from "x-govuk-ui";

type Props = { media?: boolean; links?: boolean };

// Photos from Wikimedia Commons. THIRD_PARTY_NOTICES.txt gives each one's licence and source.
const services = [
  {
    title: "Apply for a licence",
    href: "#apply",
    image: "/assets/photos/buckingham-palace.jpg",
    credit: "Julian Herzog",
    description: "Start a new application for a premises or personal licence.",
    updated: "Updated 2 March 2026",
  },
  {
    title: "Book a visit",
    href: "#visit",
    image: "/assets/photos/tower-of-london.jpg",
    credit: "Duncan from Nottingham",
    description: "Choose a time for an officer to visit your premises.",
    updated: "Updated 18 February 2026",
  },
];

export default function CardExample({ media = true, links = true }: Props) {
  return (
    <div className="preview-cards">
      {services.map((service) => (
        <Card key={service.title}>
          {media && (
            <CardMedia className="preview-card-media">
              <img src={service.image} alt="" />
              <MediaCredit>{service.credit}</MediaCredit>
            </CardMedia>
          )}
          <CardTitle href={links ? service.href : undefined}>{service.title}</CardTitle>
          <CardDescription>{service.description}</CardDescription>
          <CardFooter>{service.updated}</CardFooter>
        </Card>
      ))}
    </div>
  );
}
