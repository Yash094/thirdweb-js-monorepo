import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useCallback } from "react";
import { toWei } from "thirdweb";
import type { SolidityInputWithTypeProps } from ".";
import { validateInt } from "./helpers";

export const SolidityIntInput: React.FC<SolidityInputWithTypeProps> = ({
  formContext: form,
  solidityType,
  ...inputProps
}) => {
  const { name, ...restOfInputProps } = inputProps;
  const inputName = name as string;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    form.setValue(inputName, value, { shouldDirty: true });

    const inputError = validateInt(value, solidityType);

    if (inputError) {
      form.setError(inputName, inputError);
    } else {
      form.clearErrors(inputName);
    }
  };

  const handleConversion = useCallback(() => {
    const val: string = form.getValues(inputName);

    try {
      const parsed = toWei(val.replace(",", "."));
      form.setValue(inputName, parsed.toString(), {
        shouldDirty: true,
        shouldValidate: true,
      });
      form.clearErrors(inputName);
    } catch {
      form.setError(inputName, {
        type: "pattern",
        message: "Can't be converted to WEI.",
      });
    }
  }, [form, inputName]);

  const formValue = form.watch(inputName) || "";

  const showConversionButton =
    formValue.includes(".") || formValue.includes(",");

  return (
    <div className="relative">
      <Input
        placeholder={solidityType}
        {...restOfInputProps}
        value={form.watch(inputName)}
        onChange={handleChange}
        className={cn(
          showConversionButton && "pr-28",
          restOfInputProps.className,
        )}
      />
      {showConversionButton && (
        <div className="absolute inset-y-0 right-0 flex items-center pr-1">
          <Button variant="ghost" size="sm" onClick={handleConversion}>
            Convert to WEI
          </Button>
        </div>
      )}
    </div>
  );
};
