'use client'

export function PrintButtons() {
  return (
    <div className="no-print" style={{ position: 'fixed', top: 16, right: 16, display: 'flex', gap: 8, zIndex: 50 }}>
      <button
        onClick={() => window.print()}
        style={{
          background: '#f97316', color: '#fff', border: 'none', borderRadius: 8,
          padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
        }}
      >
        Download PDF
      </button>
      <button
        onClick={() => window.close()}
        style={{
          background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 8,
          padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
        }}
      >
        Close
      </button>
    </div>
  )
}
