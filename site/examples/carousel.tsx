import {
  Card,
  CardDescription,
  CardMedia,
  CardTitle,
  Carousel,
  CarouselControls,
  CarouselNext,
  CarouselPosition,
  CarouselPrevious,
  CarouselSlide,
  CarouselViewport,
  MediaCredit,
} from "x-govuk-ui";

// Photos from Wikimedia Commons. THIRD_PARTY_NOTICES.txt gives each one's licence and source.
const services = [
  {
    id: "home",
    label: "Your home",
    title: "Help with your home",
    image: "/assets/photos/battersea-power-station.jpg",
    credit: "Alberto Pascual",
    description: "Find information about housing, council tax and local services.",
  },
  {
    id: "community",
    label: "Your community",
    title: "Explore your community",
    image: "/assets/photos/british-museum.jpg",
    credit: "Ham",
    description: "Discover parks, libraries and activities in your area.",
  },
  {
    id: "support",
    label: "Your support",
    title: "Find the support you need",
    image: "/assets/photos/palace-of-westminster.jpg",
    credit: "ThatsTheBoss",
    description: "Check the benefits and financial support available to you.",
  },
];

export default function CarouselExample({ label = "Featured services" }) {
  return (
    <Carousel label={label}>
      <CarouselViewport>
        {services.map((service) => (
          <CarouselSlide key={service.id} label={service.label}>
            <Card className="preview-service-card">
              <CardMedia>
                <img src={service.image} alt="" />
                <MediaCredit>{service.credit}</MediaCredit>
              </CardMedia>
              <CardTitle>{service.title}</CardTitle>
              <CardDescription>{service.description}</CardDescription>
            </Card>
          </CarouselSlide>
        ))}
      </CarouselViewport>
      <CarouselControls>
        <CarouselPrevious />
        <CarouselPosition />
        <CarouselNext />
      </CarouselControls>
    </Carousel>
  );
}
