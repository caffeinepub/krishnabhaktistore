import { Skeleton } from "@/components/ui/skeleton";
import { useSearch } from "@tanstack/react-router";
import React, { useEffect, useState } from "react";
import type { Product } from "../backend";
import { ProductCategory } from "../backend";
import { ProductCard } from "../components/ProductCard";
import { useActor } from "../hooks/useActor";

const SKELETON_KEYS = [
  "sk-a",
  "sk-b",
  "sk-c",
  "sk-d",
  "sk-e",
  "sk-f",
  "sk-g",
  "sk-h",
];

export function ProductsPage() {
  const search = useSearch({ strict: false }) as { category?: string };
  const { actor } = useActor();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>(
    search.category ?? "all",
  );

  useEffect(() => {
    if (search.category) setActiveCategory(search.category);
  }, [search.category]);

  useEffect(() => {
    if (!actor) return;
    setLoading(true);
    const fetchFn =
      activeCategory === "book"
        ? actor.getProductsByCategory(ProductCategory.book)
        : activeCategory === "incense"
          ? actor.getProductsByCategory(ProductCategory.incense)
          : actor.getAllActiveProducts();
    fetchFn
      .then((p) => {
        setProducts(p);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [actor, activeCategory]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="text-center mb-8">
        <h1 className="font-display text-4xl font-bold uppercase tracking-wider text-primary">
          Products
        </h1>
        <div className="w-24 h-0.5 bg-accent mx-auto mt-3" />
      </div>

      {/* Filter Tabs */}
      <div className="flex justify-center gap-2 mb-8">
        {[
          { key: "all", label: "All" },
          { key: "book", label: "Books" },
          { key: "incense", label: "Incense" },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveCategory(tab.key)}
            className={`px-5 py-2 rounded-full text-sm uppercase tracking-wider font-medium transition-colors border ${
              activeCategory === tab.key
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-foreground border-border hover:border-primary hover:text-primary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {SKELETON_KEYS.map((k) => (
            <Skeleton key={k} className="h-64 rounded-lg" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <div className="text-5xl mb-4">🙏</div>
          <p className="text-lg">No products available in this category yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {products.map((p) => (
            <ProductCard key={p.id.toString()} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
