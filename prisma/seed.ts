import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const clientStatuses = ["new_lead", "follow_up", "onboarded", "lost", "target"];
const taskStatuses = ["pending", "in_process", "achieved", "unsuccessful"];

async function main() {
  await prisma.clientLog.deleteMany();
  await prisma.salesmanKpiLog.deleteMany();
  await prisma.task.deleteMany();
  await prisma.client.deleteMany();
  await prisma.managerSalesman.deleteMany();
  await prisma.managerOrg.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.role.deleteMany();

  await prisma.role.createMany({
    data: [
      { id: 1, name: "Admin" },
      { id: 2, name: "Manager" },
      { id: 3, name: "Salesman" },
    ],
  });

  const [orgA, orgB] = await Promise.all([
    prisma.organization.create({ data: { name: "Company A" } }),
    prisma.organization.create({ data: { name: "Company B" } }),
  ]);

  const password = await bcrypt.hash("password123", 10);
  const owner = await prisma.user.create({
    data: { name: "SalesPal Owner", role_id: 1, email: "owner@salespal.test", password, phone: "+97450000001" },
  });
  const managerA = await prisma.user.create({
    data: { name: "Amina Manager", role_id: 2, email: "manager.a@salespal.test", password, phone: "+97450000002" },
  });
  const managerB = await prisma.user.create({
    data: { name: "Bilal Manager", role_id: 2, email: "manager.b@salespal.test", password, phone: "+97450000003" },
  });

  await prisma.managerOrg.createMany({
    data: [
      { manager_id: managerA.id, org_id: orgA.id },
      { manager_id: managerB.id, org_id: orgB.id },
    ],
  });

  const salesmen = await Promise.all(
    ["Nora", "Omar", "Riya", "Samir"].map((name, index) =>
      prisma.user.create({
        data: {
          name: `${name} Sales`,
          role_id: 3,
          email: `${name.toLowerCase()}@salespal.test`,
          password,
          phone: `+9745000000${index + 4}`,
        },
      }),
    ),
  );

  await prisma.managerSalesman.createMany({
    data: [
      { manager_id: managerA.id, salesman_id: salesmen[0].id },
      { manager_id: managerA.id, salesman_id: salesmen[1].id },
      { manager_id: managerB.id, salesman_id: salesmen[2].id },
      { manager_id: managerB.id, salesman_id: salesmen[3].id },
    ],
  });

  const clients = [];
  for (let i = 0; i < 20; i += 1) {
    const org = i < 10 ? orgA : orgB;
    const salesman = i < 10 ? salesmen[i % 2] : salesmen[2 + (i % 2)];
    clients.push(
      await prisma.client.create({
        data: {
          name: `Client ${String(i + 1).padStart(2, "0")}`,
          contact_person_name: `Contact ${i + 1}`,
          contact_no: `+97444${String(i + 1).padStart(6, "0")}`,
          location_coordinates: `25.${2800 + i},51.${5200 + i}`,
          mail_id: `client${i + 1}@example.com`,
          contact_person_designation: i % 3 === 0 ? "Operations Lead" : "Procurement Manager",
          assigned_salesman_id: salesman.id,
          org_id: org.id,
          notes: i % 4 === 0 ? "High value logistics opportunity." : "Regular follow-up required.",
          status: clientStatuses[i % clientStatuses.length],
          created_at: new Date(Date.now() - (i * 2 + 1) * 24 * 60 * 60 * 1000),
        },
      }),
    );
  }

  await prisma.clientLog.createMany({
    data: clients.slice(0, 15).map((client, index) => ({
      client_id: client.id,
      action: `Logged ${clientStatuses[index % clientStatuses.length]} update`,
      done_by: index % 2 === 0 ? owner.id : client.assigned_salesman_id,
    })),
  });

  await prisma.task.createMany({
    data: Array.from({ length: 10 }, (_, index) => ({
      assigned_to_id: salesmen[index % salesmen.length].id,
      created_by_id: index < 5 ? managerA.id : managerB.id,
      description: `Follow up with logistics prospect ${index + 1}`,
      due_date: new Date(Date.now() + (index - 2) * 24 * 60 * 60 * 1000),
      notification: index % 2 === 0,
      status: taskStatuses[index % taskStatuses.length],
    })),
  });

  await prisma.salesmanKpiLog.createMany({
    data: clients.map((client) => ({ salesman_id: client.assigned_salesman_id, action: client.status })),
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
