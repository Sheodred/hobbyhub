import { useQuery } from "@tanstack/react-query";

import { NewsListPanel } from "./NewsListPanel";
import { getWotcNews } from "./newsApi";

export function WotcNewsPanel() {
  const { data, isLoading, isError } = useQuery({ queryKey: ["news", "wotc"], queryFn: getWotcNews });

  return <NewsListPanel title="Magic: The Gathering news" items={data} isLoading={isLoading} isError={isError} />;
}
