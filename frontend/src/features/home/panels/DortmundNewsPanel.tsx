import { useQuery } from "@tanstack/react-query";

import { NewsListPanel } from "./NewsListPanel";
import { getDortmundNews } from "./newsApi";

export function DortmundNewsPanel() {
  const { data, isLoading, isError } = useQuery({ queryKey: ["news", "dortmund"], queryFn: getDortmundNews });

  return <NewsListPanel title="Dortmund news" items={data} isLoading={isLoading} isError={isError} lang="de" />;
}
