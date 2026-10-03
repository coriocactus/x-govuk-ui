import { AspectRatio, MediaCredit } from "x-govuk-ui";

type Props = { ratio?: "16:9" | "4:3" | "1:1" };

const ratios = { "16:9": 16 / 9, "4:3": 4 / 3, "1:1": 1 };

// A photo from Wikimedia Commons. THIRD_PARTY_NOTICES.txt gives its licence and source.
export default function AspectRatioExample({ ratio = "16:9" }: Props) {
  return (
    <AspectRatio ratio={ratios[ratio]} className="preview-ratio">
      <img
        src="/assets/photos/st-pauls-cathedral.jpg"
        alt="St Paul's Cathedral and its dome, seen from above among the City's offices"
      />
      <MediaCredit>Mark Fosh</MediaCredit>
    </AspectRatio>
  );
}
