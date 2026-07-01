import type { TextareaHTMLAttributes } from "react";

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  helperText?: string;
}

export function TextArea({
  className = "",
  helperText,
  id,
  label,
  ...props
}: TextAreaProps) {
  const fieldId = id ?? label.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  return (
    <label className="block" htmlFor={fieldId}>
      <span className="text-sm font-semibold text-slate-800">{label}</span>
      {helperText ? (
        <span className="mt-1 block text-xs text-slate-500">{helperText}</span>
      ) : null}
      <textarea
        className={[
          "mt-2 min-h-24 w-full resize-y rounded-md border border-slate-200 bg-white px-3 py-2 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100",
          className
        ].join(" ")}
        id={fieldId}
        {...props}
      />
    </label>
  );
}
