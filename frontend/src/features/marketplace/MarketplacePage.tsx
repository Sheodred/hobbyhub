import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";

import { FadeIn } from "../../components/FadeIn";
import { useAuth } from "../auth/AuthContext";
import { listListings, type ListingCategory } from "./api";
import { categoryLabels } from "./categoryLabels";

export function MarketplacePage() {
  const { user } = useAuth();
  const [category, setCategory] = useState<ListingCategory | "">("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sort, setSort] = useState<"newest" | "price_asc" | "price_desc">("newest");

  const { data, isFetching } = useQuery({
    queryKey: ["listings", category, minPrice, maxPrice, sort],
    queryFn: () =>
      listListings({
        category: category || undefined,
        minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        sort,
      }),
  });

  return (
    <div>
      <FadeIn className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-100">Marketplace</h1>
          <p className="mt-2 text-slate-400">
            Board games and cards currently up for sale - inquire directly, no checkout here.
          </p>
        </div>
        {user && (
          <Link
            to="/marketplace/new"
            className="rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400"
          >
            New listing
          </Link>
        )}
      </FadeIn>

      <FadeIn delay={0.1} className="mt-6 flex flex-wrap gap-3">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as ListingCategory | "")}
          className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
        >
          <option value="">All categories</option>
          {Object.entries(categoryLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <input
          type="number"
          min="0"
          step="0.01"
          value={minPrice}
          onChange={(e) => setMinPrice(e.target.value)}
          placeholder="Min price"
          className="w-28 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
        />
        <input
          type="number"
          min="0"
          step="0.01"
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
          placeholder="Max price"
          className="w-28 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
        />

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as "newest" | "price_asc" | "price_desc")}
          className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
        >
          <option value="newest">Newest first</option>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
        </select>
      </FadeIn>

      <div className="mt-6">
        {isFetching && <p className="text-slate-400">Loading listings…</p>}

        {data && data.content.length === 0 && (
          <p className="text-slate-400">No listings match those filters.</p>
        )}

        {data && data.content.length > 0 && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {data.content.map((listing, index) => (
              <FadeIn key={listing.id} onScroll delay={Math.min(index * 0.03, 0.24)}>
                <Link
                  to={`/marketplace/${listing.id}`}
                  className="group block overflow-hidden rounded-lg border border-slate-800 bg-slate-900/60 transition-colors hover:border-indigo-500"
                >
                  {listing.imageUrls[0] ? (
                    <img
                      src={listing.imageUrls[0]}
                      alt={listing.title}
                      className="aspect-square w-full object-cover"
                    />
                  ) : (
                    <div className="flex aspect-square w-full items-center justify-center bg-slate-800 p-2 text-center text-xs text-slate-400">
                      {listing.title}
                    </div>
                  )}
                  <div className="p-3">
                    <p className="truncate text-sm font-medium text-slate-100 group-hover:text-indigo-400">
                      {listing.title}
                    </p>
                    <p className="mt-1 text-sm text-slate-400">
                      {categoryLabels[listing.category]} · {listing.condition}
                    </p>
                    <p className="mt-1 font-semibold text-slate-100">{listing.price.toFixed(2)} €</p>
                  </div>
                </Link>
              </FadeIn>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
