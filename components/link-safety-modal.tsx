'use client'

import { createPortal } from 'react-dom'
import { useTranslations } from 'next-intl'
import type { LinkSafetyModalProps } from 'streamdown'
import { ExternalLink, X, Copy } from 'lucide-react'

export function LinkSafetyModal({
  url,
  isOpen,
  onClose,
  onConfirm,
}: LinkSafetyModalProps) {
  const t = useTranslations('linkSafety')
  if (!isOpen || typeof document === 'undefined') return null

  const handleCopy = () => {
    navigator.clipboard.writeText(url)
  }

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background mx-4 w-full max-w-md rounded-lg border p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            <span className="text-lg font-semibold">{t('title')}</span>
          </div>
          <button onClick={onClose} className="hover:bg-muted rounded p-1">
            <X className="h-4 w-4" />
          </button>
        </div>
        <span className="text-muted-foreground mb-4 block">
          {t('description')}
        </span>
        <div className="bg-muted mb-4 rounded p-3 text-sm break-all">{url}</div>
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="hover:bg-muted flex flex-1 items-center justify-center gap-2 rounded border px-4 py-2"
          >
            <Copy className="h-4 w-4" />
            {t('copyLink')}
          </button>
          <button
            onClick={onConfirm}
            className="bg-primary text-primary-foreground flex flex-1 items-center justify-center gap-2 rounded px-4 py-2 hover:opacity-90"
          >
            <ExternalLink className="h-4 w-4" />
            {t('openLink')}
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
