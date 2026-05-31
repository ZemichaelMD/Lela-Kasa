# Taste (Continuously Learned by [CommandCode][cmd])

[cmd]: https://commandcode.ai/

# schema
- For this project: Use snake_case column names in SQLite migrations (e.g., `is_active`, `is_default`, `created_at`). The repository code maps camelCase API fields to snake_case columns before upserting. Confidence: 0.85
- For this project: Always add `deleted_at DATETIME` column to every SQLite table for soft-delete support. Repository queries must include `AND deleted_at IS NULL`. Confidence: 0.80
- For this project: When writing migrations, match column names to what the actual repository/write code expects, not a separate schema convention. Multiple competing schemas cause silent failures. Confidence: 0.90

# offline
- For this project: SalesScreen and SaleDetailScreen queryFn must include a SQLite fallback when the API call fails (for offline mode). Confidence: 0.85
- For offline-first features: When a write operation fails due to "no such column" errors, it means the migration schema is out of sync with the write code. Fix the migration, not the catches. Confidence: 0.90

# architecture
- For this project: The app has TWO competing sets of repositories (class-based `*Repo` used by screens and object-literal `*Repository` exported from barrel). The class-based ones are active; the object-literal ones are mostly dead code. When making changes, update the class-based ones in `repositories/`. Confidence: 0.75
- For this project: The app has TWO OfflineProviders. The one in `src/providers/` (using `SyncCoordinator.ts`) is active; the one in `src/offline/context/` (using old `sync-coordinator.ts`) is dead code. Confidence: 0.70

# ui
- For MainTabs.tsx: Keep the `LinearGradient` gradient overlay behind the bottom tab bar so it contrasts with scrolling content and doesn't blend in. A solid surface color is insufficient. Confidence: 0.65

