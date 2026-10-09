import { redirect } from "next/navigation";

export default async function BusinessIndex({ params }: PageProps<"/[slug]">) {
  const { slug } = await params;
  redirect(`/${slug}/takvim`);
}
