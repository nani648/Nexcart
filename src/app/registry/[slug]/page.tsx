import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import type { Metadata } from "next";
import { PublicRegistryClient } from "./PublicRegistryClient";

interface Props { params: { slug: string } }

async function getRegistry(slug: string) {
  try {
    return await db.giftRegistry.findUnique({
      where: { slug },
      include: {
        items: { orderBy: { createdAt: "asc" } },
        user: { select: { name: true } },
      },
    });
  } catch { return null; }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const reg = await getRegistry(params.slug);
  if (!reg) return { title: "Registry Not Found" };
  return { title: `${reg.title} — Gift Registry on NexCart`, description: reg.description || `View and shop ${reg.user.name || "someone"}'s gift registry` };
}

export default async function PublicRegistryPage({ params }: Props) {
  const registry = await getRegistry(params.slug);
  if (!registry) notFound();

  return <PublicRegistryClient registry={{
    ...registry,
    eventDate: registry.eventDate ? registry.eventDate.toISOString() : null,
    createdAt: registry.createdAt.toISOString(),
    updatedAt: registry.updatedAt.toISOString(),
    items: registry.items.map(i => ({ ...i, createdAt: i.createdAt.toISOString() })),
    user: registry.user,
  }} />;
}
