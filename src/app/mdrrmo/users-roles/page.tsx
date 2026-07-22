import UsersPage from "@/app/users/page";
import { requireDashboardAdministrator } from "@/lib/serverAuth";

export default async function MdrrmoUsersPage() {
  await requireDashboardAdministrator("mdrrmo");
  return <UsersPage />;
}
