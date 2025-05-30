"use client";

import { MultiNetworkSelector } from "@/components/blocks/NetworkSelectors";
import { Spinner } from "@/components/ui/Spinner/Spinner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useThirdwebClient } from "@/constants/thirdweb.client";
import { useQueryClient } from "@tanstack/react-query";
import type { UseFormReturn } from "react-hook-form";

import { truncateMiddle } from "../utils/abiUtils";
import type {
  AbiData,
  EventSignature,
  FunctionSignature,
  WebhookFormValues,
} from "../utils/webhookTypes";

interface FilterDetailsStepProps {
  form: UseFormReturn<WebhookFormValues>;
  eventSignatures: EventSignature[];
  functionSignatures: FunctionSignature[];
  fetchedAbis: Record<string, AbiData>;
  abiErrors: Record<string, string>;
  fetchedTxAbis: Record<string, AbiData>;
  txAbiErrors: Record<string, string>;
  isFetchingEventAbi: boolean;
  isFetchingTxAbi: boolean;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
  isLoading: boolean;
}

export function FilterDetailsStep({
  form,
  eventSignatures,
  functionSignatures,
  fetchedAbis = {},
  abiErrors = {},
  fetchedTxAbis = {},
  txAbiErrors = {},
  isFetchingEventAbi,
  isFetchingTxAbi,
  goToNextStep,
  goToPreviousStep,
  isLoading,
}: FilterDetailsStepProps) {
  const thirdwebClient = useThirdwebClient();
  const queryClient = useQueryClient();
  const watchFilterType = form.watch("filterType") as
    | "event"
    | "transaction"
    | undefined;
  const selectedChainIds = Array.isArray(form.watch("chainIds"))
    ? form.watch("chainIds").map(Number)
    : [];
  const contractAddresses = form.watch("addresses") || "";

  return (
    <>
      <div className="mb-4">
        <h2 className="font-medium text-lg">
          Step 2: Configure Filters & Advanced Options
        </h2>
        <p className="text-muted-foreground text-sm">
          Configure filter options and advanced settings for your webhook
        </p>
      </div>

      {/* Filter Options */}
      <div className="space-y-3">
        {/* Chain IDs Field */}
        <FormField
          control={form.control}
          name="chainIds"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <div className="flex items-center justify-between text-xs">
                <FormLabel>
                  Chain IDs <span className="text-red-500">*</span>
                </FormLabel>
                <p className="text-muted-foreground">
                  Select the chains you want to monitor
                </p>
              </div>
              <FormControl>
                <MultiNetworkSelector
                  selectedChainIds={
                    Array.isArray(field.value) ? field.value.map(Number) : []
                  }
                  onChange={(chainIds) => field.onChange(chainIds.map(String))}
                  client={thirdwebClient}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {watchFilterType === "event" && (
          <FormField
            control={form.control}
            name="addresses"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <div className="flex items-center justify-between text-xs">
                  <FormLabel>
                    Contract Addresses <span className="text-red-500">*</span>
                  </FormLabel>
                  <p className="text-muted-foreground">
                    Enter a contract address
                  </p>
                </div>
                <FormControl>
                  <div className="space-y-2">
                    <Input placeholder="0x1234..." {...field} />

                    {/* ABI fetch status */}
                    <div className="mt-2 flex items-center justify-between">
                      {watchFilterType === "event" && isFetchingEventAbi && (
                        <div className="flex items-center">
                          <Spinner className="mr-2 h-3 w-3" />
                          <span className="text-xs">Fetching ABIs...</span>
                        </div>
                      )}
                    </div>

                    {/* ABI fetch results */}
                    {(Object.keys(fetchedAbis).length > 0 ||
                      Object.keys(abiErrors).length > 0) && (
                      <div className="mt-2 space-y-2 text-xs">
                        {Object.keys(fetchedAbis).length > 0 && (
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className="border-green-200 bg-green-50 text-green-700"
                            >
                              ✓ {Object.keys(fetchedAbis).length} ABI
                              {Object.keys(fetchedAbis).length !== 1 ? "s" : ""}{" "}
                              fetched
                            </Badge>
                          </div>
                        )}

                        {Object.keys(abiErrors).length > 0 && (
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className="border-red-200 bg-red-50 text-red-700"
                            >
                              ✗ {Object.keys(abiErrors).length} error
                              {Object.keys(abiErrors).length !== 1 ? "s" : ""}
                            </Badge>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {watchFilterType === "transaction" && (
          <>
            <FormField
              control={form.control}
              name="fromAddresses"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <div className="flex items-center justify-between text-xs">
                    <FormLabel>From Address</FormLabel>
                    <p className="text-muted-foreground">
                      Enter a from address
                    </p>
                  </div>
                  <FormControl>
                    <Input
                      placeholder="0x1234..."
                      value={field.value ?? ""}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="toAddresses"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <div className="flex items-center justify-between text-xs">
                    <FormLabel>
                      To Address <span className="text-red-500">*</span>
                    </FormLabel>
                    <p className="text-muted-foreground">Enter a to address</p>
                  </div>
                  <FormControl>
                    <div className="space-y-2">
                      <Input
                        placeholder="0x1234..."
                        value={field.value || ""}
                        onChange={field.onChange}
                      />

                      {/* ABI fetch status */}
                      <div className="mt-2 flex items-center justify-between">
                        {watchFilterType === "transaction" &&
                          isFetchingTxAbi && (
                            <div className="flex items-center">
                              <Spinner className="mr-2 h-3 w-3" />
                              <span className="text-xs">Fetching ABIs...</span>
                            </div>
                          )}
                      </div>

                      {/* ABI fetch results */}
                      {(Object.keys(fetchedTxAbis).length > 0 ||
                        Object.keys(txAbiErrors).length > 0) && (
                        <div className="mt-2 space-y-2 text-xs">
                          {Object.keys(fetchedTxAbis).length > 0 && (
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className="border-green-200 bg-green-50 text-green-700"
                              >
                                ✓ {Object.keys(fetchedTxAbis).length} ABI
                                {Object.keys(fetchedTxAbis).length !== 1
                                  ? "s"
                                  : ""}{" "}
                                fetched
                              </Badge>
                            </div>
                          )}

                          {Object.keys(txAbiErrors).length > 0 && (
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className="border-red-200 bg-red-50 text-red-700"
                              >
                                ⚠️ {Object.keys(txAbiErrors).length} error
                                {Object.keys(txAbiErrors).length !== 1
                                  ? "s"
                                  : ""}
                              </Badge>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}
      </div>

      {/* Advanced Options Section */}
      <div className="space-y-3">
        {/* Signature Hash Field - reused for both event and transaction types */}
        <FormField
          control={form.control}
          name="sigHash"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <div className="flex items-center justify-between text-xs">
                <FormLabel>
                  {watchFilterType === "event"
                    ? "Event Signature (optional)"
                    : "Function Signature (optional)"}
                </FormLabel>
                <p className="text-muted-foreground">
                  {watchFilterType === "event"
                    ? "Select an event to monitor"
                    : "Select a function to monitor"}
                </p>
              </div>
              <FormControl>
                {watchFilterType === "event" &&
                Object.keys(fetchedAbis).length > 0 &&
                eventSignatures.length > 0 ? (
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value);
                      // Find the selected event
                      const selectedEvent = eventSignatures.find(
                        (sig) => sig.signature === value,
                      );
                      // Set the ABI for the event
                      form.setValue("sigHashAbi", selectedEvent?.abi || "");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select an event signature">
                        {field.value
                          ? eventSignatures.find(
                              (sig) => sig.signature === field.value,
                            )?.name || ""
                          : null}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="max-h-60 overflow-y-auto">
                      {eventSignatures.map((event) => {
                        // Truncate the hash for display purposes
                        const truncatedHash = truncateMiddle(
                          event.signature,
                          6,
                          4,
                        );

                        return (
                          <SelectItem
                            key={event.signature}
                            value={event.signature}
                            title={event.name}
                          >
                            <div className="flex flex-col">
                              <span className="font-medium">{event.name}</span>
                              <span className="text-muted-foreground text-xs">
                                Signature: {truncatedHash}
                              </span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                ) : watchFilterType === "transaction" &&
                  Object.keys(fetchedTxAbis).length > 0 &&
                  functionSignatures.length > 0 ? (
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value);
                      // Find the selected function
                      const selectedFunction = functionSignatures.find(
                        (sig) => sig.signature === value,
                      );
                      // Set the ABI for the function
                      form.setValue("sigHashAbi", selectedFunction?.abi || "");
                    }}
                  >
                    <SelectTrigger className="max-w-full">
                      <SelectValue placeholder="Select a function signature">
                        {field.value
                          ? functionSignatures.find(
                              (sig) => sig.signature === field.value,
                            )?.name || ""
                          : null}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="max-h-60 max-w-[600px] overflow-y-auto">
                      {functionSignatures.map((func) => (
                        <SelectItem
                          key={func.signature}
                          value={func.signature}
                          title={func.signature}
                          className="w-full overflow-x-auto"
                        >
                          <div className="flex w-full flex-col">
                            <span className="overflow-x-auto whitespace-nowrap pb-1 font-medium">
                              {func.name}
                            </span>
                            <span className="overflow-x-auto text-muted-foreground text-xs">
                              Selector: {func.signature}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    placeholder={
                      watchFilterType === "event"
                        ? "Fetching event signatures..."
                        : "Fetching function signatures..."
                    }
                    value={field.value}
                    onChange={field.onChange}
                    disabled={
                      (watchFilterType === "event" && isFetchingEventAbi) ||
                      (watchFilterType === "transaction" && isFetchingTxAbi)
                    }
                  />
                )}
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* ABI Field */}
        <FormField
          control={form.control}
          name="abi"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <div className="flex items-center justify-between text-xs">
                <FormLabel>ABI (optional)</FormLabel>
                <p className="text-muted-foreground">
                  {watchFilterType === "event"
                    ? "Enter the ABI of the contract or event"
                    : "Enter the ABI of the contract or function"}
                </p>
              </div>
              <FormControl>
                {(watchFilterType === "event" &&
                  Object.keys(fetchedAbis).length > 0) ||
                (watchFilterType === "transaction" &&
                  Object.keys(fetchedTxAbis).length > 0) ? (
                  <div className="space-y-2 rounded-md border bg-primary/5 p-3">
                    <div className="flex items-center">
                      <Badge className="border-green-200 bg-green-100 text-green-800">
                        ✓ ABI Automatically Fetched
                      </Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="ml-auto h-7 text-xs"
                        onClick={async () => {
                          try {
                            if (watchFilterType === "event") {
                              await Promise.all(
                                selectedChainIds.flatMap((chainId) =>
                                  contractAddresses
                                    .split(/[,\s]+/)
                                    .map((a) => a.trim())
                                    .filter(Boolean)
                                    .map((address) =>
                                      queryClient.resetQueries({
                                        queryKey: [
                                          "abis",
                                          String(chainId),
                                          address,
                                          watchFilterType,
                                        ],
                                        exact: true,
                                      }),
                                    ),
                                ),
                              );

                              // Reset event-specific form values
                              form.setValue("addresses", "");
                              // Reset signature hash
                              form.setValue("sigHash", "");
                              form.setValue("sigHashAbi", "");
                            } else if (watchFilterType === "transaction") {
                              // Reset for all chainId/address pairs concurrently
                              const resetPromises: Promise<void>[] = [];
                              for (const chainId of selectedChainIds) {
                                for (const address of (
                                  form.watch("toAddresses") || ""
                                )
                                  .split(/[,\s]+/)
                                  .map((a) => a.trim())
                                  .filter(Boolean)) {
                                  resetPromises.push(
                                    (async () => {
                                      try {
                                        await queryClient.resetQueries({
                                          queryKey: [
                                            "abis",
                                            String(chainId),
                                            address,
                                            watchFilterType,
                                          ],
                                          exact: true,
                                        });
                                      } catch (err) {
                                        console.error(
                                          "Failed to reset query for tx ABI",
                                          chainId,
                                          address,
                                          err,
                                        );
                                      }
                                    })(),
                                  );
                                }
                              }
                              await Promise.all(resetPromises);

                              // Reset transaction-specific form values
                              form.setValue("toAddresses", "");
                              // Reset signature hash
                              form.setValue("sigHash", "");
                              form.setValue("sigHashAbi", "");
                            }
                          } catch (err) {
                            console.error("Error during ABI reset:", err);
                          }
                        }}
                      >
                        Reset
                      </Button>
                    </div>
                    <p className="text-muted-foreground text-xs">
                      ABIs have been automatically fetched for the contracts you
                      specified.
                    </p>
                  </div>
                ) : (
                  <Textarea
                    placeholder={"[{...}]"}
                    className="font-mono"
                    rows={2}
                    {...field}
                  />
                )}
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="flex justify-between pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={goToPreviousStep}
          disabled={isLoading}
        >
          Back
        </Button>
        <Button type="button" onClick={goToNextStep} disabled={isLoading}>
          Next
        </Button>
      </div>
    </>
  );
}
