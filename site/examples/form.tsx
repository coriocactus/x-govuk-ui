import { useRef, useState } from "react";
import {
  Button,
  DateInput,
  Form,
  type FormErrors,
  FormStep,
  FormSteps,
  type FormStepsProps,
  Input,
  Radio,
  Radios,
  ServicePage,
  Textarea,
} from "x-govuk-ui";

type Props = {
  errorTitle?: string;
  titlePrefix?: boolean;
  /** One page of questions, or a short survey asked in stages with FormSteps. */
  example?: "page" | "stages";
  layout?: FormStepsProps["layout"];
  back?: boolean;
  progress?: boolean;
  checkAnswers?: boolean;
  remember?: boolean;
  history?: boolean;
  /** The rating fails to save the first time, as a server error would. */
  fail?: boolean;
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
  return example === "stages" ? <FeedbackInStages {...props} /> : <OnePage {...props} />;
}

/** A page of questions in a service, as GOV.UK lays it out, read from the top left. */
function OnePage({ errorTitle = "There is a problem", titlePrefix = true }: Props) {
  const [ready, setReady] = useState("");
  return (
    <ServicePage
      serviceName="Get a fishing licence"
      serviceUrl="#service"
      homepageUrl="#home"
      phase="Beta"
      back="#previous"
      column="three-quarters"
    >
      <h1 className="preview-page-heading">Your details</h1>
      <Form
        validate={validate}
        errorTitle={errorTitle}
        titlePrefix={titlePrefix}
        onSubmit={() => setReady("Your answers are ready. Nothing was sent.")}
      >
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

const ratings = [
  ["1", "Very satisfied"],
  ["2", "Satisfied"],
  ["3", "Neither satisfied nor dissatisfied"],
  ["4", "Dissatisfied"],
  ["5", "Very dissatisfied"],
];

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
        submitLabel="Send feedback"
        onComplete={async () => {
          await wait(250);
        }}
        done={<p>Thank you for your feedback.</p>}
      >
        <FormStep
          continueLabel="Submit and continue"
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
        <FormStep
          validate={(data): FormErrors => ({
            issues: data.get("issues") ? undefined : "Select yes or no",
          })}
        >
          <Radios name="issues" legend="Have you experienced any technical issues today?">
            <Radio
              value="yes"
              conditional={
                <Textarea name="issue-details" label="Tell us about the technical issues" />
              }
            >
              Yes
            </Radio>
            <Radio value="no">No</Radio>
          </Radios>
          <Textarea name="improvement" label="How could we improve this service?" />
        </FormStep>
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
