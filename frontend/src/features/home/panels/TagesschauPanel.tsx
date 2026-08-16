import { useQuery } from "@tanstack/react-query";

import { NewsListPanel } from "./NewsListPanel";
import { getTagesschauNews } from "./newsApi";

export function TagesschauPanel() {
  const { data, isLoading, isError } = useQuery({ queryKey: ["news", "tagesschau"], queryFn: getTagesschauNews });

  return <NewsListPanel title="Tagesschau" items={data} isLoading={isLoading} isError={isError} lang="de" />;
}
