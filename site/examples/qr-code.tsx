import { useEffect, useState } from "react";
import { Input, QrCode } from "x-govuk-ui";

type Props = { size?: number; errorCorrection?: "L" | "M" | "Q" | "H"; ripple?: number };

export default function QrCodeExample({ size = 200, errorCorrection = "M", ripple = 500 }: Props) {
  const [address, setAddress] = useState("https://www.gov.uk/fishing-licences");
  const [shown, setShown] = useState(address);
  // The code follows the address once typing pauses, and ripples as it changes.
  useEffect(() => {
    const wait = setTimeout(() => setShown(address.trim() || " "), 400);
    return () => clearTimeout(wait);
  }, [address]);
  return (
    <div className="preview-qr">
      {/* A new ripple time plays the ripple again, to compare. */}
      <QrCode
        key={ripple}
        value={shown}
        label="the fishing licence service"
        size={size}
        errorCorrection={errorCorrection}
        ripple={ripple}
      />
      <Input
        label="Web address"
        hint="Change it, and the code ripples to match."
        type="url"
        spellCheck={false}
        value={address}
        onChange={(event) => setAddress(event.target.value)}
      />
    </div>
  );
}
