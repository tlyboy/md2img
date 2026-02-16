'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { toBlob, toJpeg } from 'html-to-image'
import { saveAs } from 'file-saver'
import {
  Check,
  ChevronDown,
  Copy,
  Download,
  FileText,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface ExportButtonProps {
  targetRef: React.RefObject<HTMLDivElement | null>
}

function getExportOptions(): Parameters<typeof toBlob>[1] {
  const isDark = document.documentElement.classList.contains('dark')
  return {
    pixelRatio: 2,
    backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
    style: { overflow: 'visible' },
  }
}

function prepareForExport(element: HTMLDivElement): {
  addedLineNumbers: Element[]
  hiddenEmptyLines: HTMLElement[]
} {
  const addedLineNumbers: Element[] = []
  const hiddenEmptyLines: HTMLElement[] = []

  const codeBlocks = element.querySelectorAll(
    '[data-streamdown="code-block-body"] code',
  )
  codeBlocks.forEach((code) => {
    // 隐藏末尾空行（html-to-image 不支持 :has() 选择器）
    const lines = code.querySelectorAll(':scope > span')
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i] as HTMLElement
      const hasNoSpan = !line.querySelector('span')
      const hasOnlyEmptySpan =
        line.children.length === 1 &&
        line.children[0].tagName === 'SPAN' &&
        !line.children[0].textContent
      if (hasNoSpan || hasOnlyEmptySpan) {
        line.style.display = 'none'
        hiddenEmptyLines.push(line)
      } else {
        break
      }
    }

    // 添加行号
    const visibleLines = Array.from(lines).filter(
      (line) => (line as HTMLElement).style.display !== 'none',
    )
    visibleLines.forEach((line, index) => {
      const lineNumber = document.createElement('span')
      lineNumber.textContent = String(index + 1)
      lineNumber.setAttribute('data-export-line-number', 'true')
      lineNumber.style.cssText = `
        display: inline-block;
        width: 1.5rem;
        margin-right: 1rem;
        text-align: right;
        color: var(--muted-foreground);
        opacity: 0.5;
        font-family: ui-monospace, monospace;
        font-size: 13px;
        user-select: none;
      `
      ;(line as HTMLElement).style.setProperty('--hide-line-number', '1')
      line.insertBefore(lineNumber, line.firstChild)
      addedLineNumbers.push(lineNumber)
    })
  })

  return { addedLineNumbers, hiddenEmptyLines }
}

function restoreAfterExport(state: {
  addedLineNumbers: Element[]
  hiddenEmptyLines: HTMLElement[]
}): void {
  state.addedLineNumbers.forEach((lineNumber) => {
    const parent = lineNumber.parentElement
    if (parent) {
      ;(parent as HTMLElement).style.removeProperty('--hide-line-number')
    }
    lineNumber.remove()
  })
  state.hiddenEmptyLines.forEach((line) => {
    line.style.display = ''
  })
}

async function waitForRender(
  element: HTMLDivElement,
  timeout = 10000,
): Promise<void> {
  const mermaidBlocks = Array.from(
    element.querySelectorAll('[data-streamdown="mermaid-block"]'),
  )
  if (mermaidBlocks.length === 0) return

  const isRendered = (block: Element) =>
    !!block.querySelector('[data-streamdown="mermaid"]')

  if (mermaidBlocks.every(isRendered)) return

  const scrollContainer = element.closest(
    '.overflow-auto',
  ) as HTMLElement | null
  if (!scrollContainer) return

  const savedScroll = scrollContainer.scrollTop

  // Scroll to bottom to bring all lazy-loaded content into view
  scrollContainer.scrollTop = scrollContainer.scrollHeight
  await new Promise((r) => setTimeout(r, 500))

  // Restore scroll position
  scrollContainer.scrollTop = savedScroll

  // Wait until all mermaid blocks are fully rendered
  const start = Date.now()
  while (Date.now() - start < timeout) {
    if (mermaidBlocks.every(isRendered)) return
    await new Promise((r) => setTimeout(r, 200))
  }
}

async function capturePngBlob(element: HTMLDivElement): Promise<Blob | null> {
  await waitForRender(element)
  const state = prepareForExport(element)
  try {
    return await toBlob(element, getExportOptions())
  } finally {
    restoreAfterExport(state)
  }
}

async function captureJpegBlob(element: HTMLDivElement): Promise<Blob | null> {
  await waitForRender(element)
  const state = prepareForExport(element)
  try {
    const dataUrl = await toJpeg(element, {
      ...getExportOptions(),
      quality: 0.92,
    })
    const res = await fetch(dataUrl)
    return await res.blob()
  } finally {
    restoreAfterExport(state)
  }
}

export function ExportButton({
  targetRef,
}: ExportButtonProps): React.ReactNode {
  const t = useTranslations('export')
  const [isExporting, setIsExporting] = useState(false)
  const [isCopying, setIsCopying] = useState(false)
  const [copied, setCopied] = useState(false)

  async function handleExport(format: 'png' | 'jpg'): Promise<void> {
    if (!targetRef.current) return

    setIsExporting(true)
    const blob =
      format === 'jpg'
        ? await captureJpegBlob(targetRef.current)
        : await capturePngBlob(targetRef.current)
    if (blob) saveAs(blob, `markdown-${Date.now()}.${format}`)
    setIsExporting(false)
  }

  function handlePrintPdf(): void {
    if (!targetRef.current) return

    // Clone the already-rendered preview (includes Mermaid SVGs, KaTeX, Shiki)
    const clone = targetRef.current.cloneNode(true) as HTMLDivElement
    clone.style.padding = '2rem'

    // Hide all existing body children
    const siblings = Array.from(document.body.children) as HTMLElement[]
    siblings.forEach((el) => (el.dataset.printHidden = el.style.display))
    siblings.forEach((el) => (el.style.display = 'none'))

    // Insert clone at body level and print
    document.body.appendChild(clone)
    window.print()

    // Restore
    document.body.removeChild(clone)
    siblings.forEach((el) => {
      el.style.display = el.dataset.printHidden || ''
      delete el.dataset.printHidden
    })
  }

  async function handleCopy(): Promise<void> {
    if (!targetRef.current) return

    setIsCopying(true)
    const blob = await capturePngBlob(targetRef.current)
    if (blob) {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob }),
      ])
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
    setIsCopying(false)
  }

  function renderCopyIcon(): React.ReactNode {
    if (isCopying) return <Loader2 className="mr-2 h-4 w-4 animate-spin" />
    if (copied) return <Check className="mr-2 h-4 w-4" />
    return <Copy className="mr-2 h-4 w-4" />
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        onClick={handleCopy}
        disabled={isCopying}
        size="sm"
        variant="ghost"
      >
        {renderCopyIcon()}
        {copied ? t('copied') : t('copy')}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" disabled={isExporting}>
            {isExporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            {t('download')}
            <ChevronDown className="ml-1 h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => handleExport('png')}>
            PNG
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleExport('jpg')}>
            JPG
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button onClick={() => handlePrintPdf()} size="sm" variant="secondary">
        <FileText className="mr-2 h-4 w-4" />
        PDF
      </Button>
    </div>
  )
}
