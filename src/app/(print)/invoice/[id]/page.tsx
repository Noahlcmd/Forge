import { createClient } from '@/lib/supabase/server'
import { getAppUser } from '@/lib/auth/getAppUser'
import { redirect, notFound } from 'next/navigation'
import { formatMoney } from '@/lib/currency'
import { PrintButtons } from './PrintButtons'

type LineItem = { description: string; qty: number; unit_price_cents: number }

export default async function InvoicePrintPage({ params }: { params: { id: string } }) {
  let result: Awaited<ReturnType<typeof getAppUser>>
  try { result = await getAppUser() } catch { result = { ok: false, reason: 'no_user' } as const }
  if (!result.ok) redirect('/login')

  const supabase = createClient()
  const orgId    = result.membership.organizations.id

  const { data: inv, error } = await supabase
    .from('invoices')
    .select(`
      id, number, status, amount_cents, tax_cents, currency,
      due_date, paid_at, notes, line_items, created_at,
      customers ( name, email, company, phone )
    `)
    .eq('id', params.id)
    .eq('organization_id', orgId)
    .maybeSingle()

  if (error || !inv) notFound()

  const org      = result.membership.organizations
  type CustomerRow = { name: string; email: string | null; company: string | null; phone: string | null }
  const rawCustomer = inv.customers as CustomerRow | CustomerRow[] | null
  const customer    = Array.isArray(rawCustomer) ? (rawCustomer[0] ?? null) : rawCustomer
  const items    = (inv.line_items ?? []) as LineItem[]
  const subtotal = items.reduce((s, li) => s + li.qty * li.unit_price_cents, 0)
  const tax      = inv.tax_cents ?? 0
  const total    = inv.amount_cents

  const STATUS_COLOR: Record<string, string> = {
    paid: '#12a150', sent: '#2563eb', overdue: '#e53e3e',
    draft: '#6b7280', cancelled: '#9ca3af',
  }
  const statusColor = STATUS_COLOR[inv.status] ?? '#6b7280'

  return (
    <>
      <style>{`
        @media print {
          body { margin: 0; }
          .no-print { display: none !important; }
          @page { margin: 20mm; size: A4; }
        }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111; background: #fff; }
      `}</style>

      <PrintButtons />

      <div style={{ maxWidth: 720, margin: '40px auto', padding: '0 24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 40 }}>
          <div>
            <p style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{org.name}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 28, fontWeight: 800, margin: 0, letterSpacing: '-1px' }}>INVOICE</p>
            <p style={{ fontSize: 14, color: '#6b7280', margin: '4px 0 0' }}>{inv.number}</p>
            <span style={{
              display: 'inline-block', marginTop: 6, padding: '2px 10px',
              borderRadius: 20, fontSize: 11, fontWeight: 600,
              background: statusColor + '18', color: statusColor,
            }}>
              {inv.status.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Bill to / details */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, marginBottom: 40 }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9ca3af', margin: '0 0 6px' }}>Bill To</p>
            {customer ? (
              <>
                <p style={{ fontWeight: 600, margin: '0 0 2px' }}>{customer.name}</p>
                {customer.company && <p style={{ color: '#6b7280', margin: '0 0 2px', fontSize: 13 }}>{customer.company}</p>}
                {customer.email   && <p style={{ color: '#6b7280', margin: '0 0 2px', fontSize: 13 }}>{customer.email}</p>}
                {customer.phone   && <p style={{ color: '#6b7280', margin: 0, fontSize: 13 }}>{customer.phone}</p>}
              </>
            ) : (
              <p style={{ color: '#9ca3af', fontSize: 13 }}>No customer attached</p>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ marginBottom: 8 }}>
              <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9ca3af', margin: '0 0 2px' }}>Issue Date</p>
              <p style={{ margin: 0, fontSize: 13 }}>{new Date(inv.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
            {inv.due_date && (
              <div style={{ marginBottom: 8 }}>
                <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9ca3af', margin: '0 0 2px' }}>Due Date</p>
                <p style={{ margin: 0, fontSize: 13 }}>{new Date(inv.due_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
            )}
            {inv.paid_at && (
              <div>
                <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#12a150', margin: '0 0 2px' }}>Paid</p>
                <p style={{ margin: 0, fontSize: 13 }}>{new Date(inv.paid_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
            )}
          </div>
        </div>

        {/* Line items */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
          <thead>
            <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
              {['Description', 'Qty', 'Unit Price', 'Total'].map((h, i) => (
                <th key={h} style={{
                  padding: '10px 14px', textAlign: i === 0 ? 'left' : 'right',
                  fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
                  letterSpacing: '0.06em', color: '#6b7280',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.length > 0 ? items.map((li, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '11px 14px', fontSize: 13 }}>{li.description}</td>
                <td style={{ padding: '11px 14px', fontSize: 13, textAlign: 'right' }}>{li.qty}</td>
                <td style={{ padding: '11px 14px', fontSize: 13, textAlign: 'right' }}>{formatMoney(li.unit_price_cents, inv.currency)}</td>
                <td style={{ padding: '11px 14px', fontSize: 13, textAlign: 'right', fontWeight: 500 }}>{formatMoney(li.qty * li.unit_price_cents, inv.currency)}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan={4} style={{ padding: '20px 14px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>No line items</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Totals */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: 280 }}>
            {items.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13, color: '#6b7280' }}>
                <span>Subtotal</span>
                <span>{formatMoney(subtotal, inv.currency)}</span>
              </div>
            )}
            {tax > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13, color: '#6b7280' }}>
                <span>Tax</span>
                <span>{formatMoney(tax, inv.currency)}</span>
              </div>
            )}
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              padding: '10px 0', marginTop: 4,
              borderTop: '2px solid #111', fontSize: 16, fontWeight: 700,
            }}>
              <span>Total</span>
              <span>{formatMoney(total, inv.currency)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {inv.notes && (
          <div style={{ marginTop: 40, paddingTop: 24, borderTop: '1px solid #e5e7eb' }}>
            <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9ca3af', margin: '0 0 6px' }}>Notes</p>
            <p style={{ fontSize: 13, color: '#374151', margin: 0, whiteSpace: 'pre-wrap' }}>{inv.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: 60, paddingTop: 16, borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between' }}>
          <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>Generated by Forge</p>
          <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>{inv.number}</p>
        </div>

      </div>
    </>
  )
}
