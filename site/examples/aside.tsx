import { Aside, Link } from "x-govuk-ui";

type Props = { title?: string };

export default function AsideExample({ title = "Related content" }: Props) {
  return (
    <div className="preview-aside">
      <div>
        <h2 className="preview-aside-heading">Renew your passport</h2>
        <p>
          You can renew your passport online. It usually takes 3 weeks, so apply in good time before
          you travel.
        </p>
      </div>
      <Aside title={title}>
        <ul>
          <li>
            <Link href="#photos">Get a passport photo</Link>
          </li>
          <li>
            <Link href="#fees">Passport fees</Link>
          </li>
          <li>
            <Link href="#lost">Report a lost or stolen passport</Link>
          </li>
        </ul>
      </Aside>
    </div>
  );
}
