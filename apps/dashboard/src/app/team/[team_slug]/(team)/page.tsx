import { getWalletConnections } from "@/api/analytics";
import { type Project, getProjects } from "@/api/projects";
import { getTeamBySlug } from "@/api/team";
import { getThirdwebClient } from "@/constants/thirdweb.server";
import { subDays } from "date-fns";
import { redirect } from "next/navigation";
import { getAuthToken } from "../../../api/lib/getAuthToken";
import { loginRedirect } from "../../../login/loginRedirect";
import { InviteTeamMembersButton } from "./_components/invite-team-members-button";
import {
  type ProjectWithAnalytics,
  TeamProjectsPage,
} from "./~/projects/TeamProjectsPage";

export default async function Page(props: {
  params: Promise<{ team_slug: string }>;
}) {
  const params = await props.params;
  const [team, authToken] = await Promise.all([
    getTeamBySlug(params.team_slug),
    getAuthToken(),
  ]);

  if (!authToken) {
    loginRedirect(`/team/${params.team_slug}`);
  }

  if (!team) {
    redirect("/team");
  }

  const projects = await getProjects(params.team_slug);
  const projectsWithTotalWallets = await getProjectsWithAnalytics(projects);

  return (
    <div className="flex grow flex-col">
      <div className="border-border border-b">
        <div className="container flex flex-col items-start gap-3 py-10 md:flex-row md:items-center">
          <div className="flex-1">
            <h1 className="font-semibold text-3xl tracking-tight">
              Team Overview
            </h1>
          </div>
          <InviteTeamMembersButton teamSlug={params.team_slug} />
        </div>
      </div>

      <div className="container flex grow flex-col pt-8 pb-20">
        <TeamProjectsPage
          projects={projectsWithTotalWallets}
          team={team}
          client={getThirdwebClient(authToken)}
        />
      </div>
    </div>
  );
}

async function getProjectsWithAnalytics(
  projects: Project[],
): Promise<Array<ProjectWithAnalytics>> {
  return Promise.all(
    projects.map(async (project) => {
      try {
        const today = new Date();
        const thirtyDaysAgo = subDays(today, 30);

        const data = await getWalletConnections({
          teamId: project.teamId,
          projectId: project.id,
          period: "all",
          from: thirtyDaysAgo,
          to: today,
        });

        let uniqueWalletsConnected = 0;
        for (const d of data) {
          uniqueWalletsConnected += d.uniqueWalletsConnected;
        }

        return {
          ...project,
          monthlyActiveUsers: uniqueWalletsConnected,
        };
      } catch {
        return {
          ...project,
          monthlyActiveUsers: 0,
        };
      }
    }),
  );
}
