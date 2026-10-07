import type { Prisma } from "@prisma/client";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { ACTIVE_ENQUIRY_STATUSES, enquiryRef } from "@/types/enquiry";

/** An enquiry still open this many days after it was raised (or last followed up) gets a follow-up task. */
export const FOLLOW_UP_AFTER_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;
const OPEN_FOLLOW_UP_TASK = { status: { in: ["pending", "in_process"] } };

function todayUtc() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export function nextFollowUpDate(from = todayUtc()) {
  return new Date(from.getTime() + FOLLOW_UP_AFTER_DAYS * DAY_MS);
}

/** Enquiries still in an active stage whose follow-up date has passed. */
function dueForFollowUp(today: Date): Prisma.EnquiryWhereInput {
  return {
    status: { in: [...ACTIVE_ENQUIRY_STATUSES] },
    OR: [
      { next_follow_up_at: { lte: today } },
      { next_follow_up_at: null, enquiry_date: { lte: new Date(today.getTime() - FOLLOW_UP_AFTER_DAYS * DAY_MS) } },
    ],
  };
}

/**
 * Creates a follow-up task for each of the user's enquiries that has been open for FOLLOW_UP_AFTER_DAYS.
 * Each enquiry is claimed with a conditional update first, so concurrent calls never create duplicates.
 * Returns how many tasks were created.
 */
export async function ensureEnquiryFollowUpTasks(userId: number) {
  const today = todayUtc();
  const due = await prisma.enquiry.findMany({
    where: { created_by_id: userId, ...dueForFollowUp(today) },
    select: { id: true, enquiry_date: true, client: { select: { name: true } } },
  });

  let created = 0;
  for (const enquiry of due) {
    const claimed = await prisma.enquiry.updateMany({
      where: { id: enquiry.id, ...dueForFollowUp(today) },
      data: { next_follow_up_at: nextFollowUpDate(today) },
    });
    if (claimed.count !== 1) continue;

    // Don't pile up tasks when the previous follow-up is still outstanding.
    const outstanding = await prisma.task.count({ where: { enquiry_id: enquiry.id, ...OPEN_FOLLOW_UP_TASK } });
    if (outstanding > 0) continue;

    const days = Math.floor((today.getTime() - enquiry.enquiry_date.getTime()) / DAY_MS);
    await prisma.task.create({
      data: {
        enquiry_id: enquiry.id,
        assigned_to_id: userId,
        created_by_id: userId,
        description: `Follow up on enquiry ${enquiryRef(enquiry.id)} for ${enquiry.client.name} — still active after ${days} days. Add a follow-up comment, move it to the next stage, or mark it lost with a reason.`,
        due_date: today,
        status: "pending",
        notification: true,
      },
    });
    created++;
  }

  if (created > 0) revalidateTaskViews();
  return created;
}

/** Marks the enquiry's outstanding follow-up tasks as done (follow-up logged / converted) or unsuccessful (cancelled). */
export async function closeFollowUpTasks(
  tx: Prisma.TransactionClient,
  enquiryId: number,
  status: "achieved" | "unsuccessful"
) {
  await tx.task.updateMany({ where: { enquiry_id: enquiryId, ...OPEN_FOLLOW_UP_TASK }, data: { status } });
}

export function revalidateTaskViews() {
  revalidateTag("salesman-tasks", { expire: 0 });
  revalidateTag("salesman-dashboard", { expire: 0 });
  revalidateTag("manager-tasks", { expire: 0 });
  revalidateTag("manager-dashboard", { expire: 0 });
}
