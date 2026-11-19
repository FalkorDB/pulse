import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DashboardApp } from "@/components/DashboardApp";

export default async function Home() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <DashboardApp
      user={{
        name: session.user.name ?? null,
        email: session.user.email ?? "",
        image: session.user.image ?? null,
      }}
    />
  );
}
