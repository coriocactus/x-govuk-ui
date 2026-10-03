import { Lightbox } from "x-govuk-ui";

type Props = { rowHeight?: number; captions?: boolean };

// Photos from Wikimedia Commons. THIRD_PARTY_NOTICES.txt gives each one's licence and source.
const photos = [
  {
    src: "/assets/photos/tower-bridge.jpg",
    alt: "Tower Bridge over the Thames at dawn, its towers lit against a pale sky",
    width: 960,
    height: 640,
    caption: "Tower Bridge, opened in 1894.",
    credit: "Fuzzypiggy",
  },
  {
    src: "/assets/photos/big-ben.jpg",
    alt: "The Elizabeth Tower, which holds Big Ben, against a blue sky",
    width: 540,
    height: 960,
    caption: "The Elizabeth Tower at the Palace of Westminster.",
    credit: "Christian David",
  },
  {
    src: "/assets/photos/london-eye.jpg",
    alt: "The London Eye on the South Bank of the Thames",
    width: 960,
    height: 640,
    caption: "The London Eye, on the South Bank.",
    credit: "Khamtran",
  },
  {
    src: "/assets/photos/the-shard.jpg",
    alt: "The Shard rising above London Bridge at sunset",
    width: 519,
    height: 960,
    caption: "The Shard at sunset.",
    credit: "Colin",
  },
  {
    src: "/assets/photos/tate-modern.jpg",
    alt: "Tate Modern, the former Bankside Power Station, with its central chimney",
    width: 960,
    height: 720,
    caption: "Tate Modern, once Bankside Power Station.",
    credit: "Acabashi",
  },
  {
    src: "/assets/photos/royal-albert-hall.jpg",
    alt: "The Royal Albert Hall lit up at dusk",
    width: 960,
    height: 488,
    caption: "The Royal Albert Hall at dusk.",
    credit: "Diliff",
  },
  {
    src: "/assets/photos/westminster-abbey.jpg",
    alt: "The west front of Westminster Abbey, with its two towers",
    width: 477,
    height: 960,
    caption: "The west front of Westminster Abbey.",
    credit: "Antiquary",
  },
  {
    src: "/assets/photos/hampton-court-palace.jpg",
    alt: "The red-brick west front of Hampton Court Palace, at the end of a long drive",
    width: 960,
    height: 582,
    caption: "Hampton Court Palace from the west.",
    credit: "Tilman2007",
  },
  {
    src: "/assets/photos/albert-bridge.jpg",
    alt: "Albert Bridge spanning the Thames between Chelsea and Battersea",
    width: 960,
    height: 318,
    caption: "Albert Bridge, from Chelsea Embankment.",
    credit: "Iridescent",
  },
  {
    src: "/assets/photos/nelsons-column.jpg",
    alt: "Nelson's Column rising over Trafalgar Square",
    width: 661,
    height: 960,
    caption: "Nelson's Column in Trafalgar Square.",
    credit: "Beata May",
  },
  {
    src: "/assets/photos/chiswick-house.jpg",
    alt: "Chiswick House, a white Palladian villa with a domed roof",
    width: 960,
    height: 576,
    caption: "Chiswick House, a Palladian villa.",
    credit: "Michael Coppins",
  },
  {
    src: "/assets/photos/cutty-sark.jpg",
    alt: "The Cutty Sark, a tall ship, in dry dock in Greenwich",
    width: 960,
    height: 721,
    caption: "The Cutty Sark in Greenwich.",
    credit: "Ethan Doyle White",
  },
  {
    src: "/assets/photos/bt-tower.jpg",
    alt: "The BT Tower, a slender round tower, above Fitzrovia's rooftops",
    width: 640,
    height: 960,
    caption: "The BT Tower in Fitzrovia.",
    credit: "Tilman2007",
  },
  {
    src: "/assets/photos/canary-wharf.jpg",
    alt: "Canary Wharf's towers across the Thames",
    width: 960,
    height: 540,
    caption: "Canary Wharf from Limehouse.",
    credit: "The wub",
  },
  {
    src: "/assets/photos/albert-memorial.jpg",
    alt: "The Albert Memorial, a gilded Gothic canopy in Kensington Gardens",
    width: 930,
    height: 960,
    caption: "The Albert Memorial in Kensington Gardens.",
    credit: "Diliff",
  },
  {
    src: "/assets/photos/admiralty-arch.jpg",
    alt: "Admiralty Arch, a curved stone building with three arches over the road",
    width: 960,
    height: 470,
    caption: "Admiralty Arch, at the end of The Mall.",
    credit: "Diliff",
  },
  {
    src: "/assets/photos/wellington-arch.jpg",
    alt: "Wellington Arch, crowned by a bronze chariot",
    width: 720,
    height: 960,
    caption: "Wellington Arch at Hyde Park Corner.",
    credit: "Ermell",
  },
  {
    src: "/assets/photos/barbican-estate.jpg",
    alt: "The concrete towers of the Barbican Estate",
    width: 960,
    height: 788,
    caption: "The towers of the Barbican Estate.",
    credit: "Riodamascus",
  },
  {
    src: "/assets/photos/st-pancras.jpg",
    alt: "The red-brick Gothic front of St Pancras station and its clock tower",
    width: 960,
    height: 810,
    caption: "St Pancras station.",
    credit: "Colin",
  },
  {
    src: "/assets/photos/alexandra-palace.jpg",
    alt: "Alexandra Palace and its mast on a hill above parkland, at sunset",
    width: 960,
    height: 720,
    caption: "Alexandra Palace at sunset.",
    credit: "Jack Rose",
  },
];

export default function LightboxExample({ rowHeight = 200, captions = true }: Props) {
  return (
    <Lightbox
      label="Photos of London"
      rowHeight={rowHeight}
      images={captions ? photos : photos.map(({ caption: _, ...photo }) => photo)}
    />
  );
}
