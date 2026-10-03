import { useState } from "react";
import { LanguageNavigation, LanguageNavigationItem } from "x-govuk-ui";

const sentences = {
  en: "Apply for a licence to sell alcohol or provide entertainment.",
  cy: "Gwneud cais am drwydded i werthu alcohol neu ddarparu adloniant.",
};

export default function LanguageNavigationExample() {
  const [language, setLanguage] = useState<"en" | "cy">("en");
  const item = (lang: "en" | "cy", name: string, description: string) => (
    <LanguageNavigationItem
      lang={lang}
      href={`#${lang}`}
      current={language === lang}
      description={description}
      // The example switches language in place.
      render={
        <a
          href={`#${lang}`}
          onClick={(event) => {
            event.preventDefault();
            setLanguage(lang);
          }}
        />
      }
    >
      {name}
    </LanguageNavigationItem>
  );
  return (
    <div className="preview-language" lang={language}>
      <LanguageNavigation>
        {item("en", "English", "(Saesneg)")}
        {item("cy", "Cymraeg", "(Welsh)")}
      </LanguageNavigation>
      <p>{sentences[language]}</p>
    </div>
  );
}
