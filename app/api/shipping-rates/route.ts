import { NextResponse, type NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { isRole } from "@/lib/scoping";
import { orderModes } from "@/types/order";
import { containerTypes } from "@/types/shipping-rate";

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rates = await prisma.shippingRate.findMany({
    include: { updatedBy: { select: { name: true } } },
    orderBy: [{ location: "asc" }, { port: "asc" }],
  });
  return NextResponse.json({ rates: rates.map((rate) => ({ ...rate, price: rate.price.toNumber() })) });
}

export async function POST(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isRole(token, 4)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const location = String(body.location || "").trim();
  const port = String(body.port || "").trim();
  if (!location || !port) return NextResponse.json({ error: "Location and port are required" }, { status: 400 });
  if (!orderModes.includes(body.mode)) return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  if (!containerTypes.includes(body.container)) return NextResponse.json({ error: "Invalid container type" }, { status: 400 });
  const price = Number(body.price);
  if (!Number.isFinite(price) || price < 0) return NextResponse.json({ error: "Invalid price" }, { status: 400 });

  const duplicate = await prisma.shippingRate.findFirst({
    where: { location, port, mode: body.mode, container: body.container },
  });
  if (duplicate) {
    return NextResponse.json({ error: "A rate for this location, port, mode and container already exists — edit it instead" }, { status: 409 });
  }

  const carrier = body.carrier !== undefined ? (body.carrier ? String(body.carrier).trim() : null) : null;
  const currency = body.currency === "QAR" ? "QAR" : "USD";

  const rate = await prisma.shippingRate.create({
    data: {
      location,
      port,
      carrier,
      currency,
      mode: body.mode,
      container: body.container,
      price,
      updated_by_id: Number(token.id),
    } as any,
  });

  revalidateTag("shipping-rates", { expire: 0 });
  return NextResponse.json({ rate: { ...rate, price: rate.price.toNumber() } }, { status: 201 });
}
