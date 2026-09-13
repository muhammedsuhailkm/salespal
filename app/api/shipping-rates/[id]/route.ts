import { NextResponse, type NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { isRole } from "@/lib/scoping";
import { orderModes } from "@/types/order";
import { containerTypes } from "@/types/shipping-rate";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isRole(token, 4)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await context.params;
  const existing = await prisma.shippingRate.findUnique({ where: { id: Number(id) } });
  if (!existing) return NextResponse.json({ error: "Rate not found" }, { status: 404 });

  const body = await request.json();
  const location = body.location !== undefined ? String(body.location).trim() : existing.location;
  const port = body.port !== undefined ? String(body.port).trim() : existing.port;
  if (!location || !port) return NextResponse.json({ error: "Location and port are required" }, { status: 400 });
  const mode = body.mode ?? existing.mode;
  if (!orderModes.includes(mode)) return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  const container = body.container ?? existing.container;
  if (!containerTypes.includes(container)) return NextResponse.json({ error: "Invalid container type" }, { status: 400 });

  let price = existing.price.toNumber();
  if (body.price !== undefined) {
    price = Number(body.price);
    if (!Number.isFinite(price) || price < 0) return NextResponse.json({ error: "Invalid price" }, { status: 400 });
  }

  const duplicate = await prisma.shippingRate.findFirst({
    where: { id: { not: existing.id }, location, port, mode, container },
  });
  if (duplicate) {
    return NextResponse.json({ error: "Another rate already exists for this location, port, mode and container" }, { status: 409 });
  }

  const rate = await prisma.shippingRate.update({
    where: { id: existing.id },
    data: { location, port, mode, container, price, updated_by_id: Number(token.id) },
  });

  revalidateTag("shipping-rates", { expire: 0 });
  return NextResponse.json({ rate: { ...rate, price: rate.price.toNumber() } });
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isRole(token, 4)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await context.params;
  const existing = await prisma.shippingRate.findUnique({ where: { id: Number(id) } });
  if (!existing) return NextResponse.json({ error: "Rate not found" }, { status: 404 });

  await prisma.shippingRate.delete({ where: { id: existing.id } });

  revalidateTag("shipping-rates", { expire: 0 });
  return NextResponse.json({ ok: true });
}
