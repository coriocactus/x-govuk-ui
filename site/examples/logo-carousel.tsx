import { LogoCarousel } from "x-govuk-ui";

type Props = { visible?: number };

// The ministerial departments GOV.UK lists, in GOV.UK Frontend's colours for them. The workbench's
// `bun run departments` writes this list from GOV.UK's organisations.
const departments = [
  ["Attorney General's Office", "#a91c8e"],
  ["Cabinet Office", "#0056b8"],
  ["Department for Business, Innovation, Science and Trade", "#ff4328"],
  ["Department for Digital, Culture, Media and Sport", "#ed1588"],
  ["Department for Education", "#003764"],
  ["Department for Energy Security and Net Zero", "#003479"],
  ["Department for Environment, Food & Rural Affairs", "#00a33b"],
  ["Department for Transport", "#006853"],
  ["Department for Work and Pensions", "#00bcb5"],
  ["Department of Health and Social Care", "#00a990"],
  ["Foreign, Commonwealth & Development Office", "#012069"],
  ["HM Treasury", "#b2292e"],
  ["Home Office", "#732282"],
  ["Ministry of Defence", "#532a45"],
  ["Ministry of Housing, Communities and Local Government", "#00625e"],
  ["Ministry of Justice", "#000000"],
  ["Northern Ireland Office", "#00205c"],
  ["Office of the Advocate General for Scotland", "#00205c"],
  ["Office of the Leader of the House of Commons", "#497629"],
  ["Office of the Leader of the House of Lords", "#9c182f"],
  ["Scotland Office", "#00205c"],
  ["UK Export Finance", "#e52d13"],
  ["Wales Office", "#a33038"],
].map(([name, colour]) => ({ name, colour }));

export default function LogoCarouselExample({ visible = 4 }: Props) {
  return (
    <LogoCarousel
      key={visible}
      label="This service is run with"
      items={departments}
      visible={visible}
    />
  );
}
