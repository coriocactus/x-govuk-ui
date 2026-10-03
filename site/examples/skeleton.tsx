import { Avatar, Skeleton } from "x-govuk-ui";

type Props = {
  /** Shows the skeleton. When off, the content it stood in for appears. */
  loading?: boolean;
  lines?: number;
};

export default function SkeletonExample({ loading = true, lines = 3 }: Props) {
  if (loading)
    return (
      <div className="preview-card" aria-busy="true">
        <span className="x-govuk-ui-visually-hidden" role="status">
          Loading caseworker
        </span>
        <div className="preview-card-header">
          <Skeleton variant="circle" />
          <Skeleton variant="text" lines={2} className="preview-card-name" />
        </div>
        <Skeleton variant="text" lines={lines} />
      </div>
    );
  return (
    <div className="preview-card">
      <div className="preview-card-header">
        <Avatar name="Gordon Brown" />
        <div className="preview-card-name">
          <strong>Gordon Brown</strong>
          <span>Caseworker, Licensing team</span>
        </div>
      </div>
      <p>
        Liz handles premises licences for the north of the city, and usually replies within 5
        working days.
      </p>
    </div>
  );
}
