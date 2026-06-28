# Digiitup Healthcare Website Operating System

HWOS v0.1 is an internal, repository-backed workflow tool for healthcare website production.

## Storage and deployment

- **Local development is writable.** Run `npm install` and `npm run dev` locally to create projects, edit Markdown deliverables, and update research statuses using files inside the repository.
- **Vercel previews are read-only demos.** Production and Vercel environments disable project creation, Markdown saving, and status updates because their filesystem is not persistent application storage.
- **v0.2 requires persistent storage.** A future release should move project data and deliverable state to a database or durable object-storage service before enabling production writes.

HWOS v0.1 is file-based and must be run locally. Production storage will be added in v0.2.

## Knowledge Engine v0.4

Run the app locally and open `/knowledge/import` to paste a canonical Markdown document. The importer detects Parts and Chapters conservatively, preserves the complete source in an immutable export and version snapshot, writes structured chapter files under `knowledge/documents/{slug}/`, and records validation metadata. Existing package slugs are never overwritten.

Imported packages are available at `/knowledge/packages`. Vercel and production previews remain read-only.
