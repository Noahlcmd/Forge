import { CampaignBuilder } from '../CampaignBuilder'

export default function AdsBuilderPage() {
  return (
    <div className="p-6" style={{ color: 'var(--text-primary)' }}>
      <div className="mb-5">
        <h1 className="text-[22px] font-[600] tracking-[-0.4px]" style={{ color: 'var(--text-primary)' }}>
          ✦ AI Campaign Builder
        </h1>
        <p className="text-[13px] mt-[2px]" style={{ color: 'var(--text-muted)' }}>
          Describe your goal and AI will build your campaign step by step
        </p>
      </div>
      <CampaignBuilder />
    </div>
  )
}
