# KrishnaBhaktiStore

## Current State
The admin panel has a product edit dialog (`AdminPage.tsx`) that opens a modal `<Dialog>`. When editing, it pre-fills form fields from the selected product. The image section shows a preview if a URL or blob exists, with a small "Upload Image" / "Change Image" button. Delete uses `window.confirm()`. Success is shown via a brief `toast.success("Product updated")` notification.

## Requested Changes (Diff)

### Add
- Prominent "Product updated successfully" success banner/message (in addition to or replacing the plain toast) when update completes
- Delete confirmation via a styled confirmation popup (AlertDialog) instead of `window.confirm()`
- "Change Image" button clearly visible below the current image preview when editing
- The current product image prominently previewed at the top of the edit form, even before a new file is selected

### Modify
- Edit dialog UI: larger input fields, clear section spacing, clean card-like layout, mobile-friendly (full-screen sheet on mobile)
- "Update Product" button should be visually highlighted (primary color, larger)
- "Delete Product" button should be clearly styled as destructive (red), visible in the footer of the edit dialog
- Image upload: device upload only (no URL input field required for editing flow; clean up the optional URL field from the primary edit UX)
- Success toast message changed to: "Product updated successfully"
- The upload button should say "Change Image" when an existing image is present

### Remove
- `window.confirm()` for delete -- replaced with AlertDialog
- Optional image URL input field from the main image section (can keep internally but hide from primary edit UX to reduce clutter)

## Implementation Plan
1. In `AdminPage.tsx`, replace `window.confirm()` delete with an `AlertDialog` confirmation popup (using existing shadcn alert-dialog component)
2. Improve edit dialog layout:
   - Use `Sheet` (full-height slide-in on mobile) or keep Dialog but make it wider and better spaced
   - Large `h-12` inputs (add `className="h-12 text-base"` to inputs), generous padding, clear section labels
   - Show current image prominently at top (full-width, rounded, h-48) with "Change Image" button overlaid or below
   - Remove the URL fallback input from the visible edit form (keep for add-new flow only or remove entirely)
3. Edit dialog footer: "Update Product" as large primary button, "Delete Product" as destructive button (triggers AlertDialog)
4. On successful update, show `toast.success("Product updated successfully")`
5. Ensure the delete alert dialog closes the edit dialog after confirming deletion
