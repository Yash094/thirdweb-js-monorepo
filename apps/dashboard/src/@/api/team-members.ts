import "server-only";
import { COOKIE_ACTIVE_ACCOUNT, COOKIE_PREFIX_TOKEN } from "@/constants/cookie";
import { cookies } from "next/headers";

const THIRDWEB_API_HOST =
  process.env.NEXT_PUBLIC_THIRDWEB_API_HOST || "https://api.thirdweb.com";

const TeamAccountRole = {
  OWNER: "OWNER",
  MEMBER: "MEMBER",
} as const;

export type TeamAccountRole =
  (typeof TeamAccountRole)[keyof typeof TeamAccountRole];

export type TeamMember = {
  account: {
    name: string;
    email: string | null;
  };
} & {
  deletedAt: Date | null;
  accountId: string;
  teamId: string;
  createdAt: Date;
  updatedAt: Date;
  role: TeamAccountRole;
};

export async function getMembers(teamSlug: string) {
  const cookiesManager = cookies();
  const activeAccount = cookiesManager.get(COOKIE_ACTIVE_ACCOUNT)?.value;
  const token = activeAccount
    ? cookiesManager.get(COOKIE_PREFIX_TOKEN + activeAccount)?.value
    : null;

  if (!token) {
    return [];
  }

  const teamsRes = await fetch(
    `${THIRDWEB_API_HOST}/v1/teams/${teamSlug}/members`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );
  if (teamsRes.ok) {
    return (await teamsRes.json())?.result as TeamMember[];
  }
  return [];
}