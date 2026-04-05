# KrishnaBhaktiStore

## Current State
The LoginPage (`src/frontend/src/pages/LoginPage.tsx`) shows a single "Login with Internet Identity" button. There is no phone-based login option. Authentication is handled entirely via Internet Identity through `useInternetIdentity` hook.

## Requested Changes (Diff)

### Add
- Phone number input field with country code prefix (+91 default for India)
- "Send OTP" button that generates a 6-digit OTP and shows it in a toast (demo mode -- no real SMS gateway)
- After Send OTP is clicked, reveal a 6-digit OTP input field
- "Verify OTP" button that checks the entered code
- On successful verification, store a phone-login session in localStorage and update app auth state
- Clean, mobile-friendly UI with clear section separation between Phone Login and Internet Identity Login

### Modify
- LoginPage.tsx: Add phone OTP login section above the existing Internet Identity button
- The page should offer both options: phone OTP (primary, for regular customers) and Internet Identity (secondary, for admin)

### Remove
- Nothing removed

## Implementation Plan
1. Update `LoginPage.tsx` to include:
   - Tab or section split: "Phone Login" | "Admin Login (Internet Identity)"
   - Phone number input with +91 prefix
   - "Send OTP" button -- generates random 6-digit OTP, stores it in component state, shows it via toast (`Your OTP is: XXXXXX`)
   - OTP input field (6 digits) shown after Send OTP clicked
   - "Verify OTP" button -- compares entered vs stored OTP, shows success/error toast
   - On success: save phone number to localStorage as `phoneUser`, navigate to home or trigger state update
2. Keep existing Internet Identity login button in the Admin Login tab/section
3. No backend changes needed -- phone login is frontend-only (demo)
