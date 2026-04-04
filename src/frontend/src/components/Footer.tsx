import { Link } from "@tanstack/react-router";
import React from "react";

export function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <h3 className="font-display text-lg font-bold mb-4 text-accent">
              About ISKCON
            </h3>
            <p className="text-sm text-primary-foreground/70 leading-relaxed">
              Spreading the teachings of Lord Krishna through sacred books and
              devotional items.
            </p>
          </div>
          <div>
            <h3 className="font-display text-lg font-bold mb-4 text-accent">
              Quick Links
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  to="/"
                  className="text-primary-foreground/70 hover:text-accent transition-colors"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  to="/products"
                  className="text-primary-foreground/70 hover:text-accent transition-colors"
                >
                  All Products
                </Link>
              </li>
              <li>
                <Link
                  to="/cart"
                  className="text-primary-foreground/70 hover:text-accent transition-colors"
                >
                  Cart
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-display text-lg font-bold mb-4 text-accent">
              Categories
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="/products?category=book"
                  className="text-primary-foreground/70 hover:text-accent transition-colors"
                >
                  ISKCON Books
                </a>
              </li>
              <li>
                <a
                  href="/products?category=incense"
                  className="text-primary-foreground/70 hover:text-accent transition-colors"
                >
                  Incense Sticks
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-display text-lg font-bold mb-4 text-accent">
              Contact
            </h3>
            <ul className="space-y-2 text-sm text-primary-foreground/70">
              <li>Hare Krishna Hare Krishna</li>
              <li>Krishna Krishna Hare Hare</li>
              <li className="mt-2 text-accent font-medium">
                Hare Rama Hare Rama
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-primary-foreground/10 mt-10 pt-6 text-center text-xs text-primary-foreground/40">
          © {new Date().getFullYear()} KrishnaBhaktiStore. All rights reserved.
          Jai Sri Krishna.
        </div>
      </div>
    </footer>
  );
}
