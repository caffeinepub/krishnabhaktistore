# KrishnaBhaktiStore

## Current State
The admin panel has a product add/edit dialog with an Image URL text field. Admins must manually paste a URL. The blob-storage component is not yet integrated.

## Requested Changes (Diff)

### Add
- File picker button ("Upload Image") in the product form dialog
- Image preview displayed after a file is selected (before saving)
- On save, upload the selected file via `ExternalBlob.fromBytes()` and store the resulting `getDirectURL()` as `imageUrl`
- Upload progress indicator while uploading

### Modify
- Product form dialog: replace the plain Image URL input with a combined upload + optional URL section
  - File picker first (primary path, not required)
  - Optional URL input below (secondary/fallback)
  - If a file is uploaded, its URL overwrites any manually entered URL on save
  - Image preview shown when either source is provided

### Remove
- Nothing removed; URL field becomes optional/secondary

## Implementation Plan
1. In `AdminPage.tsx`, add `imageFile` and `imagePreview` state fields
2. Add a hidden `<input type="file" accept="image/*">` triggered by an "Upload Image" button
3. On file selection: read as `Uint8Array`, set preview via `URL.createObjectURL`, store File in state
4. In `handleSave`, if a file is staged, upload via `ExternalBlob.fromBytes(bytes).withUploadProgress(...)`, get URL via `getDirectURL()`, set as `imageUrl` before calling backend
5. Show upload progress bar during save
6. Clear `imageFile`/`imagePreview` when dialog closes or form is cleared
