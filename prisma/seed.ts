/**
 * SalesPal seed — about a year of realistic activity across the whole schema.
 *
 *   npx prisma db seed                 # full size (~30k clients, 15k enquiries, 12k orders …)
 *   SEED_SIZE=small npx prisma db seed # quick dev seed (~1/20 of the volume)
 *
 * WIPES every table first (TRUNCATE … RESTART IDENTITY). Refuses to run with NODE_ENV=production
 * unless SEED_FORCE=1. Output is deterministic (fixed random seed), so ids and data repeat run to run.
 *
 * Logins (password: password123)
 *   owner@salespal.test        Owner / admin
 *   manager.a@salespal.test    Amina Manager — runs Company A and Company B
 *   manager.b@salespal.test    Bilal Manager — Company B
 *   omar@salespal.test         Salesman under Amina, works for both of her companies
 *   nora@salespal.test         Salesman under Amina, Company A only
 *   accountant@salespal.test   Accountant for Company A and Company B
 *
 * The data follows the app's own rules (lib/enquiry-flow.ts, lib/client-status-flow.ts):
 * confirmed enquiries have an order; a cancelled order makes its enquiry lost; delivered / completed
 * orders carry a job no and invoice date; completed orders are paid in full; paid_total = advance +
 * payments; clients with an order are onboarded; every stage change has an enquiry event.
 */
import { PrismaClient, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { cargoTotals, type CargoPackage, type DimensionUnit } from "../lib/freight";
import {
  ftlTruckTypes,
  gauges,
  incoterms,
  jobRefs,
  seaContainerTypes,
  seaOtherServiceTypes,
  type JobRef,
} from "../types/enquiry";
import { orderPaymentMethods } from "../types/order";
import { commonCarriers } from "../types/shipping-rate";

const prisma = new PrismaClient();

/* ─────────────────────────── size & helpers ─────────────────────────── */

const SMALL = process.env.SEED_SIZE === "small";
const N = {
  clients: SMALL ? 1500 : 30000,
  clientLogs: SMALL ? 15000 : 320000,
  kpiLogs: SMALL ? 1000 : 20000,
  tasks: SMALL ? 2000 : 40000,
  clientTasks: SMALL ? 500 : 10000,
  enquiries: SMALL ? 800 : 15000,
  rates: 300,
};

// Deterministic PRNG (mulberry32) so every run produces the same data.
let state = 0x5a1e5;
function rand() {
  state |= 0;
  state = (state + 0x6d2b79f5) | 0;
  let t = Math.imul(state ^ (state >>> 15), 1 | state);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const int = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));
const pick = <T,>(items: readonly T[]): T => items[Math.floor(rand() * items.length)];
const chance = (p: number) => rand() < p;
/** Pick by weight: [[value, weight], …]. */
function weighted<T>(entries: readonly (readonly [T, number])[]): T {
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = rand() * total;
  for (const [v, w] of entries) if ((r -= w) <= 0) return v;
  return entries[entries.length - 1][0];
}
const round2 = (n: number) => Math.round(n * 100) / 100;

const DAY = 86_400_000;
const NOW = Date.now();
const daysAgo = (d: number) => new Date(NOW - d * DAY);
const dateOnly = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
const between = (from: Date, to: Date) => new Date(from.getTime() + rand() * Math.max(0, to.getTime() - from.getTime()));

async function inChunks<T>(rows: T[], size: number, insert: (chunk: T[]) => Promise<unknown>) {
  for (let i = 0; i < rows.length; i += size) await insert(rows.slice(i, i + size));
}
const log = (msg: string) => console.log(`  ${msg}`);

/* ─────────────────────────── reference data ─────────────────────────── */

const FIRST = ["Ahmed", "Fatima", "Omar", "Aisha", "Yusuf", "Mariam", "Khalid", "Noura", "Hassan", "Layla", "Bilal", "Sara", "Tariq", "Huda", "Imran", "Rania", "Karim", "Divya", "Rami", "Priya", "Samir", "Ola", "Ravi", "Zainab", "Faisal", "Leena", "Arjun", "Nadia"];
const LAST = ["Rao", "Yusuf", "Haddad", "Nair", "Al-Thani", "Khan", "Mansour", "Pillai", "Saleh", "Thomas", "Hussain", "Fernandes", "Qureshi", "Menon", "Abbas"];
const CLIENT_PREFIX = ["Al Noor", "Gulf", "Desert", "Oasis", "Pearl", "Falcon", "Dune", "Corniche", "Lusail", "Doha", "Arabian", "Crescent", "Al Waha", "Marina", "Sidra"];
const CLIENT_SECTOR = ["Trading", "Electronics", "Plastics", "Textiles", "Foods", "Building Materials", "Auto Parts", "Pharma", "Logistics", "Steel", "Furniture", "Chemicals"];
const DESIGNATIONS = ["Procurement Manager", "Operations Lead", "Logistics Coordinator", "General Manager", "Supply Chain Head", "Import Manager"];
const QATAR_AREAS = ["Industrial Area", "Al Wakra", "Mesaieed", "Lusail", "West Bay", "Al Rayyan", "Birkat Al Awamer", "Ras Laffan", "Umm Salal"];

const SEA_ORIGINS = ["Shanghai", "Ningbo", "Busan", "Jebel Ali", "Nhava Sheva", "Mundra", "Port Klang", "Singapore", "Hamburg", "Rotterdam", "Antwerp", "Colombo", "Chittagong", "Karachi"];
const AIR_ORIGINS = ["Dubai (DXB)", "Mumbai (BOM)", "Frankfurt (FRA)", "Hong Kong (HKG)", "Shanghai (PVG)", "London (LHR)", "Istanbul (IST)", "Delhi (DEL)", "Singapore (SIN)"];
const LAND_ORIGINS = ["Riyadh", "Dammam", "Jeddah", "Dubai", "Abu Dhabi", "Kuwait City", "Muscat", "Manama"];
const QATAR_DESTINATIONS = { sea: ["Hamad Port", "Doha"], air: ["Doha (DOH)"], land: ["Doha", "Abu Samra Border", "Mesaieed"] } as const;
const OUTBOUND = { sea: ["Jebel Ali", "Dammam", "Mundra", "Shanghai", "Rotterdam"], air: ["London (LHR)", "Dubai (DXB)", "Mumbai (BOM)"], land: ["Riyadh", "Dammam", "Dubai"] } as const;

const UN_NUMBERS = ["UN1203", "UN1950", "UN1993", "UN3082", "UN1263", "UN2794", "UN3480", "UN1170"];
const LOST_REASONS = ["Price too high compared to competitor", "Client postponed the shipment", "Transit time too long", "Client chose another forwarder", "Cargo not ready", "Budget cut on client side"];
const CANCEL_REASONS = ["Client cancelled the shipment", "Cargo damaged before pickup", "Duplicate booking", "Payment terms not agreed"];
const REVISION_REASONS = ["Client asked to change the delivery address", "Volume increased, needs a new quote", "Carrier rate changed"];
const FOLLOW_UP_COMMENTS = ["Called the client, waiting for their budget approval.", "Sent revised rates by email.", "Client asked for a better transit time.", "Meeting scheduled for next week.", "Client comparing with two other forwarders.", "No answer, will try again tomorrow."];
const TASK_VERBS = ["[Call] Follow up on quotation", "[Visit] Collect KYC documents", "[Meeting] Visit warehouse", "[Call] Confirm shipment schedule", "[Email] Send rate card", "[Call] Check payment status"];

// Mode → job ref codes (first letter: A air, S sea, R/L road).
const JOB_REFS_BY_MODE: Record<string, JobRef[]> = {
  air: jobRefs.filter((c) => c.startsWith("A")),
  sea: jobRefs.filter((c) => c.startsWith("S")),
  land: jobRefs.filter((c) => c.startsWith("R") || c.startsWith("L")),
};

/* ─────────────────────────── main ─────────────────────────── */

async function wipe() {
  const tables = [
    "enquiry_events", "enquiry_follow_ups", "order_payments", "orders", "tasks", "enquiries", "client_tasks",
    "client_documents", "client_logs", "salesman_kpi_logs", "salesman_targets", "shipping_rates", "clients",
    "company_documents", "manager_salesman", "manager_org", "accountant_org", "users", "organizations", "roles",
  ];
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables.map((t) => `"${t}"`).join(", ")} RESTART IDENTITY CASCADE`);
}

async function main() {
  if (process.env.NODE_ENV === "production" && process.env.SEED_FORCE !== "1") {
    throw new Error("Refusing to seed (and wipe) a production database. Set SEED_FORCE=1 if you really mean it.");
  }
  const started = Date.now();
  console.log(`Seeding SalesPal (${SMALL ? "small" : "full"} size)…`);
  await wipe();

  /* Roles, companies, people */
  await prisma.role.createMany({
    data: [
      { id: 1, name: "Admin" },
      { id: 2, name: "Manager" },
      { id: 3, name: "Salesman" },
      { id: 4, name: "Accountant" },
    ],
  });

  const orgs = await prisma.organization.createManyAndReturn({
    data: ["A", "B", "C", "D"].map((l, i) => ({
      name: `Company ${l}`,
      address: `Building ${12 + i * 7}, Street ${300 + i * 11}, ${QATAR_AREAS[i]}, Doha, Qatar`,
      phone: `+974 4400 ${String(1100 + i).padStart(4, "0")}`,
      email: `info@company-${l.toLowerCase()}.qa`,
    })),
  });
  const [orgA, orgB, orgC, orgD] = orgs;

  const password = await bcrypt.hash("password123", 10);
  const owner = await prisma.user.create({ data: { name: "SalesPal Owner", role_id: 1, email: "owner@salespal.test", password, phone: "+97450000001" } });

  const managerSpecs = [
    { name: "Amina Manager", email: "manager.a@salespal.test", orgs: [orgA, orgB] },
    { name: "Bilal Manager", email: "manager.b@salespal.test", orgs: [orgB] },
    { name: "Manager 3", email: "manager3@salespal.test", orgs: [orgA] },
    { name: "Manager 4", email: "manager4@salespal.test", orgs: [orgC] },
    { name: "Manager 5", email: "manager5@salespal.test", orgs: [orgC] },
    { name: "Manager 6", email: "manager6@salespal.test", orgs: [orgD] },
    { name: "Manager 7", email: "manager7@salespal.test", orgs: [orgD] },
    { name: "Manager 8", email: "manager8@salespal.test", orgs: [orgD] },
  ];
  const managers = await prisma.user.createManyAndReturn({
    data: managerSpecs.map((m, i) => ({ name: m.name, role_id: 2, email: m.email, password, phone: `+9745100${String(i + 1).padStart(4, "0")}` })),
  });
  await prisma.managerOrg.createMany({ data: managerSpecs.flatMap((m, i) => m.orgs.map((o) => ({ manager_id: managers[i].id, org_id: o.id }))) });

  const named = ["Nora", "Omar", "Samir", "Riya"];
  const salesmen = await prisma.user.createManyAndReturn({
    data: Array.from({ length: 60 }, (_, i) => {
      const name = i < 4 ? `${named[i]} Sales` : `${FIRST[i % FIRST.length]} ${LAST[i % LAST.length]} ${i + 1}`;
      const email = i < 4 ? `${named[i].toLowerCase()}@salespal.test` : `salesman${i + 1}@salespal.test`;
      return { name, role_id: 3, email, password, phone: `+9745200${String(i + 1).padStart(4, "0")}` };
    }),
  });

  // Team links (one row per company). Amina: 8 salesmen — Omar + 3 others on both companies, Nora + 3 on one.
  type Link = { manager_id: number; salesman_id: number; org_id: number };
  const links: Link[] = [];
  const amina = managers[0];
  salesmen.slice(0, 8).forEach((s, i) => {
    const both = i === 1 || i >= 5; // Omar (index 1) and the last three work for A and B
    if (both) links.push({ manager_id: amina.id, salesman_id: s.id, org_id: orgA.id }, { manager_id: amina.id, salesman_id: s.id, org_id: orgB.id });
    else links.push({ manager_id: amina.id, salesman_id: s.id, org_id: i % 2 === 0 ? orgA.id : orgB.id });
  });
  salesmen.slice(8).forEach((s, i) => {
    const m = 1 + (i % 7); // managers 2..8
    links.push({ manager_id: managers[m].id, salesman_id: s.id, org_id: managerSpecs[m].orgs[0].id });
  });
  await prisma.managerSalesman.createMany({ data: links });

  const accountants = await prisma.user.createManyAndReturn({
    data: [
      { name: "SalesPal Accountant", email: "accountant@salespal.test" },
      { name: "Accountant 2", email: "accountant2@salespal.test" },
      { name: "Accountant 3", email: "accountant3@salespal.test" },
    ].map((a, i) => ({ ...a, role_id: 4, password, phone: `+9745300${String(i + 1).padStart(4, "0")}` })),
  });
  await prisma.accountantOrg.createMany({
    data: [
      { accountant_id: accountants[0].id, org_id: orgA.id },
      { accountant_id: accountants[0].id, org_id: orgB.id },
      { accountant_id: accountants[1].id, org_id: orgC.id },
      { accountant_id: accountants[2].id, org_id: orgD.id },
    ],
  });
  const accountantFor = (orgId: number) => (orgId === orgC.id ? accountants[1] : orgId === orgD.id ? accountants[2] : accountants[0]);
  const managerOf = new Map(links.map((l) => [`${l.salesman_id}:${l.org_id}`, l.manager_id]));
  log(`users: 1 owner, ${managers.length} managers, ${salesmen.length} salesmen, ${accountants.length} accountants · ${links.length} team links`);

  /* Clients — status settles after enquiries / orders, as the app would move it */
  const clientRows = Array.from({ length: N.clients }, (_, i) => {
    const link = links[i % links.length];
    const n = i + 1;
    const createdAt = daysAgo(rand() * 365);
    return {
      name: `${pick(CLIENT_PREFIX)} ${pick(CLIENT_SECTOR)} ${n}`,
      contact_person_name: `${pick(FIRST)} ${pick(LAST)}`,
      contact_no: `+9744${String(n).padStart(7, "0")}`,
      location_coordinates: chance(0.6) ? `${(25.2 + rand() * 0.6).toFixed(4)},${(51.3 + rand() * 0.3).toFixed(4)}` : null,
      mail_id: chance(0.85) ? `contact${n}@example.com` : null,
      cr_no: chance(0.8) ? `CR-${String(n).padStart(8, "0")}` : null,
      cr_expiry_date: chance(0.8) ? dateOnly(daysAgo(-int(-200, 900))) : null,
      contact_person_designation: chance(0.9) ? pick(DESIGNATIONS) : null,
      assigned_salesman_id: link.salesman_id,
      org_id: link.org_id,
      notes: chance(0.1) ? pick(["High value logistics opportunity.", "Prefers WhatsApp contact.", "Seasonal shipments in Q4.", "Asked for monthly rate card."]) : null,
      status: weighted([["lead", 13], ["contacted", 12], ["follow_up", 36], ["dormant", 18], ["lost", 21]] as const) as string,
      created_at: createdAt,
    };
  });
  const clients: { id: number; assigned_salesman_id: number; org_id: number; created_at: Date; status: string; name: string }[] = [];
  await inChunks(clientRows, 5000, async (chunk) => {
    clients.push(...(await prisma.client.createManyAndReturn({ data: chunk, select: { id: true, assigned_salesman_id: true, org_id: true, created_at: true, status: true, name: true } })));
  });
  log(`clients: ${clients.length}`);

  /* Shipping rates: every origin × destination × container lane, shuffled, first N.rates kept */
  const lanes: { mode: "sea" | "air" | "land"; location: string; port: string; container: "20gp" | "40hc" }[] = [
    ...[...SEA_ORIGINS, "Jeddah", "Salalah", "Mombasa", "Laem Chabang"].flatMap((location) =>
      ["Hamad Port 1", "Hamad Port 2", "Hamad Port 3", "Mesaieed Port", "Ras Laffan Port", "Doha Port"].map((port) => ({ mode: "sea" as const, location, port })),
    ),
    ...AIR_ORIGINS.flatMap((location) => ["Hamad Intl Airport", "Doha Cargo Terminal"].map((port) => ({ mode: "air" as const, location, port }))),
    ...LAND_ORIGINS.flatMap((location) => ["Abu Samra Border 1", "Abu Samra Border 2", "Doha Truck Terminal"].map((port) => ({ mode: "land" as const, location, port }))),
  ].flatMap((l) => (["20gp", "40hc"] as const).map((container) => ({ ...l, container })));
  for (let i = lanes.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [lanes[i], lanes[j]] = [lanes[j], lanes[i]];
  }
  const rateRows: Prisma.ShippingRateCreateManyInput[] = lanes.slice(0, N.rates).map(({ mode, location, port, container }) => {
    const base = mode === "sea" ? int(450, 2600) : mode === "air" ? int(1800, 7500) : int(900, 3200);
    return {
      location, port, mode, container,
      carrier: mode === "sea" ? pick(commonCarriers) : mode === "air" ? pick(["Qatar Airways Cargo", "Emirates SkyCargo", "Lufthansa Cargo"]) : pick(["GulfLand Trucking", "Desert Haulage", "Al Waha Transport"]),
      price: container === "40hc" ? Math.round(base * 1.6) : base,
      currency: chance(0.6) ? "QAR" : "USD",
      updated_by_id: pick(accountants).id,
      created_at: daysAgo(int(5, 200)),
      updated_at: daysAgo(int(0, 60)),
    };
  });
  await prisma.shippingRate.createMany({ data: rateRows });
  log(`shipping rates: ${rateRows.length}`);

  /* Enquiries, events, follow-ups, orders, payments */
  // Repeat business: enquiries come from a pool of ~40% of clients.
  const enquiryPool = clients.map((c, i) => ({ c, i })).filter(({ i }) => i % 5 < 2);
  type Plan = {
    clientIdx: number;
    status: "inquiry_received" | "quoted" | "negotiation" | "offer_revised" | "confirmed" | "lost";
    order: null | "transit" | "delivered" | "completed" | "cancelled" | "revision_requested";
    revised: boolean;
  };
  const plans: Plan[] = [];
  const enquiryRows: Prisma.EnquiryCreateManyInput[] = [];
  for (let i = 0; i < N.enquiries; i++) {
    const { c: client, i: clientIdx } = pick(enquiryPool);
    const salesmanId = client.assigned_salesman_id;
    const enquiryDate = between(client.created_at, new Date(NOW));
    const age = (NOW - enquiryDate.getTime()) / DAY;
    const mode = weighted([["sea", 5], ["air", 3], ["land", 3]] as const);
    const inbound = chance(0.75);
    const from = inbound ? (mode === "sea" ? pick(SEA_ORIGINS) : mode === "air" ? pick(AIR_ORIGINS) : pick(LAND_ORIGINS)) : pick(QATAR_DESTINATIONS[mode]);
    const to = inbound ? pick(QATAR_DESTINATIONS[mode]) : pick(OUTBOUND[mode]);

    // Lifecycle: older enquiries are mostly decided, recent ones still open.
    const decided = age > 21 ? 0.92 : age > 7 ? 0.55 : 0.2;
    let status: Plan["status"];
    let order: Plan["order"] = null;
    if (chance(decided)) {
      if (chance(0.82)) {
        order = weighted([["completed", age > 45 ? 55 : 15], ["transit", age > 45 ? 10 : 45], ["delivered", 10], ["cancelled", 9], ["revision_requested", 1]] as const);
        status = order === "cancelled" ? "lost" : order === "revision_requested" ? "negotiation" : "confirmed";
      } else status = "lost";
    } else status = weighted([["inquiry_received", 18], ["quoted", 50], ["negotiation", 20], ["offer_revised", 12]] as const);
    const revised = status === "offer_revised" || (status !== "inquiry_received" && chance(0.15));

    // Cargo
    const unit: DimensionUnit = weighted([["cm", 5], ["m", 3], ["in", 1], ["ft", 1]] as const);
    const scale = { cm: 1, m: 0.01, in: 1 / 2.54, ft: 1 / 30.48 }[unit];
    const hasDims = chance(0.85);
    const packages: CargoPackage[] = hasDims
      ? Array.from({ length: weighted([[1, 6], [2, 3], [3, 1]] as const) }, () => ({
          length: round2(int(40, 240) * scale),
          width: round2(int(30, 160) * scale),
          height: round2(int(30, 200) * scale),
          qty: int(1, mode === "air" ? 12 : 40),
        }))
      : [];
    const actualWeight = chance(0.9) ? int(80, mode === "air" ? 3000 : 22000) : null;
    const totals = cargoTotals(packages, unit, mode, actualWeight);

    const serviceType = mode === "sea" ? weighted([...seaContainerTypes.map((t) => [t, t === "20dc" || t === "40dc" || t === "40hc" ? 6 : 1] as const), ...seaOtherServiceTypes.map((t) => [t, t === "lcl" ? 6 : 1] as const)]) : null;
    const isDg = chance(0.05);
    const quoted = status !== "inquiry_received";
    const cost = quoted ? int(400, mode === "air" ? 9000 : 15000) : null;
    const profit = cost !== null ? Math.round(cost * (0.08 + rand() * 0.25)) : null;
    const lostDirect = status === "lost" && order === null;

    plans.push({ clientIdx, status, order, revised });
    enquiryRows.push({
      client_id: client.id,
      enquiry_date: dateOnly(enquiryDate),
      mode, from, to,
      collection_address: inbound ? null : chance(0.7) ? `Warehouse ${int(1, 80)}, Street ${int(1, 60)}, ${pick(QATAR_AREAS)}, Qatar` : null,
      job_ref: pick(JOB_REFS_BY_MODE[mode]),
      incoterm: pick(incoterms),
      payment_mode: weighted([["cash", 3], ["card", 2], ["credit", 4]] as const),
      credit_days: null as number | null,
      clearance: chance(0.55),
      is_dg: isDg,
      un_number: isDg ? (chance(0.8) ? pick(UN_NUMBERS) : `${pick(UN_NUMBERS)}, ${pick(UN_NUMBERS)}`) : null,
      packages: packages.length ? packages : Prisma.DbNull,
      dimension_unit: unit,
      actual_weight: actualWeight,
      stackable: hasDims ? chance(0.8) : null,
      chargeable_weight: totals.chargeableWeight,
      cbm: totals.cbm,
      service_type: serviceType,
      reefer_temp: serviceType === "20rf" || serviceType === "40rf" ? pick([-25, -18, -5, 2, 4, 8]) : null,
      gauge: serviceType === "20ot" || serviceType === "40ot" ? pick(gauges) : null,
      truck_type: mode === "land" ? (chance(0.3) ? "ltl" : pick(ftlTruckTypes)) : null,
      provisional_cost: cost,
      provisional_profit: profit,
      notes: chance(0.15) ? pick(["Cargo ready next week.", "Client needs door delivery.", "Fragile items, handle with care.", "Commodity: electronics."]) : null,
      status,
      cancel_reason: lostDirect ? pick(LOST_REASONS) : null,
      cancelled_at: lostDirect ? between(enquiryDate, new Date(Math.min(NOW, enquiryDate.getTime() + 30 * DAY))) : null,
      cancelled_by_id: lostDirect ? salesmanId : null,
      created_by_id: salesmanId,
      created_at: enquiryDate,
    });
    if (enquiryRows[i].payment_mode === "credit") enquiryRows[i].credit_days = pick([15, 30, 45, 60, 90]);
  }
  const enquiries: { id: number; client_id: number; created_by_id: number; enquiry_date: Date; created_at: Date; provisional_cost: Prisma.Decimal | null; provisional_profit: Prisma.Decimal | null; payment_mode: string; mode: string; from: string; to: string; incoterm: string | null; job_ref: string | null; clearance: boolean; status: string }[] = [];
  await inChunks(enquiryRows, 2500, async (chunk) => {
    enquiries.push(...(await prisma.enquiry.createManyAndReturn({ data: chunk })));
  });
  log(`enquiries: ${enquiries.length}`);

  // Orders for every enquiry that was confirmed at some point.
  const orderRows: Prisma.OrderCreateManyInput[] = [];
  const orderPlans: { enquiryIdx: number; amount: number; advance: number; status: NonNullable<Plan["order"]>; created: Date; invoice: Date | null; orgId: number }[] = [];
  const actuals = new Map<number, { cost: number; profit: number }>();
  enquiries.forEach((e, idx) => {
    const plan = plans[idx];
    if (!plan.order) return;
    const created = between(e.created_at, new Date(Math.min(NOW, e.created_at.getTime() + 20 * DAY)));
    const cost = e.provisional_cost!.toNumber();
    const profit = e.provisional_profit!.toNumber();
    // Accounts fill actual figures once the job is under way (always for delivered / completed).
    const hasDetails = plan.order === "delivered" || plan.order === "completed" || (plan.order !== "revision_requested" && chance(0.5));
    let amount = cost + profit;
    if (hasDetails) {
      const actualCost = round2(cost * (0.92 + rand() * 0.16));
      const actualProfit = round2(amount - actualCost);
      actuals.set(e.id, { cost: actualCost, profit: actualProfit });
      amount = actualCost + actualProfit;
    }
    const invoice = hasDetails ? dateOnly(between(created, new Date(Math.min(NOW, created.getTime() + 10 * DAY)))) : null;
    const advance = e.payment_mode !== "credit" && chance(0.25) ? round2(amount * pick([0.1, 0.2, 0.3])) : 0;
    const client = clients[plan.clientIdx];
    orderRows.push({
      client_id: e.client_id,
      mode: e.mode,
      description: `${e.incoterm ? `${e.incoterm} · ` : ""}${e.job_ref ? `${e.job_ref} ` : ""}${e.mode} freight ${e.from} → ${e.to}${e.clearance ? " incl. clearance" : ""}`,
      payment_mode: e.payment_mode,
      amount,
      advance_amount: advance,
      from: e.from,
      to: e.to,
      status: plan.order,
      closed_reason: plan.order === "cancelled" ? pick(CANCEL_REASONS) : plan.order === "revision_requested" ? pick(REVISION_REASONS) : null,
      accounts_approval: plan.order === "transit" ? weighted([["approved", 6], ["pending", 3], ["rejected", 1]] as const) : plan.order === "cancelled" ? weighted([["approved", 5], ["pending", 3], ["rejected", 1]] as const) : "approved",
      manager_approval: weighted([["approved", 6], ["pending", 4]] as const),
      created_by_id: e.created_by_id,
      // A revision releases the link; re-confirming would reopen the order via origin_enquiry_id.
      enquiry_id: plan.order === "revision_requested" ? null : e.id,
      origin_enquiry_id: e.id,
      job_no: hasDetails ? `JOB-${String(orderRows.length + 1).padStart(6, "0")}` : null,
      invoice_date: invoice,
      due_date: invoice ? dateOnly(new Date(invoice.getTime() + (e.payment_mode === "credit" ? 30 : 7) * DAY)) : null,
      created_at: created,
    });
    orderPlans.push({ enquiryIdx: idx, amount, advance, status: plan.order, created, invoice, orgId: client.org_id });
  });
  const orders: { id: number }[] = [];
  await inChunks(orderRows, 2500, async (chunk) => {
    orders.push(...(await prisma.order.createManyAndReturn({ data: chunk, select: { id: true } })));
  });

  // Payments: completed → paid in full; delivered / transit → partly; cancelled → whatever came in before.
  const paymentRows: Prisma.OrderPaymentCreateManyInput[] = [];
  const paidTotals: { id: number; paid: number }[] = [];
  orderPlans.forEach((o, i) => {
    const target =
      o.status === "completed" ? o.amount
      : o.status === "delivered" ? round2(o.amount * pick([0, 0.3, 0.5, 0.7]))
      : o.status === "transit" ? round2(o.amount * pick([0, 0, 0.2, 0.4]))
      : o.status === "cancelled" ? round2(o.amount * pick([0, 0, 0.1]))
      : 0;
    let remaining = round2(Math.max(0, target - o.advance));
    const parts = remaining > 0 ? weighted([[1, 6], [2, 3], [3, 1]] as const) : 0;
    let paidOn = o.invoice ?? o.created;
    for (let p = 0; p < parts && remaining > 0.004; p++) {
      const amount = p === parts - 1 ? remaining : round2(remaining * (0.3 + rand() * 0.4));
      remaining = round2(remaining - amount);
      paidOn = between(paidOn, new Date(Math.min(NOW, paidOn.getTime() + 25 * DAY)));
      paymentRows.push({
        order_id: orders[i].id,
        amount,
        paid_on: dateOnly(paidOn),
        method: pick(orderPaymentMethods),
        reference: chance(0.6) ? `TXN-${int(100000, 999999)}` : null,
        recorded_by_id: accountantFor(o.orgId).id,
        created_at: paidOn,
      });
    }
    paidTotals.push({ id: orders[i].id, paid: round2(target > o.advance ? target : o.advance) });
  });
  await inChunks(paymentRows, 5000, (chunk) => prisma.orderPayment.createMany({ data: chunk }));
  // paid_total = advance + payments (what syncOrderPayments keeps up to date).
  await prisma.$executeRawUnsafe(
    `UPDATE orders o SET paid_total = o.advance_amount + COALESCE((SELECT SUM(p.amount) FROM order_payments p WHERE p.order_id = o.id), 0)`,
  );
  void paidTotals;
  log(`orders: ${orders.length} · payments: ${paymentRows.length}`);

  // Actual figures on enquiries whose order has accounts details; lost-via-cancelled-order details.
  const enquiryUpdates: Prisma.PrismaPromise<unknown>[] = [];
  orderPlans.forEach((o, i) => {
    const e = enquiries[o.enquiryIdx];
    const a = actuals.get(e.id);
    const data: Prisma.EnquiryUpdateInput = {};
    if (a) Object.assign(data, { actual_cost: a.cost, actual_profit: a.profit });
    if (o.status === "cancelled") {
      Object.assign(data, { cancel_reason: orderRows[i].closed_reason, cancelled_at: between(o.created, new Date(NOW)), cancelledBy: { connect: { id: accountantFor(o.orgId).id } } });
    }
    if (Object.keys(data).length) enquiryUpdates.push(prisma.enquiry.update({ where: { id: e.id }, data }));
  });
  for (let i = 0; i < enquiryUpdates.length; i += 1000) await prisma.$transaction(enquiryUpdates.slice(i, i + 1000));

  // Stage history for every enquiry.
  const eventRows: Prisma.EnquiryEventCreateManyInput[] = [];
  const orderIdxByEnquiry = new Map(orderPlans.map((o, i) => [o.enquiryIdx, i]));
  enquiries.forEach((e, idx) => {
    const plan = plans[idx];
    const by = e.created_by_id;
    let t = e.created_at.getTime();
    const step = () => (t = Math.min(NOW, t + rand() * 5 * DAY));
    const cost = e.provisional_cost?.toNumber() ?? null;
    const profit = e.provisional_profit?.toNumber() ?? null;
    if (plan.status === "inquiry_received") {
      eventRows.push({ enquiry_id: e.id, action: "inquiry_received", to_status: "inquiry_received", created_by_id: by, created_at: new Date(t) });
      return;
    }
    // Quoted at creation (most) or later.
    const quotedLater = chance(0.3);
    if (quotedLater) {
      eventRows.push({ enquiry_id: e.id, action: "inquiry_received", to_status: "inquiry_received", created_by_id: by, created_at: new Date(t) });
      step();
    }
    const firstCost = plan.revised && cost !== null ? Math.round(cost * 1.08) : cost;
    const firstProfit = plan.revised && profit !== null ? Math.round(profit * 1.15) : profit;
    eventRows.push({ enquiry_id: e.id, action: "quoted", from_status: quotedLater ? "inquiry_received" : null, to_status: "quoted", cost: firstCost, profit: firstProfit, created_by_id: by, created_at: new Date(t) });
    let current = "quoted";
    if (plan.revised || plan.status === "negotiation" || plan.order === "revision_requested" || chance(0.25)) {
      step();
      eventRows.push({ enquiry_id: e.id, action: "negotiation", from_status: current, to_status: "negotiation", created_by_id: by, created_at: new Date(t) });
      current = "negotiation";
    }
    if (plan.revised) {
      step();
      eventRows.push({ enquiry_id: e.id, action: "offer_revised", from_status: current, to_status: "offer_revised", prev_cost: firstCost, prev_profit: firstProfit, cost, profit, created_by_id: by, created_at: new Date(t) });
      current = "offer_revised";
    }
    if (plan.status === "lost" && !plan.order) {
      step();
      eventRows.push({ enquiry_id: e.id, action: "lost", from_status: current, to_status: "lost", note: enquiryRows[idx].cancel_reason as string, created_by_id: by, created_at: new Date(t) });
      return;
    }
    if (!plan.order) return;
    const orderIdx = orderIdxByEnquiry.get(idx)!;
    const orderId = orders[orderIdx].id;
    eventRows.push({ enquiry_id: e.id, action: "confirmed", from_status: current, to_status: "confirmed", cost, profit, order_id: orderId, created_by_id: by, created_at: orderPlans[orderIdx].created });
    if (plan.order === "revision_requested") {
      eventRows.push({ enquiry_id: e.id, action: "revision_requested", from_status: "confirmed", to_status: "negotiation", note: orderRows[orderIdx].closed_reason as string, order_id: orderId, created_by_id: by, created_at: between(orderPlans[orderIdx].created, new Date(NOW)) });
    }
    if (plan.order === "cancelled") {
      eventRows.push({ enquiry_id: e.id, action: "order_cancelled", from_status: "confirmed", to_status: "lost", note: orderRows[orderIdx].closed_reason as string, order_id: orderId, created_by_id: accountantFor(orderPlans[orderIdx].orgId).id, created_at: between(orderPlans[orderIdx].created, new Date(NOW)) });
    }
  });
  await inChunks(eventRows, 10000, (chunk) => prisma.enquiryEvent.createMany({ data: chunk }));
  log(`enquiry events: ${eventRows.length}`);

  // Follow-ups on enquiries still open after 30 days: comments, plus a pending task for some.
  const followUpRows: Prisma.EnquiryFollowUpCreateManyInput[] = [];
  const followUpTasks: Prisma.TaskCreateManyInput[] = [];
  enquiries.forEach((e, idx) => {
    const active = ["inquiry_received", "quoted", "negotiation", "offer_revised"].includes(plans[idx].status);
    const age = (NOW - e.enquiry_date.getTime()) / DAY;
    if (!active || age < 30) return;
    for (let k = 0; k < int(0, 3); k++) {
      followUpRows.push({ enquiry_id: e.id, comment: pick(FOLLOW_UP_COMMENTS), created_by_id: e.created_by_id, created_at: daysAgo(rand() * (age - 25)) });
    }
    if (chance(0.5)) {
      followUpTasks.push({
        enquiry_id: e.id,
        assigned_to_id: e.created_by_id,
        created_by_id: e.created_by_id,
        description: `Follow up on enquiry ENQ-${String(e.id).padStart(5, "0")} for ${clients[plans[idx].clientIdx].name} — still active after ${Math.floor(age)} days. Add a follow-up comment, move it to the next stage, or mark it lost with a reason.`,
        due_date: dateOnly(daysAgo(int(0, 10))),
        status: "pending",
        notification: true,
      });
    }
  });
  await inChunks(followUpRows, 10000, (chunk) => prisma.enquiryFollowUp.createMany({ data: chunk }));
  log(`enquiry follow-ups: ${followUpRows.length} · follow-up tasks: ${followUpTasks.length}`);

  /* Client statuses after enquiries / orders (statusAfterEnquiry / statusAfterOrder) */
  const withOrder = new Set<number>();
  const withEnquiry = new Set<number>();
  enquiries.forEach((e, idx) => {
    withEnquiry.add(e.client_id);
    if (plans[idx].order && plans[idx].order !== "cancelled") withOrder.add(e.client_id);
  });
  const toOnboarded = [...withOrder];
  const toEnquiry = [...withEnquiry].filter((id) => !withOrder.has(id));
  await prisma.client.updateMany({ where: { id: { in: toOnboarded } }, data: { status: "onboarded", checklist_kyc_verified: true, checklist_agreement_signed: true, checklist_rate_card_approved: true } });
  await prisma.client.updateMany({ where: { id: { in: toEnquiry } }, data: { status: "enquiry" } });
  // A couple of blacklisted clients for that state.
  const blacklisted = clients.filter((c) => !withEnquiry.has(c.id)).slice(0, SMALL ? 1 : 3).map((c) => c.id);
  await prisma.client.updateMany({ where: { id: { in: blacklisted } }, data: { status: "blacklisted" } });
  const finalStatus = new Map(clients.map((c) => [c.id, c.status]));
  toOnboarded.forEach((id) => finalStatus.set(id, "onboarded"));
  toEnquiry.forEach((id) => finalStatus.set(id, "enquiry"));
  blacklisted.forEach((id) => finalStatus.set(id, "blacklisted"));
  log(`client statuses settled: ${toOnboarded.length} onboarded, ${toEnquiry.length} enquiry`);

  /* Client logs, KPI logs */
  const logRows: Prisma.ClientLogCreateManyInput[] = [];
  for (let i = 0; i < N.clientLogs; i++) {
    const c = clients[i % clients.length];
    const action = chance(0.55) ? `Status changed to ${chance(0.6) ? finalStatus.get(c.id) : pick(["lead", "contacted", "follow_up"])}` : pick(["Called client", "Logged follow up", "Sent rate card", "Visited client"]);
    logRows.push({ client_id: c.id, action, done_by: c.assigned_salesman_id, created_at: between(c.created_at, new Date(NOW)) });
  }
  await inChunks(logRows, 20000, (chunk) => prisma.clientLog.createMany({ data: chunk }));
  await prisma.salesmanKpiLog.createMany({
    data: Array.from({ length: N.kpiLogs }, (_, i) => ({ salesman_id: salesmen[i % salesmen.length].id, action: weighted([["onboarded", 2], ["lead", 3], ["follow_up", 4], ["enquiry", 2], ["lost", 2]] as const) })),
  });
  log(`client logs: ${logRows.length} · KPI logs: ${N.kpiLogs}`);

  /* Tasks (general, order and payment follow-ups) and client tasks */
  const taskRows: Prisma.TaskCreateManyInput[] = [...followUpTasks];
  for (let i = 0; i < N.tasks; i++) {
    const link = links[i % links.length];
    const due = daysAgo(int(-30, 120));
    const past = due.getTime() < NOW;
    const category = weighted([[null, 8], ["order_follow_up", 1], ["payment_follow_up", 1]] as const);
    taskRows.push({
      assigned_to_id: link.salesman_id,
      created_by_id: category === "payment_follow_up" ? accountantFor(link.org_id).id : chance(0.4) ? link.salesman_id : managerOf.get(`${link.salesman_id}:${link.org_id}`)!,
      description: `${category === "payment_follow_up" ? "Payment reminder: collect balance on invoice" : category === "order_follow_up" ? "[Call] Update client on shipment" : pick(TASK_VERBS)} #${int(1000, 49999)}`,
      due_date: due,
      notification: chance(0.3),
      status: past ? weighted([["achieved", 6], ["unsuccessful", 3], ["pending", 1]] as const) : weighted([["pending", 6], ["in_process", 4]] as const),
      category,
    });
  }
  await inChunks(taskRows, 10000, (chunk) => prisma.task.createMany({ data: chunk }));
  const clientTaskRows: Prisma.ClientTaskCreateManyInput[] = Array.from({ length: N.clientTasks }, (_, i) => {
    const c = clients[(i * 7) % clients.length];
    const due = daysAgo(int(-30, 60));
    return {
      client_id: c.id,
      assigned_to_id: c.assigned_salesman_id,
      created_by_id: c.assigned_salesman_id,
      description: pick(["Send company profile", "Share rate card", "Collect trade licence copy", "Schedule site visit", "Confirm warehouse address"]),
      due_date: due,
      status: due.getTime() < NOW ? weighted([["achieved", 6], ["unsuccessful", 2], ["pending", 2]] as const) : weighted([["pending", 6], ["in_process", 4]] as const),
    };
  });
  await inChunks(clientTaskRows, 10000, (chunk) => prisma.clientTask.createMany({ data: chunk }));
  log(`tasks: ${taskRows.length} · client tasks: ${clientTaskRows.length}`);

  /* Salesman targets: monthly for the last 11 months (closed) + the current month, some quarterly */
  const targetRows: Prisma.SalesmanTargetCreateManyInput[] = [];
  const now = new Date(NOW);
  salesmen.forEach((s, i) => {
    const link = links.find((l) => l.salesman_id === s.id)!;
    const setBy = managerOf.get(`${s.id}:${link.org_id}`)!;
    const quarterly = i % 10 === 1; // a few salesmen (Omar among them) are on quarterly targets
    if (quarterly) {
      for (let q = 3; q >= 0; q--) {
        const qStartMonth = Math.floor(now.getUTCMonth() / 3) * 3 - q * 3;
        const start = new Date(Date.UTC(now.getUTCFullYear(), qStartMonth, 1));
        const end = new Date(Date.UTC(now.getUTCFullYear(), qStartMonth + 3, 0));
        targetRows.push({ salesman_id: s.id, set_by_id: setBy, amount: pick([90000, 120000, 150000]), period_start: start, period_end: end, created_at: start });
      }
      return;
    }
    for (let m = 11; m >= 0; m--) {
      const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - m, 1));
      const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - m + 1, 0));
      targetRows.push({ salesman_id: s.id, set_by_id: setBy, amount: pick([30000, 40000, 50000, 60000]), period_start: start, period_end: end, created_at: start });
    }
  });
  await prisma.salesmanTarget.createMany({ data: targetRows });
  log(`salesman targets: ${targetRows.length}`);

  void owner;
  console.log(`Done in ${((Date.now() - started) / 1000).toFixed(1)}s. Log in with owner@salespal.test / password123.`);
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
