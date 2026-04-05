import { Link, useLocation } from "@tanstack/react-router";
import { Copy, Phone, ShoppingCart, User } from "lucide-react";
import React, { useState } from "react";
import { useCart } from "../context/CartContext";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { usePhoneUser } from "../hooks/usePhoneUser";

export function Header() {
  const { itemCount } = useCart();
  const { identity, clear } = useInternetIdentity();
  const { phoneUser, logoutPhone } = usePhoneUser();
  const location = useLocation();
  const isIILoggedIn = !!identity && !identity.getPrincipal().isAnonymous();
  const principalId = isIILoggedIn ? identity.getPrincipal().toText() : null;
  const [copied, setCopied] = useState(false);

  const navLinks = [
    { to: "/", label: "Home" },
    { to: "/products?category=book", label: "Books" },
    { to: "/products?category=incense", label: "Incense" },
    { to: "/products", label: "All Products" },
  ];

  const handleCopy = () => {
    if (principalId) {
      navigator.clipboard.writeText(principalId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

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
            {/* Internet Identity logged-in state */}
            {isIILoggedIn && (
              <>
                <div className="hidden sm:flex items-center gap-1.5 bg-muted rounded px-2 py-1">
                  <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[120px]">
                    {principalId}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopy}
                    title="Copy Principal ID"
                    className="text-muted-foreground hover:text-primary transition-colors flex-shrink-0"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                  {copied && (
                    <span className="text-[10px] text-green-600 font-medium">
                      Copied!
                    </span>
                  )}
                </div>
                <Link
                  to="/admin"
                  className="hidden sm:block text-xs uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors"
                >
                  Admin
                </Link>
                <button
                  type="button"
                  data-ocid="header.logout_button"
                  onClick={clear}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
                >
                  <User className="h-3.5 w-3.5" />
                  Logout
                </button>
              </>
            )}

            {/* Phone user logged-in state */}
            {!isIILoggedIn && phoneUser && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-muted rounded px-2 py-1">
                  <Phone className="h-3 w-3 text-primary flex-shrink-0" />
                  <span className="text-[11px] font-medium text-foreground max-w-[80px] truncate">
                    {phoneUser.phone}
                  </span>
                </div>
                <button
                  type="button"
                  data-ocid="header.logout_button"
                  onClick={logoutPhone}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
                >
                  <User className="h-3.5 w-3.5" />
                  Logout
                </button>
              </div>
            )}

            {/* Not logged in */}
            {!isIILoggedIn && !phoneUser && (
              <Link
                to="/login"
                data-ocid="header.link"
                className="flex items-center gap-1 text-xs uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors"
              >
                <User className="h-3.5 w-3.5" />
                Login
              </Link>
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
