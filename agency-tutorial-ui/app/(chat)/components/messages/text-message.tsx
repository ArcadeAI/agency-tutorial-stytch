import clsx from 'clsx';
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { codeToHtml } from 'shiki';
import { Loader2 } from 'lucide-react';

type TextMessageProps = {
  text: string;
  isUser: boolean;
};

// Code block component with syntax highlighting
function CodeBlock({
  children,
  className,
  ...props
}: {
  children: string;
  className?: string;
}) {
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : 'text';

  const [highlightedCode, setHighlightedCode] = React.useState<string>('');

  React.useEffect(() => {
    const highlight = async () => {
      try {
        const html = await codeToHtml(children, {
          lang: language,
          theme: 'github-light'
        });
        setHighlightedCode(html);
      } catch (error) {
        console.warn('Failed to highlight code:', error);
        setHighlightedCode(`<pre><code>${children}</code></pre>`);
      }
    };

    highlight();
  }, [children, language]);

  return (
    <div
      className="rounded-md overflow-hidden my-2"
      dangerouslySetInnerHTML={{ __html: highlightedCode }}
    />
  );
}

// Inline code component
function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono">
      {children}
    </code>
  );
}

export function TextMessage({ text, isUser }: TextMessageProps) {
  // Check if this is a "thinking" message (empty content or just status indicators)
  const isThinking = !isUser && (!text || text.trim() === '' || text === '⚫︎⚫︎⚫︎');

  if (isThinking) {
    return (
      <div className="flex flex-row gap-2 py-2">
        <div className="px-4 py-3 max-w-[90%] mr-4 text-gray-500 bg-white shadow-sm border rounded-[16px] flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Assistant is thinking...</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={clsx('flex flex-row gap-2', {
        'justify-end py-2': isUser,
      })}
    >
      <div
        className={clsx('rounded-[16px] prose prose-sm max-w-none', {
          'px-4 py-2 max-w-[90%] ml-4 text-stone-900 bg-[#ededed]': isUser,
          'px-4 py-2 max-w-[90%] mr-4 text-black bg-white shadow-sm border': !isUser,
        })}
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            // Custom code block rendering with syntax highlighting
            code: ({ className, children, ...props }: any) => {
              const childrenString = String(children).replace(/\n$/, '');
              const isInline = !className;

              if (isInline) {
                return <InlineCode>{children}</InlineCode>;
              }

              return (
                <CodeBlock className={className}>
                  {childrenString}
                </CodeBlock>
              );
            },

            // Enhanced headings
            h1: ({ children }) => (
              <h1 className="text-xl font-bold mt-4 mb-2 text-gray-900">{children}</h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-lg font-semibold mt-3 mb-2 text-gray-900">{children}</h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-base font-semibold mt-2 mb-1 text-gray-900">{children}</h3>
            ),

            // Enhanced lists
            ul: ({ children }) => (
              <ul className="list-disc list-inside space-y-1 my-2">{children}</ul>
            ),
            ol: ({ children }) => (
              <ol className="list-decimal list-inside space-y-1 my-2">{children}</ol>
            ),
            li: ({ children }) => (
              <li className="text-gray-700">{children}</li>
            ),

            // Enhanced blockquotes
            blockquote: ({ children }) => (
              <blockquote className="border-l-4 border-gray-300 pl-4 italic text-gray-600 my-2">
                {children}
              </blockquote>
            ),

            // Enhanced tables
            table: ({ children }) => (
              <div className="overflow-x-auto my-2">
                <table className="min-w-full border border-gray-200 rounded-md">
                  {children}
                </table>
              </div>
            ),
            thead: ({ children }) => (
              <thead className="bg-gray-50">{children}</thead>
            ),
            th: ({ children }) => (
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 border-b border-gray-200">
                {children}
              </td>
            ),

            // Enhanced links
            a: ({ href, children }) => (
              <a
                href={href}
                className="text-blue-600 hover:text-blue-800 underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                {children}
              </a>
            ),

            // Enhanced paragraphs
            p: ({ children }) => (
              <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
            ),

            // Strong and emphasis
            strong: ({ children }) => (
              <strong className="font-semibold text-gray-900">{children}</strong>
            ),
            em: ({ children }) => (
              <em className="italic text-gray-700">{children}</em>
            ),
          }}
        >
          {text}
        </ReactMarkdown>
      </div>
    </div>
  );
}
