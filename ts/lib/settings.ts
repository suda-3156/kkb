import { z } from "zod"

/**
 * Per-device user settings.
 *
 * Kept in localStorage: the phone and the desktop are used differently, so there
 * is nothing to share between them. Because the store belongs to the device,
 * **values written by an older version stay there forever**. Always read through
 * parseSettings so a broken value cannot break the UI.
 */

export const SETTINGS_STORAGE_KEY = "kkb.settings"

/** Ordering of the ledger account candidates. */
export const accountOrderSchema = z
  .enum([
    /** Creation order (the server's default ordering) */
    "created",
    /** Most recently used first */
    "lastUsed",
  ])
  .default("created")
  .catch("created")

export const settingsSchema = z.object({
  accountOrder: accountOrderSchema,
})

export type Settings = z.infer<typeof settingsSchema>
export type AccountOrder = Settings["accountOrder"]

export const DEFAULT_SETTINGS: Settings = settingsSchema.parse({})

/**
 * Turn the raw localStorage string into Settings. **Never throws.**
 *
 * Every field carries default + catch, which gives:
 * - missing key  -> the default (adding a setting needs no migration)
 * - unknown key  -> dropped by Zod (removing a setting breaks nothing)
 * - invalid value -> the default
 * While those three suffice the schema carries no version. One is only needed
 * when the meaning of an existing key changes.
 */
export const parseSettings = (raw: string | null | undefined): Settings => {
  if (!raw) return DEFAULT_SETTINGS

  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch {
    return DEFAULT_SETTINGS
  }

  const parsed = settingsSchema.safeParse(json)
  return parsed.success ? parsed.data : DEFAULT_SETTINGS
}

export const serializeSettings = (settings: Settings): string => JSON.stringify(settings)
