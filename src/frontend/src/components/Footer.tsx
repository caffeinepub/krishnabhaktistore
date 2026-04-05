import { Link } from "@tanstack/react-router";
import React, { useEffect, useState } from "react";

const DEFAULT_ABOUT =
  "Spreading the teachings of Lord Krishna through sacred books and devotional items.";
const DEFAULT_CONTACT =
  "Hare Krishna Hare Krishna\nKrishna Krishna Hare Hare\nHare Rama Hare Rama\nRama Rama Hare Hare";

export function Footer() {
  const [siteContent, setSiteContent] = useState<{
    aboutSection?: string;
    contactInfo?: string;
  } | null>(null);

  useEffect(() => {
    const cached = localStorage.getItem("siteContent");
    if (cached) {
      try {
        setSiteContent(JSON.parse(cached));
      } catch {}
    }
  }, []);

  const aboutText = siteContent?.aboutSection || DEFAULT_ABOUT;
  const rawContact = siteContent?.contactInfo || DEFAULT_CONTACT;
  // Build unique keys by combining position + content to avoid duplicate key warnings
  const contactItems = rawContact
    .split("\n")
    .filter(Boolean)
    .map((line, pos) => ({ line, id: `${pos}-${line}`, pos }));

  return (
    <footer className="bg-primary text-primary-foreground mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <h3 className="font-display text-lg font-bold mb-4 text-accent">
              About ISKCON
            </h3>
            <p className="text-sm text-primary-foreground/70 leading-relaxed">
              {aboutText}
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
              {contactItems.map(({ line, id, pos }) => (
                <li
                  key={id}
                  className={pos === 2 ? "mt-2 text-accent font-medium" : ""}
                >
                  {line}
                </li>
              ))}
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
