import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuTrigger,
} from "x-govuk-ui";

type MenuLink = { label: string; href: string; description?: string };

const menus: { label: string; links: MenuLink[] }[] = [
  {
    label: "Services",
    links: [
      {
        label: "Benefits",
        href: "#benefits",
        description: "Find out what support you can get.",
      },
      {
        label: "Money and tax",
        href: "#money-and-tax",
        description: "Manage your tax and financial information.",
      },
      {
        label: "Working",
        href: "#working",
        description: "Employment rights, pensions and finding work.",
      },
    ],
  },
  {
    label: "Your account",
    links: [
      {
        label: "Sign in",
        href: "#sign-in",
        description: "Return to your saved applications.",
      },
      {
        label: "Your details",
        href: "#your-details",
        description: "Manage your account.",
      },
    ],
  },
  {
    label: "Help",
    links: [
      { label: "Contact GOV.UK", href: "#contact" },
      { label: "Accessibility", href: "#accessibility-statement" },
      { label: "Using GOV.UK", href: "#using-gov-uk" },
      { label: "Privacy", href: "#privacy" },
    ],
  },
];

export default function NavigationMenuExample({ label = "Services", disabled = false }) {
  return (
    <NavigationMenu label={label} disabled={disabled}>
      <NavigationMenuItem>
        {/* A router's link fits through render, such as render={<Link to="/" />}. */}
        <NavigationMenuLink href="#home" current>
          Home
        </NavigationMenuLink>
      </NavigationMenuItem>
      {menus.map((menu) => (
        <NavigationMenuItem key={menu.label}>
          <NavigationMenuTrigger>{menu.label}</NavigationMenuTrigger>
          <NavigationMenuContent>
            {menu.links.map((link) => (
              <NavigationMenuLink key={link.href} href={link.href} description={link.description}>
                {link.label}
              </NavigationMenuLink>
            ))}
          </NavigationMenuContent>
        </NavigationMenuItem>
      ))}
    </NavigationMenu>
  );
}
