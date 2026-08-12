import { ListDetailView } from "@/components/ListDetailView";

export default async function ListPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ListDetailView id={id} />;
}
