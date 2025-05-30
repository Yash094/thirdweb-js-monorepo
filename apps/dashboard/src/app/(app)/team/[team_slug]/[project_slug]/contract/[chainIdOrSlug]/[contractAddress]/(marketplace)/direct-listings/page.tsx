import { notFound } from "next/navigation";
import { SharedDirectListingsPage } from "../../../../../../../../(dashboard)/(chain)/[chain_id]/[contractAddress]/(marketplace)/direct-listings/shared-direct-listings-page";
import { getProject } from "../../../../../../../../../../@/api/projects";
import type { ProjectContractPageParams } from "../../types";

export default async function Page(props: {
  params: Promise<ProjectContractPageParams>;
}) {
  const params = await props.params;
  const project = await getProject(params.team_slug, params.project_slug);

  if (!project) {
    notFound();
  }

  return (
    <SharedDirectListingsPage
      contractAddress={params.contractAddress}
      chainIdOrSlug={params.chainIdOrSlug}
      projectMeta={{
        teamId: project.teamId,
        projectSlug: params.project_slug,
        teamSlug: params.team_slug,
      }}
      isLoggedIn={true}
    />
  );
}
