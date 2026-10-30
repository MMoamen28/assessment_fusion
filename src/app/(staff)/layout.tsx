import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";

export const instant = false;

export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (user.role === "CUSTOMER") {
    redirect("/my-complaints");
  }

  return <>{children}</>;
}
