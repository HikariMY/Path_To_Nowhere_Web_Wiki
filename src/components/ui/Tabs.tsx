import { useState, type ReactNode } from 'react'
import { cn } from '../../lib/utils'

interface Tab {
  id: string
  label: string
  icon?: ReactNode
}

interface TabsProps {
  tabs: Tab[]
  defaultTab?: string
  onChange?: (id: string) => void
  children: (activeTab: string) => ReactNode
  className?: string
}

export function Tabs({ tabs, defaultTab, onChange, children, className }: TabsProps) {
  const [active, setActive] = useState(defaultTab || tabs[0]?.id)

  const handleChange = (id: string) => {
    setActive(id)
    onChange?.(id)
  }

  return (
    <div className={className}>
      <div className="flex border-b border-ptn-border overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => handleChange(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap',
              'border-b-2 transition-colors duration-150 -mb-px',
              active === tab.id
                ? 'border-ptn-red text-ptn-text'
                : 'border-transparent text-ptn-muted hover:text-ptn-text',
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>
      <div className="mt-4">{children(active)}</div>
    </div>
  )
}
