import { z } from 'zod'

const optionalString = z.preprocess(
  v => (typeof v === 'string' ? v.trim() || undefined : v),
  z.string().min(1).optional()
)

const optionalEmail = z.preprocess(
  v => (typeof v === 'string' ? v.trim() || undefined : v),
  z.string().email('Invalid email address').optional()
)

export const LeadInsertSchema = z.object({
  company:      z.string().trim().min(1, 'Company name is required'),
  contact_name: optionalString,
  email:        optionalEmail,
  phone:        optionalString,
  industry:     optionalString,
  location:     optionalString,
  size:         optionalString,
  revenue:      optionalString,
  score:        z.number().int().min(0).max(100).optional(),
})

export type LeadInsert = z.infer<typeof LeadInsertSchema>
