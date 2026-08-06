import type { ReactNode } from "react";

interface QueryStateProps {
  isLoading: boolean;
  isError: boolean;
  isEmpty: boolean;
  loadingFallback: ReactNode;
  errorFallback: ReactNode;
  emptyFallback: ReactNode;
  children: ReactNode;
}

export function QueryState({
  isLoading,
  isError,
  isEmpty,
  loadingFallback,
  errorFallback,
  emptyFallback,
  children,
}: QueryStateProps) {
  if (isLoading) return <>{loadingFallback}</>;
  if (isError) return <>{errorFallback}</>;
  if (isEmpty) return <>{emptyFallback}</>;
  return <>{children}</>;
}
