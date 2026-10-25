import { AdminUsers } from "@/registry/items/admin-users/admin-users";

export default function AdminUsersDemo() {
  return <AdminUsers currentUserId="u1" orgName="Larkfield Studio" seats={15} />;
}
