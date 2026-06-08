import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { Button } from "@base-ui/react/button";
import { Checkbox } from "@base-ui/react/checkbox";
import { Field } from "@base-ui/react/field";
import { Input } from "@base-ui/react/input";
import { Progress } from "@base-ui/react/progress";
import { Select } from "@base-ui/react/select";

type TextFieldProps = Omit<
  ComponentPropsWithoutRef<typeof Input>,
  "className" | "onValueChange"
> & {
  fieldClassName?: string;
  inputClassName?: string;
  label: ReactNode;
  labelClassName?: string;
  onValueChange: (value: string) => void;
};

type SelectOption<Value extends string> = {
  label: ReactNode;
  value: Value;
};

type SelectFieldProps<Value extends string> = {
  disabled?: boolean;
  fieldClassName?: string;
  id: string;
  label: ReactNode;
  name: string;
  onValueChange: (value: Value) => void;
  options: ReadonlyArray<SelectOption<Value>>;
  value: Value;
};

type CheckboxFieldProps = {
  checked: boolean;
  disabled?: boolean;
  label: ReactNode;
  name?: string;
  onCheckedChange: (checked: boolean) => void;
};

type ProgressBarProps = {
  label: string;
  max?: number;
  value?: number | null;
};

function cx(...classNames: Array<string | false | null | undefined>) {
  return classNames.filter(Boolean).join(" ");
}

function CaretUpDownIcon(props: ComponentPropsWithoutRef<"svg">) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      {...props}
      style={{ display: "block", ...props.style }}
    >
      <path d="M11 10H5l3 3.5zm0-4H5l3-3.5z" />
    </svg>
  );
}

function CaretUpIcon(props: ComponentPropsWithoutRef<"svg">) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      {...props}
      style={{ display: "block", ...props.style }}
    >
      <path d="M12 10H4l4-4.5z" />
    </svg>
  );
}

function CaretDownIcon(props: ComponentPropsWithoutRef<"svg">) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      {...props}
      style={{ display: "block", ...props.style }}
    >
      <path d="M12 6H4l4 4.5z" />
    </svg>
  );
}

function CheckIcon(props: ComponentPropsWithoutRef<"svg">) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      {...props}
      style={{ display: "block", ...props.style }}
    >
      <path d="m2.5 8.5 4 4 7-9" />
    </svg>
  );
}

export function TextField({
  fieldClassName,
  inputClassName,
  label,
  labelClassName,
  onValueChange,
  ...inputProps
}: TextFieldProps) {
  return (
    <Field.Root className={cx("base-field", fieldClassName)}>
      <Field.Label className={cx("base-field-label", labelClassName)}>{label}</Field.Label>
      <Input
        {...inputProps}
        className={cx("base-input", inputClassName)}
        onValueChange={(nextValue) => onValueChange(nextValue)}
      />
    </Field.Root>
  );
}

export function SelectField<Value extends string>({
  disabled,
  fieldClassName,
  id,
  label,
  name,
  onValueChange,
  options,
  value
}: SelectFieldProps<Value>) {
  return (
    <Select.Root<Value>
      disabled={disabled}
      id={id}
      items={options}
      name={name}
      onValueChange={(nextValue) => {
        if (typeof nextValue === "string") {
          onValueChange(nextValue as Value);
        }
      }}
      value={value}
    >
      <div className={cx("base-field base-select-field", fieldClassName)}>
        <Select.Label className="base-field-label">{label}</Select.Label>
        <Select.Trigger aria-label={String(label)} className="base-select-trigger" disabled={disabled}>
          <Select.Value className="base-select-value" placeholder="선택" />
          <Select.Icon aria-hidden className="base-select-icon">
            <CaretUpDownIcon />
          </Select.Icon>
        </Select.Trigger>
      </div>
      <Select.Portal>
        <Select.Positioner className="base-select-positioner" sideOffset={4}>
          <Select.Popup className="base-select-popup">
            <Select.ScrollUpArrow className="base-select-scroll-arrow">
              <CaretUpIcon />
            </Select.ScrollUpArrow>
            <Select.List className="base-select-list">
              {options.map((option) => (
                <Select.Item className="base-select-item" key={option.value} value={option.value}>
                  <Select.ItemIndicator aria-hidden className="base-select-item-indicator">
                    <CheckIcon />
                  </Select.ItemIndicator>
                  <Select.ItemText className="base-select-item-text">{option.label}</Select.ItemText>
                </Select.Item>
              ))}
            </Select.List>
            <Select.ScrollDownArrow className="base-select-scroll-arrow">
              <CaretDownIcon />
            </Select.ScrollDownArrow>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}

export function CheckboxField({
  checked,
  disabled,
  label,
  name,
  onCheckedChange
}: CheckboxFieldProps) {
  return (
    <label className="base-checkbox-field">
      <Checkbox.Root
        checked={checked}
        className="base-checkbox"
        disabled={disabled}
        name={name}
        onCheckedChange={(nextChecked) => onCheckedChange(nextChecked)}
      >
        <Checkbox.Indicator aria-hidden className="base-checkbox-indicator">
          <CheckIcon />
        </Checkbox.Indicator>
      </Checkbox.Root>
      <span>{label}</span>
    </label>
  );
}

export function ProgressBar({ label, max = 100, value = null }: ProgressBarProps) {
  return (
    <Progress.Root aria-valuetext={label} className="base-progress" max={max} value={value}>
      <Progress.Label className="base-progress-label">{label}</Progress.Label>
      <Progress.Track className="base-progress-track">
        <Progress.Indicator
          className="base-progress-indicator"
          key={value === null ? "indeterminate" : "determinate"}
        />
      </Progress.Track>
    </Progress.Root>
  );
}

export { Button };
