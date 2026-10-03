import { Header } from "x-govuk-ui";

type Props = {
  productName?: string;
  /**
   * Gives the service's own logo, as for a government service that is not part of GOV.UK. That
   * makes it GOV.UK's generic header.
   */
  generic?: boolean;
};

/** The service's own mark, beside its name, as GOV.UK's generic header example has. */
function ServiceLogo() {
  return (
    <span className="preview-generic-logo">
      <svg viewBox="0 0 28 30" width="28" height="30" fill="currentColor" aria-hidden="true">
        <circle cx="13.5" cy="4.2" r="4.2" />
        <circle cx="13.5" cy="25.8" r="4.2" />
        <circle cx="22.9" cy="9.6" r="4.2" />
        <circle cx="4.2" cy="20.4" r="4.2" />
        <circle cx="22.9" cy="20.4" r="4.2" />
        <circle cx="4.2" cy="9.6" r="4.2" />
      </svg>
      <span aria-hidden="true">Licensing Authority</span>
    </span>
  );
}

export default function HeaderExample({ productName = "", generic = false }: Props) {
  return (
    <Header
      homepageUrl="#home"
      productName={productName || undefined}
      logo={generic ? <ServiceLogo /> : undefined}
      logoLabel={generic ? "Licensing Authority" : "GOV.UK"}
    />
  );
}
