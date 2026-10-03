import { Breadcrumbs, BreadcrumbsEllipsis, BreadcrumbsItem, MenuLinkItem } from "x-govuk-ui";

type Props = {
  separator?: "chevron" | "slash";
  collapseOnMobile?: boolean;
  /** Leaves the middle steps out, behind an ellipsis that opens a menu of them. */
  ellipsis?: boolean;
};

const middle = [
  ["#passports", "Passports, travel and living abroad"],
  ["#travel", "Travel abroad"],
];

export default function BreadcrumbsExample({
  separator = "chevron",
  collapseOnMobile = false,
  ellipsis = true,
}: Props) {
  return (
    <Breadcrumbs separator={separator} collapseOnMobile={collapseOnMobile}>
      <BreadcrumbsItem href="#home">Home</BreadcrumbsItem>
      {ellipsis ? (
        <BreadcrumbsEllipsis>
          {middle.map(([href, name]) => (
            <MenuLinkItem key={href} href={href}>
              {name}
            </MenuLinkItem>
          ))}
        </BreadcrumbsEllipsis>
      ) : (
        middle.map(([href, name]) => (
          <BreadcrumbsItem key={href} href={href}>
            {name}
          </BreadcrumbsItem>
        ))
      )}
      <BreadcrumbsItem href="#advice">Foreign travel advice</BreadcrumbsItem>
      <BreadcrumbsItem current>France</BreadcrumbsItem>
    </Breadcrumbs>
  );
}
