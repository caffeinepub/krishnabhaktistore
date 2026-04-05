# KrishnaBhaktiStore

## Current State
- Phone login with OTP is implemented on /login page
- On successful OTP verification, loginWithPhone(phone) saves the phone to localStorage under key phoneUser
- usePhoneUser hook reads from localStorage on mount -- so auto-login already works on page refresh
- Header.tsx shows phone number + logout button for phone users, but only on sm: (desktop) breakpoints -- invisible on mobile
- Backend has saveCallerUserProfile / getCallerUserProfile but these require an authenticated Principal (Internet Identity), not usable for phone-only users
- No backend storage of phone numbers for phone-only users (only localStorage)

## Requested Changes (Diff)

### Add
- Backend: new savePhoneUser(phone: Text) that stores phone number mapped to a unique token (anonymous callers). Keyed by a client-generated UUID token stored in localStorage.
- Frontend: after OTP verification, call savePhoneUser(phone) on the backend and store the returned token in localStorage alongside phone
- Frontend: on app load, if localStorage has phoneUser, treat as auto-logged-in (already works)

### Modify
- Header.tsx: Remove hidden sm: from the phone user block so logout button and phone number are visible on mobile
- Header.tsx: Also make II logout button visible on mobile
- LoginPage.tsx: After OTP verification, call savePhoneUser backend API to persist phone to database, then loginWithPhone

### Remove
- Nothing removed

## Implementation Plan
1. Add savePhoneUser(phone: Text, token: Text) : async () and getPhoneUser(token: Text) : async ?Text to backend main.mo
2. Update Header.tsx to show phone user info and logout on all screen sizes (remove hidden sm: for phone user section)
3. Update LoginPage.tsx to call backend savePhoneUser after successful OTP verification
4. Update usePhoneUser.ts to store/read a session token alongside phone in localStorage
