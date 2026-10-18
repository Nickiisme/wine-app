import { forwardRef, type ComponentProps } from "react";

/** Web file-picker rendering. Replace this component for a mini program's media picker. */
export const FilePickerInput = forwardRef<HTMLInputElement, Omit<ComponentProps<"input">, "type">>((props, ref) => <input {...props} ref={ref} type="file" />);
FilePickerInput.displayName = "FilePickerInput";
