import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "phoneUser";

export interface PhoneUser {
  phone: string;
  loginMethod: "phone";
}

// Module-level listeners so all hook instances stay in sync
type Listener = (user: PhoneUser | null) => void;
const listeners = new Set<Listener>();

function notify(user: PhoneUser | null) {
  for (const listener of listeners) {
    listener(user);
  }
}

export function usePhoneUser() {
  const [phoneUser, setPhoneUserState] = useState<PhoneUser | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as PhoneUser) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const listener: Listener = (user) => setPhoneUserState(user);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const loginWithPhone = useCallback((phone: string) => {
    const user: PhoneUser = { phone, loginMethod: "phone" };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    notify(user);
  }, []);

  const logoutPhone = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    notify(null);
  }, []);

  return { phoneUser, loginWithPhone, logoutPhone };
}
