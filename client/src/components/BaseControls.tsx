import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { Button } from "@base-ui/react/button";
import { Checkbox } from "@base-ui/react/checkbox";
import { Field } from "@base-ui/react/field";
import { Input } from "@base-ui/react/input";
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

function cx(...classNames: Array<string | false | null | undefined>) {
  return classNames.filter(Boolean).join(" ");
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
          <Select.Value placeholder="선택" />
          <Select.Icon aria-hidden className="base-select-icon" />
        </Select.Trigger>
      </div>
      <Select.Portal>
        <Select.Positioner alignItemWithTrigger={false} sideOffset={6}>
          <Select.Popup className="base-select-popup">
            <Select.List className="base-select-list">
              {options.map((option) => (
                <Select.Item className="base-select-item" key={option.value} value={option.value}>
                  <Select.ItemText>{option.label}</Select.ItemText>
                  <Select.ItemIndicator aria-hidden className="base-select-item-indicator">
                    <span className="base-select-check-mark" />
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.List>
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
          <span className="base-checkbox-check-mark" />
        </Checkbox.Indicator>
      </Checkbox.Root>
      <span>{label}</span>
    </label>
  );
}

export { Button };
