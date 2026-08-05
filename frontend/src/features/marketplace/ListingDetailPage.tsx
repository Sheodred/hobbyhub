import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";

import { FadeIn } from "../../components/FadeIn";
import { useAuth } from "../auth/AuthContext";
import { ApiError } from "../../lib/apiClient";
import { deleteListing, getListing } from "./api";
import { categoryLabels } from "./categoryLabels";

export function ListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    data: listing,
    isFetching,
    isError,
    error,
  } = useQuery({
    queryKey: ["listing", id],
    queryFn: () => getListing(id!),
    enabled: Boolean(id),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteListing(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["listings"] });
      navigate("/marketplace");
    },
  });

  if (isFetching) {
    return <p className="text-slate-400">Loading listing…</p>;
  }

  if (isError) {
    return (
      <div>
        <p role="alert" className="text-rose-400">
          {error instanceof ApiError && error.status === 404 ? "Listing not found." : "Something went wrong."}
        </p>
        <Link to="/marketplace" className="mt-4 inline-block text-sm text-indigo-400 hover:underline">
          &larr; Back to marketplace
        </Link>
      </div>
    );
  }

  if (!listing) {
    return null;
  }

  const isOwner = user?.id === listing.sellerId;

  return (
    <FadeIn key={listing.id}>
      <Link to="/marketplace" className="text-sm text-indigo-400 hover:underline">
        &larr; Back to marketplace
      </Link>

      <div className="mt-4 flex flex-col gap-6 sm:flex-row">
        {listing.imageUrls[0] ? (
          <img
            src={listing.imageUrls[0]}
            alt={listing.title}
            className="w-full max-w-sm rounded-lg border border-slate-800 object-cover"
          />
        ) : (
          <div className="flex w-full max-w-sm items-center justify-center rounded-lg border border-slate-800 bg-slate-900 p-12 text-slate-400">
            No image
          </div>
        )}

        <div>
          <h1 className="text-2xl font-semibold text-slate-100">{listing.title}</h1>
          <p className="mt-1 text-2xl font-semibold text-indigo-400">{listing.price.toFixed(2)} €</p>
          <p className="mt-2 text-sm text-slate-400">
            {categoryLabels[listing.category]} · Condition: {listing.condition}
          </p>
          {listing.status !== "ACTIVE" && (
            <p className="mt-1 text-sm font-medium uppercase text-amber-400">{listing.status}</p>
          )}
          {listing.description && <p className="mt-4 whitespace-pre-line text-slate-300">{listing.description}</p>}

          <p className="mt-4 text-sm text-slate-400">Listed by {listing.sellerDisplayName}</p>

          {isOwner && (
            <div className="mt-6 flex gap-2">
              <Link
                to={`/marketplace/${listing.id}/edit`}
                className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
              >
                Edit
              </Link>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("Remove this listing?")) {
                    deleteMutation.mutate();
                  }
                }}
                disabled={deleteMutation.isPending}
                className="rounded-md border border-rose-800 px-4 py-2 text-sm text-rose-400 hover:bg-rose-950 disabled:opacity-50"
              >
                {deleteMutation.isPending ? "Removing…" : "Remove listing"}
              </button>
            </div>
          )}
        </div>
      </div>
    </FadeIn>
  );
}
