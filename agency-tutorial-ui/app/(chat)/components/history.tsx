import type { AgentInputItem, RunToolApprovalItem } from '@openai/agents';
import { TextMessage } from './messages/text-message';
import { InlineApprovals } from './approvals';
import { useMemo } from 'react';
import { FunctionSquare, Clock, CheckCircle } from 'lucide-react';
import clsx from 'clsx';

export type HistoryProps = {
  history: AgentInputItem[];
  approvals?: ReturnType<RunToolApprovalItem['toJSON']>[];
  onEventClick?: (eventId: string) => void;
  onApprovalDone?: (decisions: Map<string, "approved" | "rejected">) => void;
  isProcessing?: boolean;
};

export type ProcessedMessageItem = {
  type: 'message';
  role: 'user' | 'assistant';
  content: string;
  id: string;
};

export type ProcessedFunctionCallItem = {
  type: 'function_call';
  name: string;
  id: string;
  callId: string;
  status: 'completed' | 'in_progress';
};

type ProcessedItem = ProcessedMessageItem | ProcessedFunctionCallItem;

function processItems(items: AgentInputItem[]): ProcessedItem[] {
  const processedItems: ProcessedItem[] = [];

  for (const item of items) {
    if (item.type === 'function_call') {
      processedItems.push({
        type: 'function_call',
        name: item.name,
        id: item.id ?? '',
        callId: item.callId ?? '',
        status: 'in_progress',
      });
    }

    if (item.type === 'function_call_result') {
      const index = processedItems.findIndex(
        (i) => i.type === 'function_call' && item.callId === i.callId,
      );

      if (index !== -1 && processedItems[index].type === 'function_call') {
        processedItems[index].status = 'completed';
      }
    }

    if (item.type === 'message') {
      processedItems.push({
        type: 'message',
        role: item.role === 'system' ? 'assistant' : item.role,
        content:
          typeof item.content === 'string'
            ? item.content
            : item.content
                .map((content) => {
                  if (
                    content.type === 'input_text' ||
                    content.type === 'output_text'
                  ) {
                    return content.text;
                  }
                  if (content.type === 'audio') {
                    return content.transcript ?? '⚫︎⚫︎⚫︎';
                  }
                  if (content.type === 'refusal') {
                    return content.refusal;
                  }
                  return '';
                })
                .join('\n') || '⚫︎⚫︎⚫︎',
        id: item.id ?? '',
      });
    }
  }

  return processedItems;
}

// Simple clickable function call component
function SimpleFunctionCall({
  item,
  onClick
}: {
  item: ProcessedFunctionCallItem;
  onClick?: (eventId: string) => void;
}) {
  return (
    <div
      className={clsx(
        'flex items-center gap-2 py-2 px-3 my-1 rounded-lg cursor-pointer transition-all duration-200',
        'bg-orange-50 border border-orange-200 hover:bg-orange-100 hover:shadow-sm text-orange-700'
      )}
      onClick={() => onClick?.(item.callId || item.id)}
    >
      <div className="flex-shrink-0">
        {item.status === 'completed' ? (
          <CheckCircle className="w-4 h-4" />
        ) : (
          <Clock className="w-4 h-4 animate-pulse" />
        )}
      </div>
      <FunctionSquare className="w-4 h-4" />
      <span className="text-sm font-medium">
        Tool call: {item.name}
      </span>
      {item.status === 'in_progress' && (
        <span className="text-xs opacity-70">(running...)</span>
      )}
    </div>
  );
}

export function History({ history, approvals = [], onEventClick, onApprovalDone, isProcessing = false }: HistoryProps) {
  const processedItems = useMemo(() => processItems(history), [history]);

  return (
    <div
      className="p-4 space-y-4"
      id="chatHistory"
    >
      {processedItems.map((item, idx) => {
        if (item.type === 'function_call') {
          return (
            <SimpleFunctionCall
              key={item.id || idx}
              item={item}
              onClick={onEventClick}
            />
          );
        }

        if (item.type === 'message') {
          return (
            <TextMessage
              text={item.content}
              isUser={item.role === 'user'}
              key={item.id || idx}
            />
          );
        }

        return null;
      })}

            {/* Render approval requests inline in the chat */}
      {approvals.length > 0 && onApprovalDone && (
        <InlineApprovals
          approvals={approvals}
          onDone={onApprovalDone}
          isProcessing={isProcessing}
        />
      )}
    </div>
  );
}
