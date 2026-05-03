export default function BillingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-6">
      {children}
    </div>
  )
}
