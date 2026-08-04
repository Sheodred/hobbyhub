import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";

import { ApiError } from "../../lib/apiClient";
import { getCard, getPrintings } from "./api";

export function MtgCardDetailPage() {
  const { id } = useParams<{ id: string }>();

  const {
    data: card,
    isFetching,
    isError,
    error,
  } = useQuery({
    queryKey: ["mtg-card", id],
    queryFn: () => getCard(id!),
    enabled: Boolean(id),
  });

  const { data: printings } = useQuery({
    queryKey: ["mtg-printings", card?.name],
    queryFn: () => getPrintings(card!.name),
    enabled: Boolean(card),
  });

  if (isFetching) {
    return <p className="text-slate-400">Loading card…</p>;
  }

  if (isError) {
    return (
      <div>
        <p role="alert" className="text-rose-400">
          {error instanceof ApiError && error.status === 404
            ? "Card not found."
            : "Something went wrong loading this card."}
        </p>
        <Link to="/mtg" className="mt-4 inline-block text-sm text-indigo-400 hover:underline">
          &larr; Back to search
        </Link>
      </div>
    );
  }

  if (!card) {
    return null;
  }

  return (
    <div>
      <Link to="/mtg" className="text-sm text-indigo-400 hover:underline">
        &larr; Back to search
      </Link>

      <div className="mt-4 flex flex-col gap-6 sm:flex-row">
        {card.imageUrl && (
          <img src={card.imageUrl} alt={card.name} className="w-full max-w-xs rounded-lg border border-slate-800" />
        )}

        <div>
          <h1 className="text-2xl font-semibold text-slate-100">{card.name}</h1>
          {card.manaCost && <p className="mt-1 text-slate-400">{card.manaCost}</p>}
          {card.typeLine && <p className="mt-3 text-sm font-medium text-slate-300">{card.typeLine}</p>}
          {card.oracleText && <p className="mt-2 whitespace-pre-line text-slate-300">{card.oracleText}</p>}

          <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            {card.setName && (
              <>
                <dt className="text-slate-500">Set</dt>
                <dd className="text-slate-300">{card.setName}</dd>
              </>
            )}
            {card.rarity && (
              <>
                <dt className="text-slate-500">Rarity</dt>
                <dd className="capitalize text-slate-300">{card.rarity}</dd>
              </>
            )}
          </dl>
        </div>
      </div>

      {printings && printings.length > 1 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            All printings ({printings.length})
          </h2>
          <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
            {printings.map((printing) => (
              <Link
                key={printing.id}
                to={`/mtg/${printing.id}`}
                className={`group overflow-hidden rounded-lg border transition-colors ${
                  printing.id === card.id
                    ? "border-indigo-500"
                    : "border-slate-800 hover:border-indigo-500/60"
                }`}
              >
                {printing.imageUrl ? (
                  <img
                    src={printing.imageUrl}
                    alt={`${printing.name} - ${printing.setName}`}
                    className="aspect-[5/7] w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-[5/7] w-full items-center justify-center bg-slate-800 p-1 text-center text-[10px] text-slate-400">
                    {printing.setName}
                  </div>
                )}
                <p className="truncate p-1 text-center text-[11px] text-slate-400 group-hover:text-indigo-400">
                  {printing.setName}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
