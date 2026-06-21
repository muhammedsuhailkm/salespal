import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";

export default async function UsersPage() {
  const users = await prisma.user.findMany({ include: { role: true }, orderBy: [{ role_id: "asc" }, { name: "asc" }] });
  return <><PageHeader title="Users" subtitle="All owner, manager, and salesman accounts." /><div className="overflow-x-auto rounded-lg border border-slate-200 bg-white"><table className="w-full text-left text-sm"><thead className="bg-slate-100 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Phone</th></tr></thead><tbody className="divide-y divide-slate-200">{users.map((user) => <tr key={user.id}><td className="px-4 py-3 font-medium">{user.name}</td><td className="px-4 py-3">{user.role.name}</td><td className="px-4 py-3">{user.email}</td><td className="px-4 py-3">{user.phone ?? "-"}</td></tr>)}</tbody></table></div></>;
}
