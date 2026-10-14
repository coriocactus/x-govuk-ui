import { useState } from "react";
import { Button, Form, NotificationBanner, Radio, Radios, Stack, WarningText } from "x-govuk-ui";
import {
  dateText,
  licenceKind,
  money,
  refundPayment,
  timeText,
  useApplication,
} from "../workspace-data";

/**
 * A refund of one of Gordon Brown's two payments for the same licence. The caseworker chooses
 * the payment, and the refund is sent once the form passes.
 */
export default function Refund() {
  const application = useApplication("RL-48207");
  const [sending, setSending] = useState(false);
  // A banner takes focus only for a refund sent here, not when the view opens.
  const [sentHere, setSentHere] = useState(false);
  if (!application) return <p>There is no application RL-48207.</p>;
  const refunded = application.payments.find((payment) => payment.refunded);

  if (refunded)
    return (
      <NotificationBanner type="success" title="Refund sent" autoFocus={sentHere}>
        {`${money(refunded.amount)} is on its way to the card ending ${refunded.card}. It reaches ${application.name}'s account within 5 working days, and the application is ready to issue.`}
      </NotificationBanner>
    );

  return (
    <Form
      validate={(data) => ({
        payment: data.get("payment") ? undefined : "Select the payment to refund",
      })}
      onSubmit={async (data) => {
        setSending(true);
        try {
          await refundPayment(application.reference, String(data.get("payment")));
          setSentHere(true);
        } catch (error) {
          return { form: (error as Error).message };
        } finally {
          setSending(false);
        }
      }}
    >
      <Stack>
        <Radios
          name="payment"
          legend="Which payment do you want to refund?"
          legendSize="medium"
          hint={`${application.name} paid twice for ${licenceKind(application.licence)}. Refund one payment, and keep the other.`}
        >
          {application.payments.map((payment) => (
            <Radio
              key={payment.id}
              value={payment.id}
              hint={`From the card ending ${payment.card}`}
            >
              {`${money(payment.amount)} at ${timeText(payment.date)} on ${dateText(payment.date)}`}
            </Radio>
          ))}
        </Radios>
        <WarningText>A refund cannot be taken back once it is sent.</WarningText>
        <Button type="submit" loading={sending}>
          Send refund
        </Button>
      </Stack>
    </Form>
  );
}
