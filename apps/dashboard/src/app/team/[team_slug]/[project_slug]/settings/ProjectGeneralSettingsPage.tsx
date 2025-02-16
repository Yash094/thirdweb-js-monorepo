"use client";

import { apiServerProxy } from "@/actions/proxies";
import { DangerSettingCard } from "@/components/blocks/DangerSettingCard";
import { SettingsCard } from "@/components/blocks/SettingsCard";
import { CopyTextButton } from "@/components/ui/CopyTextButton";
import { DynamicHeight } from "@/components/ui/DynamicHeight";
import { Spinner } from "@/components/ui/Spinner/Spinner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox, CheckboxWithLabel } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ToolTipLabel } from "@/components/ui/tooltip";
import { useDashboardRouter } from "@/lib/DashboardRouter";
import { cn } from "@/lib/utils";
import type { ApiKey, UpdateKeyInput } from "@3rdweb-sdk/react/hooks/useApi";
import {
  useRevokeApiKey,
  useUpdateApiKey,
} from "@3rdweb-sdk/react/hooks/useApi";
import { zodResolver } from "@hookform/resolvers/zod";
import { type UseMutationResult, useMutation } from "@tanstack/react-query";
import { SERVICES } from "@thirdweb-dev/service-utils";
import {
  type ServiceName,
  getServiceByName,
} from "@thirdweb-dev/service-utils";
import { format } from "date-fns";
import { useTrack } from "hooks/analytics/useTrack";
import {
  CircleAlertIcon,
  ExternalLinkIcon,
  RefreshCcwIcon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { type UseFormReturn, useForm } from "react-hook-form";
import { type FieldArrayWithId, useFieldArray } from "react-hook-form";
import { toast } from "sonner";
import { joinWithComma, toArrFromList } from "utils/string";
import {
  HIDDEN_SERVICES,
  type ProjectSettingsPageFormSchema,
  projectSettingsPageFormSchema,
} from "../../../../../components/settings/ApiKeys/validations";

type EditProjectUIPaths = {
  inAppConfig: string;
  aaConfig: string;
  payConfig: string;
  afterDeleteRedirectTo: string;
};

type RotateSecretKeyAPIReturnType = {
  data: {
    secret: string;
    secretMasked: string;
    secretHash: string;
  };
};

export function ProjectGeneralSettingsPage(props: {
  apiKey: ApiKey;
  paths: EditProjectUIPaths;
  onKeyUpdated: (() => void) | undefined;
  showNebulaSettings: boolean;
  projectId: string;
}) {
  const updateMutation = useUpdateApiKey();
  const deleteMutation = useRevokeApiKey();

  return (
    <ProjectGeneralSettingsPageUI
      apiKey={props.apiKey}
      updateMutation={updateMutation}
      deleteMutation={deleteMutation}
      paths={props.paths}
      onKeyUpdated={props.onKeyUpdated}
      showNebulaSettings={props.showNebulaSettings}
      rotateSecretKey={async () => {
        const res = await apiServerProxy<RotateSecretKeyAPIReturnType>({
          pathname: "/v2/keys/rotate-secret-key",
          method: "POST",
          body: JSON.stringify({
            projectId: props.projectId,
          }),
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!res.ok) {
          throw new Error(res.error);
        }

        return res.data;
      }}
    />
  );
}

type UpdateMutation = UseMutationResult<
  unknown,
  unknown,
  UpdateKeyInput,
  unknown
>;

type DeleteMutation = UseMutationResult<unknown, unknown, string, unknown>;

interface EditApiKeyProps {
  apiKey: ApiKey;
  updateMutation: UpdateMutation;
  deleteMutation: DeleteMutation;
  paths: EditProjectUIPaths;
  onKeyUpdated: (() => void) | undefined;
  showNebulaSettings: boolean;
  rotateSecretKey: () => Promise<RotateSecretKeyAPIReturnType>;
}

type UpdateAPIForm = UseFormReturn<ProjectSettingsPageFormSchema>;

export const ProjectGeneralSettingsPageUI: React.FC<EditApiKeyProps> = (
  props,
) => {
  const { apiKey, updateMutation, deleteMutation } = props;
  const trackEvent = useTrack();
  const router = useDashboardRouter();
  const form = useForm<ProjectSettingsPageFormSchema>({
    resolver: zodResolver(projectSettingsPageFormSchema),
    defaultValues: {
      name: apiKey.name,
      domains: joinWithComma(apiKey.domains),
      bundleIds: joinWithComma(apiKey.bundleIds),
      redirectUrls: joinWithComma(apiKey.redirectUrls),
      services: SERVICES.map((srv) => {
        const existingService = (apiKey.services || []).find(
          (s) => s.name === srv.name,
        );

        return {
          name: srv.name,
          targetAddresses: existingService
            ? joinWithComma(existingService.targetAddresses)
            : "",
          enabled: !!existingService,
          actions: existingService?.actions || [],
          recoveryShareManagement: existingService?.recoveryShareManagement,
          customAuthentication: existingService?.customAuthentication,
          customAuthEndpoint: existingService?.customAuthEndpoint,
          applicationName: existingService?.applicationName,
          applicationImageUrl: existingService?.applicationImageUrl,
        };
      }),
    },
  });

  const handleSubmit = form.handleSubmit((values) => {
    const enabledServices = (values.services || []).filter(
      (srv) => !!srv.enabled,
    );

    if (enabledServices.length > 0) {
      // validate embedded wallets custom auth
      const embeddedWallets = enabledServices.find(
        (s) => s.name === "embeddedWallets",
      );

      if (embeddedWallets) {
        const { customAuthentication, recoveryShareManagement } =
          embeddedWallets;

        if (
          recoveryShareManagement === "USER_MANAGED" &&
          (!customAuthentication?.aud.length ||
            !customAuthentication?.jwksUri.length)
        ) {
          return toast.error("Custom JSON Web Token configuration is invalid", {
            description:
              "To use In-App Wallets with Custom JSON Web Token, provide JWKS URI and AUD.",
          });
        }
      }

      const formattedValues = {
        id: apiKey.id,
        name: values.name,
        domains: toArrFromList(values.domains),
        bundleIds: toArrFromList(values.bundleIds),
        redirectUrls: toArrFromList(values.redirectUrls, true),
        services: (values.services || [])
          .filter((srv) => srv.enabled)
          // FIXME: Not yet supported, add when it is
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          .map(({ recoveryShareManagement, ...srv }) => ({
            ...srv,
            targetAddresses: toArrFromList(srv.targetAddresses),
          })),
      };

      trackEvent({
        category: "api-keys",
        action: "edit",
        label: "attempt",
      });

      updateMutation.mutate(formattedValues, {
        onSuccess: () => {
          toast.success("Project updated successfully");
          trackEvent({
            category: "api-keys",
            action: "edit",
            label: "success",
          });

          props.onKeyUpdated?.();
        },
        onError: (err) => {
          toast.error("Failed to update project");
          trackEvent({
            category: "api-keys",
            action: "edit",
            label: "error",
            error: err,
          });
        },
      });
    } else {
      toast.error("Service not selected", {
        description: "Choose at least one service",
      });
    }
  });

  return (
    <Form {...form}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
        autoComplete="off"
      >
        <div className="flex flex-col gap-8">
          <ProjectNameSetting
            form={form}
            updateMutation={updateMutation}
            handleSubmit={handleSubmit}
          />

          <APIKeyDetails
            apiKey={apiKey}
            rotateSecretKey={props.rotateSecretKey}
          />

          <AllowedDomainsSetting
            form={form}
            updateMutation={updateMutation}
            handleSubmit={handleSubmit}
          />

          <AllowedBundleIDsSetting
            form={form}
            updateMutation={updateMutation}
            handleSubmit={handleSubmit}
          />

          <EnabledServicesSetting
            form={form}
            apiKey={apiKey}
            updateMutation={updateMutation}
            handleSubmit={handleSubmit}
            paths={props.paths}
            showNebulaSettings={props.showNebulaSettings}
          />

          <DeleteProject
            id={apiKey.id}
            name={apiKey.name}
            deleteMutation={deleteMutation}
            onDeleteSuccessful={() => {
              router.replace(props.paths.afterDeleteRedirectTo);
            }}
          />
        </div>
      </form>
    </Form>
  );
};

function ProjectNameSetting(props: {
  form: UpdateAPIForm;
  updateMutation: UpdateMutation;
  handleSubmit: () => void;
}) {
  const { form, updateMutation, handleSubmit } = props;
  const isNameDirty = form.getFieldState("name").isDirty;

  return (
    <SettingsCard
      header={{
        title: "Project Name",
        description:
          "Assign a name to identify your project on thirdweb dashboard",
      }}
      noPermissionText={undefined}
      errorText={form.getFieldState("name").error?.message}
      saveButton={{
        onClick: handleSubmit,
        disabled: !isNameDirty,
        isPending: updateMutation.isPending && isNameDirty,
      }}
      bottomText="Please use 64 characters at maximum"
    >
      <Input
        autoFocus
        placeholder="My Project"
        type="text"
        {...form.register("name")}
        className="max-w-[350px] bg-background"
      />
    </SettingsCard>
  );
}

function AllowedDomainsSetting(props: {
  form: UpdateAPIForm;
  updateMutation: UpdateMutation;
  handleSubmit: () => void;
}) {
  const { form, handleSubmit, updateMutation } = props;
  const isDomainsDirty = form.getFieldState("domains").isDirty;

  const helperText = (
    <ul className="flex list-disc flex-col gap-1.5 py-1 pl-3 text-muted-foreground text-sm [&>li]:pl-1">
      <li>
        Authorize all domains with{" "}
        <span className="inline-block rounded bg-muted px-2 font-mono text-xs">
          *
        </span>
        {". "}
        <span>
          Example:{" "}
          <span className="inline-block rounded bg-muted px-2 font-mono text-xs">
            *.thirdweb.com
          </span>{" "}
          accepts all
          <span className="inline-block rounded bg-muted px-2 font-mono text-xs">
            .thirdweb.com
          </span>{" "}
          sites
        </span>
      </li>
      <li>
        Authorize localhost URLs with{" "}
        <span className="inline-block rounded bg-muted px-2 font-mono text-xs">
          {"localhost:<port>"}
        </span>
      </li>
      <li>Enter domains separated by commas or new lines</li>
    </ul>
  );

  return (
    <SettingsCard
      header={{
        title: "Domain Restrictions",
        description:
          "Only allow Client ID to be used on specific domains to prevent unauthorized use",
      }}
      noPermissionText={undefined}
      errorText={form.getFieldState("domains", form.formState).error?.message}
      saveButton={{
        onClick: handleSubmit,
        disabled: !isDomainsDirty,
        isPending: updateMutation.isPending && isDomainsDirty,
      }}
      bottomText="This is only applicable for web applications"
    >
      <div className="flex flex-col gap-6">
        <div className="relative">
          <Label htmlFor="domains" className="mb-2 inline-block">
            Allowed Domains
          </Label>

          <CheckboxWithLabel className="absolute top-0 right-0">
            <Checkbox
              checked={form.watch("domains") === "*"}
              onCheckedChange={(v) => {
                form.setValue("domains", v ? "*" : "", {
                  shouldDirty: true,
                });
              }}
            />
            All Domains
          </CheckboxWithLabel>

          <Textarea
            placeholder="thirdweb.com, rpc.example.com, localhost:3000"
            {...form.register("domains")}
          />
        </div>

        {helperText}

        {!form.watch("domains") && (
          <Alert variant="warning">
            <AlertTitle className="text-sm">No Domains Configured</AlertTitle>
            <AlertDescription>
              This will deny requests from all origins, rendering the key
              unusable in frontend applications. <br /> Proceed only if you
              intend to use this key in server or native apps environments
            </AlertDescription>
          </Alert>
        )}

        {form.watch("domains") === "*" && (
          <Alert variant="warning">
            <AlertTitle className="text-sm">Unrestricted Web Access</AlertTitle>
            <AlertDescription>
              Requests from all origins will be authorized. Your key can be
              misused by other websites
            </AlertDescription>
          </Alert>
        )}
      </div>
    </SettingsCard>
  );
}

function AllowedBundleIDsSetting(props: {
  form: UpdateAPIForm;
  updateMutation: UpdateMutation;
  handleSubmit: () => void;
}) {
  const { form, handleSubmit, updateMutation } = props;
  const isBundleIdsDirty = form.getFieldState("bundleIds").isDirty;
  return (
    <SettingsCard
      saveButton={{
        onClick: handleSubmit,
        disabled: !isBundleIdsDirty,
        isPending: updateMutation.isPending && isBundleIdsDirty,
      }}
      noPermissionText={undefined}
      header={{
        title: "Bundle ID Restrictions",
        description:
          "Only allow Client ID to be used on specific Bundle IDs to prevent unauthorized use",
      }}
      bottomText="This is only applicable for Native games or Native applications"
      errorText={form.getFieldState("bundleIds", form.formState).error?.message}
    >
      <div className="flex flex-col gap-4">
        <div className="relative ">
          <CheckboxWithLabel className="absolute top-0 right-0">
            <Checkbox
              checked={form.watch("bundleIds") === "*"}
              onCheckedChange={(checked) => {
                form.setValue("bundleIds", checked ? "*" : "", {
                  shouldDirty: true,
                });
              }}
            />
            All Bundle IDs
          </CheckboxWithLabel>

          <Label className="mb-2 inline-block">Allowed Bundle IDs</Label>

          <Textarea
            placeholder="com.thirdweb.app"
            {...form.register("bundleIds")}
          />
        </div>

        <p className="text-muted-foreground text-sm ">
          Enter bundle ids separated by commas or new lines.
        </p>

        {!form.watch("bundleIds") && (
          <Alert variant="warning">
            <AlertTitle className="text-sm">
              No Bundle IDs Configured
            </AlertTitle>
            <AlertDescription>
              This will deny requests from all native applications, rendering
              the key unusable. Proceed only if you intend to use this key in
              server or frontend environments.
            </AlertDescription>
          </Alert>
        )}
        {form.watch("bundleIds") === "*" && (
          <Alert variant="warning">
            <AlertTitle className="text-sm">Unrestricted App Access</AlertTitle>
            <AlertDescription>
              Requests from all applications will be authorized. If your key is
              leaked it could be misused.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </SettingsCard>
  );
}

function EnabledServicesSetting(props: {
  form: UpdateAPIForm;
  updateMutation: UpdateMutation;
  handleSubmit: () => void;
  apiKey: ApiKey;
  paths: EditApiKeyProps["paths"];
  showNebulaSettings: boolean;
}) {
  const { form, handleSubmit, updateMutation } = props;

  const { fields, update } = useFieldArray({
    control: form.control,
    name: "services",
  });
  const handleAction = (
    srvIdx: number,
    srv: FieldArrayWithId<ProjectSettingsPageFormSchema, "services", "id">,
    actionName: string,
    checked: boolean,
  ) => {
    const actions = checked
      ? [...(srv.actions || []), actionName]
      : (srv.actions || []).filter((a) => a !== actionName);

    update(srvIdx, {
      ...srv,
      actions,
    });
  };

  return (
    <SettingsCard
      header={{
        title: "Enabled Services",
        description: "thirdweb services enabled for this project",
      }}
      noPermissionText={undefined}
      errorText={undefined}
      saveButton={{
        onClick: handleSubmit,
        disabled: !form.formState.isDirty,
        isPending: updateMutation.isPending,
      }}
      bottomText=""
    >
      <DynamicHeight>
        <div className="flex flex-col">
          {fields.map((srv, idx) => {
            const service = getServiceByName(srv.name as ServiceName);
            const hidden =
              (service.name === "nebula" && !props.showNebulaSettings) ||
              HIDDEN_SERVICES.includes(service.name);

            const serviceName = getServiceByName(service.name as ServiceName);
            const shouldShow = !hidden && serviceName;

            if (!shouldShow) {
              return null;
            }

            let configurationLink: string | undefined;
            if (service.name === "embeddedWallets" && srv.enabled) {
              configurationLink = props.paths.inAppConfig;
            } else if (service.name === "bundler" && srv.enabled) {
              configurationLink = props.paths.aaConfig;
            } else if (service.name === "pay") {
              configurationLink = props.paths.payConfig;
            }

            return (
              <div
                key={srv.name}
                className="flex items-start justify-between gap-6 border-border border-t py-5"
              >
                {/* Left */}
                <div className="flex flex-col gap-4">
                  <div>
                    <h4 className="font-semibold text-base">{service.title}</h4>
                    <p className="text-muted-foreground text-sm">
                      {service.description}
                    </p>
                  </div>

                  {configurationLink && (
                    <div>
                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                        className="min-w-32 justify-between gap-2"
                      >
                        <Link href={configurationLink}>
                          Configure
                          <ExternalLinkIcon className="size-3 text-muted-foreground" />
                        </Link>
                      </Button>
                    </div>
                  )}

                  {service.actions.length > 0 && (
                    <div className="flex gap-4">
                      {service.actions.map((sa) => (
                        <ToolTipLabel key={sa.name} label={sa.description}>
                          <div>
                            <CheckboxWithLabel>
                              <Checkbox
                                checked={srv.actions.includes(sa.name)}
                                onCheckedChange={(checked) =>
                                  handleAction(idx, srv, sa.name, !!checked)
                                }
                              />
                              {sa.title}
                            </CheckboxWithLabel>
                          </div>
                        </ToolTipLabel>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right */}
                <Switch
                  checked={srv.enabled}
                  onCheckedChange={(v) =>
                    update(idx, {
                      ...srv,
                      enabled: !!v,
                    })
                  }
                />
              </div>
            );
          })}
        </div>
      </DynamicHeight>
    </SettingsCard>
  );
}

function APIKeyDetails({
  apiKey,
  rotateSecretKey,
}: {
  rotateSecretKey: () => Promise<RotateSecretKeyAPIReturnType>;
  apiKey: ApiKey;
}) {
  const { createdAt, updatedAt, lastAccessedAt } = apiKey;
  const [secretKeyMasked, setSecretKeyMasked] = useState(apiKey.secretMasked);

  return (
    <div className="flex flex-col gap-6 rounded-lg border border-border bg-card px-4 py-6 lg:px-6">
      <div>
        <h3>Client ID</h3>
        <p className="mb-2 text-muted-foreground text-sm">
          Identifies your application.
        </p>

        <CopyTextButton
          textToCopy={apiKey.key}
          className="!h-auto w-full max-w-[350px] justify-between truncate bg-background px-3 py-3 font-mono"
          textToShow={apiKey.key}
          copyIconPosition="right"
          tooltip="Copy Client ID"
        />
      </div>

      {/* NOTE: for very old api keys the secret might be `null`, if that's the case we skip it */}
      {secretKeyMasked && (
        <div>
          <h3>Secret Key</h3>
          <p className="mb-2 text-muted-foreground text-sm">
            Identifies and authenticates your application from a backend. <br />{" "}
            This is not the full secret key, Refer to your saved secret key at
            the time of creation for the full secret key.
          </p>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="rounded-lg border border-border bg-background px-4 py-3 font-mono text-sm lg:w-[350px]">
              {secretKeyMasked}
            </div>

            <RotateSecretKeyButton
              rotateSecretKey={rotateSecretKey}
              onSuccess={(data) => {
                setSecretKeyMasked(data.data.secretMasked);
              }}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <TimeInfo label="Created" date={createdAt} />
        <TimeInfo label="Last Updated" date={updatedAt} />
        <TimeInfo label="Last Accessed" date={lastAccessedAt} />
      </div>
    </div>
  );
}

function TimeInfo(props: {
  label: string;
  date: string | undefined;
}) {
  return (
    <div>
      <p> {props.label}</p>
      <p className="text-muted-foreground text-sm">
        {props.date ? format(new Date(props.date), "MMMM dd, yyyy") : "Never"}
      </p>
    </div>
  );
}

function DeleteProject(props: {
  id: string;
  name: string;
  deleteMutation: UseMutationResult<unknown, unknown, string, unknown>;
  onDeleteSuccessful: () => void;
}) {
  const { id, name, deleteMutation, onDeleteSuccessful } = props;
  const trackEvent = useTrack();

  const handleRevoke = () => {
    trackEvent({
      category: "api-keys",
      action: "revoke",
      label: "attempt",
    });

    deleteMutation.mutate(id, {
      onSuccess: () => {
        toast.success("Project deleted successfully");
        onDeleteSuccessful();
        trackEvent({
          category: "api-keys",
          action: "revoke",
          label: "success",
        });
      },
      onError: (err) => {
        // onError(err);
        toast.error("Failed to delete project");
        trackEvent({
          category: "api-keys",
          action: "revoke",
          label: "error",
          error: err,
        });
      },
    });
  };

  const description =
    "The associated Client ID and Secret Key will not able to access thirdweb services after deletion. This action is irreversible";

  return (
    <DangerSettingCard
      buttonOnClick={() => handleRevoke()}
      buttonLabel="Delete project"
      confirmationDialog={{
        title: `Delete project "${name}"?`,
        description: description,
      }}
      description={description}
      isPending={deleteMutation.isPending}
      title="Delete Project"
    />
  );
}

function RotateSecretKeyButton(props: {
  rotateSecretKey: () => Promise<RotateSecretKeyAPIReturnType>;
  onSuccess: (data: RotateSecretKeyAPIReturnType) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isModalCloseAllowed, setIsModalCloseAllowed] = useState(true);
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(v) => {
        if (!isModalCloseAllowed) {
          return;
        }
        setIsOpen(v);
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="h-auto gap-2 rounded-lg bg-background px-4 py-3"
          onClick={() => setIsOpen(true)}
        >
          <RefreshCcwIcon className="size-4" />
          Rotate Secret Key
        </Button>
      </DialogTrigger>

      <DialogContent
        className="overflow-hidden p-0"
        dialogCloseClassName={cn(!isModalCloseAllowed && "hidden")}
      >
        <RotateSecretKeyModalContent
          rotateSecretKey={props.rotateSecretKey}
          closeModal={() => {
            setIsOpen(false);
            setIsModalCloseAllowed(true);
          }}
          disableModalClose={() => setIsModalCloseAllowed(false)}
          onSuccess={props.onSuccess}
        />
      </DialogContent>
    </Dialog>
  );
}

type RotateSecretKeyScreen =
  | { id: "initial" }
  | { id: "save-newkey"; secretKey: string };

function RotateSecretKeyModalContent(props: {
  rotateSecretKey: () => Promise<RotateSecretKeyAPIReturnType>;
  closeModal: () => void;
  disableModalClose: () => void;
  onSuccess: (data: RotateSecretKeyAPIReturnType) => void;
}) {
  const [screen, setScreen] = useState<RotateSecretKeyScreen>({
    id: "initial",
  });

  if (screen.id === "save-newkey") {
    return (
      <SaveNewKeyScreen
        secretKey={screen.secretKey}
        closeModal={props.closeModal}
      />
    );
  }

  if (screen.id === "initial") {
    return (
      <RotateSecretKeyInitialScreen
        rotateSecretKey={props.rotateSecretKey}
        onSuccess={(data) => {
          props.disableModalClose();
          props.onSuccess(data);
          setScreen({ id: "save-newkey", secretKey: data.data.secret });
        }}
        closeModal={props.closeModal}
      />
    );
  }

  return null;
}

function RotateSecretKeyInitialScreen(props: {
  rotateSecretKey: () => Promise<RotateSecretKeyAPIReturnType>;
  onSuccess: (data: RotateSecretKeyAPIReturnType) => void;
  closeModal: () => void;
}) {
  const [isConfirmed, setIsConfirmed] = useState(false);
  const rotateKeyMutation = useMutation({
    mutationFn: props.rotateSecretKey,
    onSuccess: (data) => {
      props.onSuccess(data);
    },
    onError: (err) => {
      console.error(err);
      toast.error("Failed to rotate secret key");
    },
  });
  return (
    <div>
      <div className="flex flex-col p-6">
        <DialogHeader>
          <DialogTitle>Rotate Secret Key</DialogTitle>
        </DialogHeader>

        <div className="h-6" />

        <Alert variant="destructive">
          <CircleAlertIcon className="size-5" />
          <AlertTitle>Current secret key will stop working</AlertTitle>
          <AlertDescription>
            Rotating the secret key will invalidate the current secret key and
            generate a new one. This action is irreversible.
          </AlertDescription>
        </Alert>

        <div className="h-4" />

        <CheckboxWithLabel className="text-foreground">
          <Checkbox
            checked={isConfirmed}
            onCheckedChange={(v) => setIsConfirmed(!!v)}
          />
          I understand the consequences of rotating the secret key
        </CheckboxWithLabel>
      </div>

      <div className="flex justify-end gap-3 border-t bg-card p-6">
        <Button variant="outline" onClick={props.closeModal}>
          Close
        </Button>
        <Button
          variant="destructive"
          className="gap-2"
          disabled={!isConfirmed || rotateKeyMutation.isPending}
          onClick={() => {
            rotateKeyMutation.mutate();
          }}
        >
          {rotateKeyMutation.isPending ? (
            <Spinner className="size-4" />
          ) : (
            <RefreshCcwIcon className="size-4" />
          )}
          Rotate Secret Key
        </Button>
      </div>
    </div>
  );
}

function SaveNewKeyScreen(props: {
  secretKey: string;
  closeModal: () => void;
}) {
  const [isSecretStored, setIsSecretStored] = useState(false);
  return (
    <div className="flex min-w-0 flex-col">
      <div className="flex flex-col p-6">
        <DialogHeader>
          <DialogTitle>Save New Secret Key</DialogTitle>
        </DialogHeader>

        <div className="h-6" />

        <CopyTextButton
          textToCopy={props.secretKey}
          className="!h-auto w-full justify-between bg-card px-3 py-3 font-mono"
          textToShow={props.secretKey}
          copyIconPosition="right"
          tooltip="Copy Secret Key"
        />
        <div className="h-4" />

        <Alert variant="destructive">
          <AlertTitle>Do not share or expose your secret key</AlertTitle>
          <AlertDescription>
            <div className="mb-5">
              Secret keys cannot be recovered. If you lose your secret key, you
              will need to rotate the secret key or create a new Project.
            </div>
            <CheckboxWithLabel className="text-foreground">
              <Checkbox
                checked={isSecretStored}
                onCheckedChange={(v) => {
                  setIsSecretStored(!!v);
                }}
              />
              I confirm that I've securely stored my secret key
            </CheckboxWithLabel>
          </AlertDescription>
        </Alert>
      </div>

      <div className="flex justify-end gap-3 border-t bg-card p-6">
        <Button
          variant="outline"
          className="gap-2"
          disabled={!isSecretStored}
          onClick={props.closeModal}
        >
          Close
        </Button>
      </div>
    </div>
  );
}
