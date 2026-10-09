"use client";

import { OTPInput, REGEXP_ONLY_DIGITS } from "input-otp";
import { AnimatePresence, motion } from "motion/react";
import { type ComponentPropsWithRef, type CSSProperties, Fragment, type ReactNode } from "react";
import { ErrorMessage, Field, Hint, Label, useField } from "./field";
import { duration, easeOut, springs, useMotionTiming } from "./motion";

export type InputOTPProps = Omit<
  ComponentPropsWithRef<typeof OTPInput>,
  "render" | "children" | "maxLength" | "placeholder"
> & {
  label: ReactNode;
  hint?: ReactNode;
  /** Hides the label visually. Screen readers still announce it. */
  hideLabel?: boolean;
  errorMessage?: string;
  maxLength?: number;
  /** Characters shown faintly in empty slots, one per slot. */
  placeholder?: string;
  /** The service is checking the code. A wave passes along the digits, and they cannot change. */
  verifying?: boolean;
  /** The code was accepted. The digits hop in turn and settle with a green edge. */
  success?: boolean;
};

/**
 * GOV.UK's field for a one-time code, such as one sent by text. It is a row of slots, one for each
 * digit, grouped as codes are printed. One ring marks where the next digit goes, and glides between
 * the slots. Each digit plays a key sound, and a pasted code fills the slots. While the service
 * checks the code, a wave passes along the digits. Once the code is accepted, they hop in turn and
 * settle green. It is built on input-otp, so screen readers and password managers see one field.
 */
export function InputOTP({
  label,
  hint,
  hideLabel = false,
  errorMessage,
  maxLength = 6,
  placeholder = "",
  verifying = false,
  success = false,
  id,
  containerClassName = "",
  readOnly,
  "aria-describedby": describedBy,
  ...props
}: InputOTPProps) {
  const timing = useMotionTiming();
  const field = useField({
    id,
    name: props.name,
    hint,
    errorMessage,
    "aria-describedby": describedBy,
  });
  // Split even-length codes into two groups, as they are often printed.
  const groupAt = maxLength >= 4 && maxLength % 2 === 0 ? maxLength / 2 : -1;

  return (
    <Field invalid={field.invalid}>
      <Label htmlFor={field.id} visuallyHidden={hideLabel}>
        {label}
      </Label>
      <Hint id={field.hintId}>{hint}</Hint>
      <ErrorMessage id={field.errorId}>{field.errorMessage}</ErrorMessage>
      <OTPInput
        autoComplete="one-time-code"
        inputMode="numeric"
        pattern={REGEXP_ONLY_DIGITS}
        pasteTransformer={(value) => value.replace(/[\s-]/g, "")}
        {...props}
        // The digits cannot change while the code is checked or once it is accepted.
        readOnly={readOnly || verifying || success}
        {...field.controlProps}
        aria-invalid={field.controlProps["aria-invalid"] ?? props["aria-invalid"]}
        maxLength={maxLength}
        containerClassName={`x-govuk-ui-otp ${containerClassName}`.trim()}
        aria-busy={verifying || undefined}
        render={({ slots, isFocused }) => {
          const complete = slots.every((slot) => slot.char !== null);
          const active = slots.filter((slot) => slot.isActive).length;
          // One ring marks the caret and glides between slots. Once every slot is filled, the caret
          // rests after the last digit, so the ring shows again only when the user selects
          // digits.
          const caret = isFocused && active === 1 && !complete && !verifying && !success;
          return (
            <div
              className="x-govuk-ui-otp-slots"
              aria-hidden="true"
              dir="ltr"
              data-invalid={field.invalid || undefined}
              data-verifying={verifying || undefined}
              data-success={success || undefined}
              data-disabled={props.disabled || undefined}
              data-readonly={readOnly || undefined}
            >
              {slots.map((slot, index) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: Each OTP slot is identified by its fixed digit position.
                <Fragment key={index}>
                  {index === groupAt && <span className="x-govuk-ui-otp-separator" />}
                  <span
                    className="x-govuk-ui-otp-slot"
                    data-selected={(active > 1 && slot.isActive) || undefined}
                    data-filled={slot.char !== null || undefined}
                    style={{ "--x-govuk-ui-otp-index": index } as CSSProperties}
                  >
                    {caret && slot.isActive && (
                      <motion.span
                        layoutId={`${field.id}-ring`}
                        className="x-govuk-ui-otp-ring"
                        transition={timing.spring(springs.hop)}
                      />
                    )}
                    <AnimatePresence initial={false}>
                      {slot.char !== null ? (
                        <motion.span
                          key={`char-${slot.char}`}
                          className="x-govuk-ui-otp-char"
                          initial={{ opacity: 0, y: 10, scale: 0.8, filter: "blur(3px)" }}
                          animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                          // Cleared together, the digits leave from the last back to the first,
                          // following the caret back to the start.
                          exit={{
                            opacity: 0,
                            y: -8,
                            scale: 0.9,
                            filter: "blur(2px)",
                            transition: timing.reduced
                              ? { duration: 0 }
                              : {
                                  duration: duration.fast,
                                  ease: easeOut,
                                  delay: (maxLength - index) * 0.025,
                                },
                          }}
                          transition={timing.ease(duration.medium)}
                        >
                          {slot.char}
                        </motion.span>
                      ) : (
                        placeholder[index] && (
                          <motion.span
                            key="placeholder"
                            className="x-govuk-ui-otp-placeholder"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={timing.ease(duration.fast)}
                          >
                            {placeholder[index]}
                          </motion.span>
                        )
                      )}
                    </AnimatePresence>
                  </span>
                </Fragment>
              ))}
            </div>
          );
        }}
      />
    </Field>
  );
}
