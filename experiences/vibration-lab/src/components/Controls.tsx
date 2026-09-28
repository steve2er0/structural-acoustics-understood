import { useId, type InputHTMLAttributes, type ReactNode } from "react";
import { engineeringNumber } from "@engine/units";
import { fromLogPosition, logPosition } from "@engine/scaling";
export function EngineeringReadout({
  label,
  value,
  unit,
  format = engineeringNumber,
  className = "",
}: {
  label?: string;
  value: number;
  unit?: string;
  format?: (n: number) => string;
  className?: string;
}) {
  return (
    <output className={`vl-readout ${className}`}>
      <span>{label}</span>
      <strong>
        {format(value)}
        {unit && <small> {unit}</small>}
      </strong>
    </output>
  );
}
type SliderProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "min" | "max" | "onChange"
> & {
  label?: string;
  value: number;
  min: number;
  max: number;
  unit?: string;
  logarithmic?: boolean;
  onValue: (value: number) => void;
  format?: (n: number) => string;
  marks?: readonly number[];
  inputOnly?: boolean;
};
export function ParameterSlider({
  label,
  value,
  min,
  max,
  unit,
  logarithmic,
  onValue,
  format = engineeringNumber,
  marks,
  inputOnly,
  id,
  ...props
}: SliderProps) {
  const generated = useId(),
    inputId = id ?? generated;
  const input = (
    <input
      {...props}
      id={inputId}
      type="range"
      min={logarithmic ? 0 : min}
      max={logarithmic ? 1000 : max}
      step={logarithmic ? 1 : (props.step ?? "any")}
      value={logarithmic ? logPosition(value, min, max) * 1000 : value}
      aria-label={props["aria-label"] ?? label}
      aria-valuetext={
        props["aria-valuetext"] ?? `${format(value)}${unit ? ` ${unit}` : ""}`
      }
      onChange={(e) =>
        onValue(
          logarithmic
            ? fromLogPosition(Number(e.target.value) / 1000, min, max)
            : Number(e.target.value),
        )
      }
    />
  );
  return inputOnly ? (
    input
  ) : (
    <div className="vl-parameter">
      <label htmlFor={inputId}>
        {label}
        <EngineeringReadout value={value} unit={unit} format={format} />
      </label>
      {input}
      {marks && (
        <div className="vl-marks">
          {marks.map((mark) => (
            <button
              type="button"
              key={mark}
              disabled={props.disabled}
              onClick={() => onValue(mark)}
            >
              {format(mark)}
              {unit && ` ${unit}`}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
export function Toggle({
  checked,
  onChange,
  children,
  className = "",
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={className}
      aria-pressed={checked}
      onClick={() => onChange(!checked)}
    >
      {children}
    </button>
  );
}
export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
  className = "",
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: ReactNode }[];
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div className={`vl-segment ${className}`} role="group" aria-label={label}>
      {options.map((option) => (
        <button
          type="button"
          key={option.value}
          aria-pressed={value === option.value}
          className={value === option.value ? "active" : ""}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
