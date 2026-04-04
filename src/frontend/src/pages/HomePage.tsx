import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles } from "lucide-react";
import React, { useEffect, useState } from "react";
import type { Product } from "../backend";
import { Footer } from "../components/Footer";
import { ProductCard } from "../components/ProductCard";
import { useActor } from "../hooks/useActor";

const DECORATIVE_DOTS = [0, 1, 2, 3, 4, 5, 6, 7];
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

export function HomePage() {
  const { actor } = useActor();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!actor) return;
    actor
      .getAllActiveProducts()
      .then((p) => {
        setProducts(p.slice(0, 8));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [actor]);

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section
        className="relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #1C120E 40%, #3B1048 100%)",
        }}
      >
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23C8A45A' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="text-center md:text-left">
              <div className="inline-flex items-center gap-2 bg-accent/20 border border-accent/30 rounded-full px-4 py-1.5 mb-6">
                <Sparkles className="h-3.5 w-3.5 text-accent" />
                <span className="text-accent text-xs uppercase tracking-widest font-medium">
                  Sacred Devotional Store
                </span>
              </div>
              <h1
                className="font-display text-4xl md:text-5xl lg:text-6xl font-bold uppercase tracking-wide leading-tight mb-5"
                style={{ color: "#F6F0E3" }}
              >
                Divine
                <br />
                <span style={{ color: "#C8A45A" }}>Devotion</span>
                <br />
                Delivered
              </h1>
              <p
                className="text-base md:text-lg mb-8 max-w-md"
                style={{ color: "#F6F0E3", opacity: 0.75 }}
              >
                Explore sacred ISKCON books and premium incense sticks. Bring
                the fragrance of devotion into your home.
              </p>
              <Link
                to="/products"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-md font-bold uppercase tracking-wider text-sm transition-all hover:opacity-90 hover:translate-y-[-1px] shadow-lg"
                style={{ background: "#D07A2A", color: "#FFF3E2" }}
              >
                Shop Now <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="hidden md:flex items-center justify-center">
              <div
                className="relative w-full max-w-sm aspect-square rounded-2xl flex items-center justify-center"
                style={{
                  background: "rgba(200, 164, 90, 0.1)",
                  border: "2px solid rgba(200, 164, 90, 0.3)",
                }}
              >
                <div className="text-center">
                  <div className="text-8xl mb-4">🛕</div>
                  <div
                    className="font-display text-2xl font-bold uppercase tracking-widest"
                    style={{ color: "#C8A45A" }}
                  >
                    Hare Krishna
                  </div>
                  <div
                    className="text-sm mt-2 opacity-60"
                    style={{ color: "#F6F0E3" }}
                  >
                    हरे कृष्ण हरे राम
                  </div>
                </div>
                {DECORATIVE_DOTS.map((i) => (
                  <div
                    key={`dot-${i}`}
                    className="absolute w-2 h-2 rounded-full"
                    style={{
                      background: "#C8A45A",
                      opacity: 0.5,
                      top: `${50 + 44 * Math.sin((i * Math.PI * 2) / 8)}%`,
                      left: `${50 + 44 * Math.cos((i * Math.PI * 2) / 8)}%`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16 px-4 max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="font-display text-3xl font-bold uppercase tracking-wider text-primary">
            Featured Products
          </h2>
          <div className="w-24 h-0.5 bg-accent mx-auto mt-3" />
        </div>
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {SKELETON_KEYS.map((k) => (
              <Skeleton key={k} className="h-64 rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {products.map((p) => (
              <ProductCard key={p.id.toString()} product={p} />
            ))}
          </div>
        )}
        <div className="text-center mt-10">
          <Link
            to="/products"
            className="inline-flex items-center gap-2 border border-primary text-primary px-6 py-2.5 rounded-md text-sm font-medium uppercase tracking-wider hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            View All Products <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Category Tiles */}
      <section className="py-12 px-4 max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="font-display text-3xl font-bold uppercase tracking-wider text-primary">
            Explore Categories
          </h2>
          <div className="w-24 h-0.5 bg-accent mx-auto mt-3" />
        </div>
        <div className="grid sm:grid-cols-2 gap-6">
          <a
            href="/products?category=book"
            className="group relative overflow-hidden rounded-xl block"
          >
            <div
              className="relative h-52 flex flex-col items-start justify-end p-6"
              style={{
                background: "linear-gradient(135deg, #3B1048, #1C120E)",
              }}
            >
              <div className="absolute inset-0 flex items-center justify-center opacity-20">
                <div className="text-9xl">📖</div>
              </div>
              <div className="relative z-10">
                <div className="text-xs uppercase tracking-widest text-accent font-bold mb-1">
                  Category
                </div>
                <h3 className="font-display text-2xl font-bold text-white uppercase">
                  ISKCON Books
                </h3>
                <p className="text-white/60 text-sm mt-1">Shop Wisdom</p>
              </div>
              <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center group-hover:bg-accent transition-colors">
                <ArrowRight className="h-4 w-4 text-white" />
              </div>
            </div>
          </a>

          <a
            href="/products?category=incense"
            className="group relative overflow-hidden rounded-xl block"
          >
            <div
              className="relative h-52 flex flex-col items-start justify-end p-6"
              style={{
                background: "linear-gradient(135deg, #7A4E1A, #C8A45A)",
              }}
            >
              <div className="absolute inset-0 flex items-center justify-center opacity-20">
                <div className="text-9xl">🪔</div>
              </div>
              <div className="relative z-10">
                <div className="text-xs uppercase tracking-widest text-white/80 font-bold mb-1">
                  Category
                </div>
                <h3 className="font-display text-2xl font-bold text-white uppercase">
                  Incense Sticks
                </h3>
                <p className="text-white/70 text-sm mt-1">Shop Aromas</p>
              </div>
              <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
                <ArrowRight className="h-4 w-4 text-white" />
              </div>
            </div>
          </a>
        </div>
      </section>

      <Footer />
    </div>
  );
}
