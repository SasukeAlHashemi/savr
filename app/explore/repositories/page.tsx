import { RepositorySearchPage } from "@/components/repository-search-page";

type RepositorySearchRouteProps = {
  searchParams: Promise<{
    q?: string;
  }>;
};

export default async function RepositorySearchRoute({
  searchParams,
}: RepositorySearchRouteProps) {
  const { q = "" } = await searchParams;

  return <RepositorySearchPage initialQuery={q} />;
}
