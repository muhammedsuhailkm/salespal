import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { AddAccountantModal } from "./AddAccountantModal";

export default async function UsersPage() {
  const users = await prisma.user.findMany({ include: { role: true }, orderBy: [{ role_id: "asc" }, { name: "asc" }] });
  return (
    <>
      <PageHeader
        title="Users"
        subtitle="All owner, manager, salesman, and accountant accounts."
        action={<AddAccountantModal />}
      />
      <div className="overflow-x-auto rounded-card border border-border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="bg-subtle text-xs text-muted-foreground font-medium">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Phone</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-4 py-3 font-medium">{user.name}</td>
                <td className="px-4 py-3">{user.role.name}</td>
                <td className="px-4 py-3">{user.email}</td>
                <td className="px-4 py-3">{user.phone ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
