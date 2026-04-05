import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "phoneUser";

export interface PhoneUser {
  phone: string;
  loginMethod: "phone";
  token?: string;
}

// Module-level listeners so all hook instances stay in sync
type Listener = (user: PhoneUser | null) => void;
const listeners = new Set<Listener>();

function notify(user: PhoneUser | null) {
  for (const listener of listeners) {
    listener(user);
  }
}

function readFromStorage(): PhoneUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PhoneUser) : null;
  } catch {
    return null;
  }
}

export function usePhoneUser() {
  const [phoneUser, setPhoneUserState] = useState<PhoneUser | null>(
    readFromStorage,
  );

  useEffect(() => {
    const listener: Listener = (user) => setPhoneUserState(user);
    listeners.add(listener);

    // Re-read from localStorage on window focus to sync across tabs
    const handleFocus = () => {
      const current = readFromStorage();
      setPhoneUserState(current);
    };
    window.addEventListener("focus", handleFocus);

    return () => {
      listeners.delete(listener);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  const loginWithPhone = useCallback((phone: string, token?: string) => {
    const user: PhoneUser = {
      phone,
      loginMethod: "phone",
      ...(token ? { token } : {}),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    notify(user);
  }, []);

  const logoutPhone = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    notify(null);
  }, []);

  return { phoneUser, loginWithPhone, logoutPhone };
}
