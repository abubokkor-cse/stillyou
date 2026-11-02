import { SharedShortlist } from "@/components/shared-shortlist";

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <SharedShortlist token={token} />;
}
