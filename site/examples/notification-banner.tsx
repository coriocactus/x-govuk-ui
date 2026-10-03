import { NotificationBanner, NotificationBannerHeading } from "x-govuk-ui";

type Props = { type?: "important" | "success"; autoFocus?: boolean };

export default function NotificationBannerExample({
  type = "important",
  autoFocus = false,
}: Props) {
  if (type === "success")
    return (
      <NotificationBanner type="success" autoFocus={autoFocus}>
        <NotificationBannerHeading>Your application has been sent</NotificationBannerHeading>
        <p>We’ve emailed a copy to you.</p>
      </NotificationBanner>
    );
  return (
    <NotificationBanner>
      <NotificationBannerHeading>
        You have 7 days left to send your application.
      </NotificationBannerHeading>
      <a href="#application">View application</a>
    </NotificationBanner>
  );
}
