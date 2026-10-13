import { useRef, useState } from "react";
import {
  Button,
  DateInput,
  FooterLink,
  Form,
  FormErrorSummary,
  type FormErrors,
  FormStep,
  FormSteps,
  FormStepsBack,
  type FormStepsProps,
  FormStepsProvider,
  FormStepsSummary,
  Input,
  Radio,
  Radios,
  Select,
  SelectItem,
  ServicePage,
  Slider,
  Switch,
  Textarea,
  ToggleGroup,
  ToggleGroupItem,
  useFormSteps,
} from "x-govuk-ui";

type Props = {
  errorTitle?: string;
  titlePrefix?: boolean;
  /**
   * One page of questions, an application asked a page at a time with FormSteps, or a short survey
   * asked in stages with FormSteps.
   */
  example?: "page" | "pages" | "stages";
  layout?: FormStepsProps["layout"];
  back?: boolean;
  progress?: boolean;
  checkAnswers?: boolean;
  remember?: boolean;
  history?: boolean;
  /** The rating fails to save the first time, as a server error would. */
  fail?: boolean;
  /** Adds a step asked with other kinds of field, which Check your answers lists too. */
  moreKinds?: boolean;
  /** Starts on the added step, as a link to one question would. */
  fromVisit?: boolean;
};

const answer = (data: FormData, name: string) => String(data.get(name) ?? "").trim();

function birthError(data: FormData) {
  const [day, month, year] = ["day", "month", "year"].map((part) => answer(data, `birth-${part}`));
  if (!day && !month && !year) return "Enter your date of birth";
  const born = new Date(Number(year), Number(month) - 1, Number(day));
  if (year.length !== 4 || born.getDate() !== Number(day) || born.getMonth() !== Number(month) - 1)
    return "Date of birth must be a real date";
  if (born > new Date()) return "Date of birth must be in the past";
}

// Every answer is checked when the form is sent, as GOV.UK recommends.
const validate = (data: FormData): FormErrors => ({
  email: /^\S+@\S+\.\S+$/.test(answer(data, "email"))
    ? undefined
    : "Enter an email address in the correct format, like name@example.com",
  birth: birthError(data),
  licence: data.get("licence") ? undefined : "Select how long you need your licence for",
});

export default function FormExample({ example = "page", ...props }: Props) {
  if (example === "stages") return <FeedbackInStages {...props} />;
  if (example === "pages") return <ApplyInPages />;
  return <OnePage {...props} />;
}

/** A page of questions in a service, as GOV.UK lays it out, read from the top left. */
function OnePage({ errorTitle = "There is a problem", titlePrefix = true, fail = false }: Props) {
  const [ready, setReady] = useState("");
  const failed = useRef(false);
  return (
    <ServicePage
      serviceName="Get a fishing licence"
      serviceUrl="#service"
      homepageUrl="#home"
      phase="Beta"
      feedbackUrl="#feedback"
      back="#previous"
      column="three-quarters"
      crest="/assets/images/govuk-crest.svg"
      footerLinks={
        <>
          <FooterLink href="#help">Help</FooterLink>
          <FooterLink href="#cookies">Cookies</FooterLink>
          <FooterLink href="#accessibility-statement">Accessibility statement</FooterLink>
        </>
      }
    >
      <Form
        validate={validate}
        errorTitle={errorTitle}
        titlePrefix={titlePrefix}
        onSubmit={async () => {
          await wait(250);
          // A message about the whole form, as a server sends one, shows without a link.
          if (fail && !failed.current) {
            failed.current = true;
            return { form: "We could not save your details. Try again." };
          }
          setReady("Your answers are ready. Nothing was sent.");
        }}
      >
        {/* GOV.UK puts the error summary above the page's heading. */}
        <FormErrorSummary />
        <h1 className="preview-page-heading">Your details</h1>
        <Input
          id="email"
          name="email"
          type="email"
          label="Email address"
          hint="We’ll send your licence to this address."
          autoComplete="email"
          spellCheck={false}
        />
        <DateInput
          id="birth"
          name="birth"
          legend="Date of birth"
          hint="For example, 27 3 1985"
          autoCompleteBirthday
          calendar
          max={new Date()}
        />
        <Radios id="licence" name="licence" legend="How long do you need your licence for?">
          <Radio value="day">1 day</Radio>
          <Radio value="week">8 days</Radio>
          <Radio value="year">12 months</Radio>
        </Radios>
        <Button type="submit">Continue</Button>
        <p className="preview-message" role="status" data-success={ready ? "" : undefined}>
          {ready}
        </p>
      </Form>
    </ServicePage>
  );
}

/** Offers to keep the answers for later on each question, but not on Check your answers. */
function SaveForLater({ saved }: { saved: () => void }) {
  const steps = useFormSteps();
  if (!steps || steps.reviewing) return null;
  return (
    <Button variant="secondary" onClick={saved}>
      Save and come back later
    </Button>
  );
}

/** Heads Check your answers, above the answers listed in sections. */
function CheckHeading() {
  const steps = useFormSteps();
  if (!steps?.reviewing) return null;
  return <h1 className="preview-page-heading">Check your answers before you apply</h1>;
}

/**
 * An application in a service, asked a page at a time, as GOV.UK lays it out. The form's Back link
 * sits in the page's own place for one, above the main content, so a FormStepsProvider holds both.
 * Check your answers lists the answers in two sections.
 */
function ApplyInPages() {
  const [saved, setSaved] = useState("");
  return (
    <FormStepsProvider>
      <ServicePage
        serviceName="Get a fishing licence"
        serviceUrl="#service"
        homepageUrl="#home"
        phase="Beta"
        feedbackUrl="#feedback"
        back={<FormStepsBack />}
        column="two-thirds"
        crest="/assets/images/govuk-crest.svg"
      >
        <FormSteps
          title="Apply for a fishing licence"
          labels={{ submit: "Accept and send" }}
          actions={
            <SaveForLater saved={() => setSaved("Your answers are saved. Nothing was sent.")} />
          }
          onInput={() => setSaved("")}
          onComplete={async () => {
            await wait(250);
          }}
        >
          <FormStep
            validate={(data): FormErrors => ({
              "full-name": answer(data, "full-name") ? undefined : "Enter your full name",
            })}
          >
            <Input
              id="full-name"
              name="full-name"
              label="What is your full name?"
              autoComplete="name"
              spellCheck={false}
            />
          </FormStep>
          <FormStep
            validate={(data): FormErrors => ({
              email: /^\S+@\S+\.\S+$/.test(answer(data, "email"))
                ? undefined
                : "Enter an email address in the correct format, like name@example.com",
            })}
          >
            <Input
              id="email"
              name="email"
              type="email"
              label="What is your email address?"
              hint="We’ll send your licence to this address."
              autoComplete="email"
              spellCheck={false}
            />
          </FormStep>
          <FormStep
            validate={(data): FormErrors => ({
              licence: data.get("licence")
                ? undefined
                : "Select how long you need your licence for",
            })}
          >
            <Radios id="licence" name="licence" legend="How long do you need your licence for?">
              <Radio value="day">1 day</Radio>
              <Radio value="week">8 days</Radio>
              <Radio value="year">12 months</Radio>
            </Radios>
          </FormStep>
          <CheckHeading />
          <FormStepsSummary title="Your details" titleLevel={2} steps={[0, 1]} />
          <FormStepsSummary title="Your licence" titleLevel={2} steps={[2]} />
        </FormSteps>
        <p className="preview-message" role="status" data-success={saved ? "" : undefined}>
          {saved}
        </p>
      </ServicePage>
    </FormStepsProvider>
  );
}

const ratings = [
  ["1", "Very satisfied"],
  ["2", "Satisfied"],
  ["3", "Neither satisfied nor dissatisfied"],
  ["4", "Dissatisfied"],
  ["5", "Very dissatisfied"],
];

/**
 * A step of its own, as a service keeps a question it asks in several forms. FormSteps finds it
 * inside the component, in its place among the others.
 */
function IssuesStep() {
  return (
    <FormStep
      validate={(data): FormErrors => ({
        issues: data.get("issues") ? undefined : "Select yes or no",
      })}
    >
      <Radios name="issues" legend="Have you experienced any technical issues today?">
        <Radio
          value="yes"
          conditional={<Textarea name="issue-details" label="Tell us about the technical issues" />}
        >
          Yes
        </Radio>
        <Radio value="no">No</Radio>
      </Radios>
      <Textarea name="improvement" label="How could we improve this service?" />
    </FormStep>
  );
}

/**
 * A step asked with other kinds of field, a toggle group, a slider and a switch, each with a name,
 * so Check your answers lists each as it shows it. The answers to its first question come from a
 * component of the survey's own.
 */
function VisitStep() {
  return (
    <FormStep
      title="About your visit"
      validate={(data): FormErrors => ({
        found: data.get("found") ? undefined : "Select how you found this service",
      })}
    >
      <Radios name="found" legend="How did you find this service?">
        <FoundAnswers />
      </Radios>
      <ToggleGroup name="device" aria-label="What did you use?" defaultValue={["phone"]}>
        <ToggleGroupItem value="phone">Phone</ToggleGroupItem>
        <ToggleGroupItem value="computer">Computer</ToggleGroupItem>
        <ToggleGroupItem value="tablet">Tablet</ToggleGroupItem>
        <ToggleGroupItem value="other">Something else</ToggleGroupItem>
      </ToggleGroup>
      <Slider name="ease" label="How easy was it, from 1 to 5?" min={1} max={5} defaultValue={3} />
      <Select name="part" label="Which part did you use most?" defaultValue="renew">
        <ServiceParts />
      </Select>
      <Switch name="research" label="Take part in research about this service" defaultChecked />
    </FormStep>
  );
}

/** The parts of the service, which several of its questions offer. */
function ServiceParts() {
  return (
    <>
      <SelectItem value="renew">Renewing a licence</SelectItem>
      <SelectItem value="report">Reporting a catch</SelectItem>
    </>
  );
}

/** Where people find the service, as several of its surveys ask. */
function FoundAnswers() {
  return (
    <>
      <Radio value="search">A search engine</Radio>
      <Radio value="govuk">GOV.UK</Radio>
      <Radio value="told">Someone told me about it</Radio>
    </>
  );
}

/** Stands in for a service's API, which takes a moment to answer. */
const wait = (milliseconds: number) => new Promise((done) => setTimeout(done, milliseconds));

/**
 * A short satisfaction survey after a task. The rating is saved as soon as it is given, so it
 * counts even if the rest is abandoned. The other answers are sent at the end.
 */
function FeedbackInStages({
  layout = "card",
  back = false,
  progress = false,
  checkAnswers = false,
  remember = false,
  history = false,
  fail = false,
  moreKinds = false,
  fromVisit = false,
}: Props) {
  const [run, setRun] = useState(0);
  const failed = useRef(false);
  return (
    <div className="preview-survey">
      <FormSteps
        // Start again begins a new survey.
        key={run}
        layout={layout}
        title="Help us improve this service"
        back={back}
        progress={progress}
        checkAnswers={checkAnswers}
        history={history}
        storageKey={remember ? "x-govuk-ui-example-feedback" : undefined}
        defaultStep={moreKinds && fromVisit ? 2 : 0}
        labels={{ submit: "Send feedback" }}
        onComplete={async () => {
          await wait(250);
        }}
        done={<p>Thank you for your feedback.</p>}
      >
        <FormStep
          labels={{ continue: "Submit and continue" }}
          validate={(data): FormErrors => ({
            experience: data.get("experience") ? undefined : "Select a rating to continue",
          })}
          onContinue={async () => {
            await wait(250);
            if (fail && !failed.current) {
              failed.current = true;
              return { experience: "We could not record your rating. Try again." };
            }
          }}
        >
          <Radios
            name="experience"
            legend="Overall, how satisfied were you with this service today?"
          >
            {ratings.map(([value, label]) => (
              <Radio key={value} value={value}>
                {label}
              </Radio>
            ))}
          </Radios>
        </FormStep>
        <IssuesStep />
        {moreKinds && <VisitStep />}
        {moreKinds && (
          // Asked only of those who used a tablet, or something else. The two never apply
          // together, so each asks under one name.
          <FormStep title="Your tablet" when={(data) => data.get("device") === "tablet"}>
            <Input name="model" label="Which tablet did you use?" />
          </FormStep>
        )}
        {moreKinds && (
          <FormStep title="What you used" when={(data) => data.get("device") === "other"}>
            <Input name="model" label="What did you use?" />
          </FormStep>
        )}
      </FormSteps>
      <Button
        variant="link"
        className="preview-survey-again"
        onClick={() => {
          failed.current = false;
          if (remember) localStorage.removeItem("x-govuk-ui-example-feedback");
          setRun(run + 1);
        }}
      >
        Start again
      </Button>
    </div>
  );
}
