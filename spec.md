# KrishnaBhaktiStore

## Current State
Phone login uses a demo OTP system: a 6-digit code is generated client-side in the browser, stored in a React ref, and shown in the browser console. No real SMS is sent. OTP expires in 5 minutes. Verification is done entirely in the frontend.

## Requested Changes (Diff)

### Add
- Backend `sendOtp(phone: Text): async Result` function that:
  - Generates a 6-digit OTP
  - Stores OTP hash + expiry (2 minutes from now) keyed by phone number
  - Makes HTTP outcall to Fast2SMS API to send real SMS
  - Returns success/failure
- Backend `verifyOtp(phone: Text, otp: Text): async Result` function that:
  - Checks OTP exists for that phone
  - Checks OTP has not expired (2-minute TTL)
  - Compares OTP value
  - Clears OTP on success
  - Returns ok/err

### Modify
- LoginPage.tsx: Replace client-side OTP generation/verification with calls to backend `sendOtp` and `verifyOtp`
- OTP expiry changed from 5 minutes to 2 minutes
- Remove console.log OTP debug output

### Remove
- Client-side OTP generation logic (otpRef, generateOtp function)
- Demo toast message revealing OTP

## Implementation Plan
1. Add OTP storage map and helper functions to backend main.mo
2. Add `sendOtp` function using HTTP outcall to Fast2SMS
3. Add `verifyOtp` function with expiry check
4. Regenerate backend bindings (backend.d.ts)
5. Update LoginPage.tsx to use backend calls
6. Update OTP expiry UI text to show 2 minutes
