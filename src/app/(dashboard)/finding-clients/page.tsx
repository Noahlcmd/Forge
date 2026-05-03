import { FindingClientsClient } from './components/FindingClientsClient'

export default function FindingClientsPage() {
  return (
    <div className="p-6" style={{ color: 'var(--text-primary)' }}>
      <div className="mb-5">
        <h1 className="text-[22px] font-[600] tracking-[-0.4px]" style={{ color: 'var(--text-primary)' }}>
          Finding Clients
        </h1>
        <p className="text-[13px] mt-[2px]" style={{ color: 'var(--text-muted)' }}>
          Discover and score potential clients for your business
        </p>
      </div>
      <FindingClientsClient />
    </div>
  )
}
