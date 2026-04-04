import { Link, useLocation } from "@tanstack/react-router";
import { ShoppingCart, User } from "lucide-react";
import React from "react";
import { useCart } from "../context/CartContext";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

export function Header() {
  const { itemCount } = useCart();
  const { identity, login, clear } = useInternetIdentity();
  const location = useLocation();
  const isLoggedIn = !!identity && !identity.getPrincipal().isAnonymous();

  const navLinks = [
    { to: "/", label: "Home" },
    { to: "/products?category=book", label: "Books" },
    { to: "/products?category=incense", label: "Incense" },
    { to: "/products", label: "All Products" },
  ];

  return (
    <header className="bg-card border-b border-border sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-display font-bold text-sm">
              OM
            </div>
            <div className="hidden sm:block">
              <div className="font-display text-primary font-bold text-lg leading-tight tracking-wide">
                KrishnaBhakti
              </div>
              <div className="text-xs text-muted-foreground uppercase tracking-widest">
                Sacred Store
              </div>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                to={link.to}
                className={`text-sm uppercase tracking-wider font-medium transition-colors hover:text-accent ${
                  location.pathname === link.to.split("?")[0]
                    ? "text-accent border-b-2 border-accent pb-0.5"
                    : "text-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <>
                <Link
                  to="/admin"
                  className="hidden sm:block text-xs uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors"
                >
                  Admin
                </Link>
                <button
                  type="button"
                  onClick={clear}
                  className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
                >
                  <User className="h-3.5 w-3.5" />
                  Logout
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={login}
                className="hidden sm:flex items-center gap-1 text-xs uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors"
              >
                <User className="h-3.5 w-3.5" />
                Login
              </button>
            )}

            <Link
              to="/cart"
              className="relative flex items-center justify-center w-9 h-9 rounded-full hover:bg-muted transition-colors"
            >
              <ShoppingCart className="h-5 w-5 text-foreground" />
              {itemCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] text-[10px] font-bold rounded-full bg-accent text-accent-foreground flex items-center justify-center px-1">
                  {itemCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
