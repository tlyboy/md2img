'use client'

import { forwardRef } from 'react'
import { useTheme } from 'next-themes'
import { Streamdown } from 'streamdown'
import { createMathPlugin } from '@streamdown/math'
import { createCodePlugin } from '@streamdown/code'
import { createMermaidPlugin } from '@streamdown/mermaid'
import rehypeRaw from 'rehype-raw'
import { rehypeCustomSlug } from '@/lib/rehype-custom-slug'
import { LinkSafetyModal } from '@/components/link-safety-modal'
import type { BundledTheme } from 'shiki'

interface MarkdownPreviewProps {
  content: string
}

const mathPlugin = createMathPlugin({ singleDollarTextMath: true })
const codePlugin = createCodePlugin({
  themes: ['vitesse-light', 'vitesse-dark'] as [BundledTheme, BundledTheme],
})

const rehypePlugins = [rehypeRaw, rehypeCustomSlug]

export const MarkdownPreview = forwardRef<HTMLDivElement, MarkdownPreviewProps>(
  function MarkdownPreview({ content }, ref) {
    const { resolvedTheme } = useTheme()

    const mermaidPlugin = createMermaidPlugin({
      config: {
        theme: resolvedTheme === 'dark' ? 'dark' : 'default',
      },
    })

    return (
      <div className="h-full overflow-auto">
        <div
          ref={ref}
          className="prose prose-neutral dark:prose-invert bg-background max-w-none p-4 md:p-6"
        >
          <Streamdown
            mode="static"
            plugins={{
              math: mathPlugin,
              code: codePlugin,
              mermaid: mermaidPlugin,
            }}
            rehypePlugins={rehypePlugins}
            linkSafety={{
              enabled: true,
              onLinkCheck: (url) => {
                if (url.startsWith('/') || url.startsWith('#')) {
                  return true
                }
                return false
              },
              renderModal: (props) => <LinkSafetyModal {...props} />,
            }}
          >
            {content}
          </Streamdown>
        </div>
      </div>
    )
  },
)
