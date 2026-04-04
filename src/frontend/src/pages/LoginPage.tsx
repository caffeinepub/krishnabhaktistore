import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import React from "react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

export function LoginPage() {
  const { login, isLoggingIn } = useInternetIdentity();

  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      <div className="text-6xl mb-6">🔒</div>
      <h1 className="font-display text-3xl font-bold text-primary uppercase tracking-wider mb-3">
        Admin Login
      </h1>
      <p className="text-muted-foreground mb-8">
        Login with Internet Identity to access the admin panel.
      </p>
      <Button
        onClick={login}
        disabled={isLoggingIn}
        className="bg-primary hover:bg-primary/90 text-primary-foreground uppercase tracking-wider px-8 py-3"
      >
        {isLoggingIn ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Connecting...
          </>
        ) : (
          "Login with Internet Identity"
        )}
      </Button>
    </div>
  );
}
