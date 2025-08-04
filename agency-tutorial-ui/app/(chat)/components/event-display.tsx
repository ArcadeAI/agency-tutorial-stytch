import type { AgentInputItem } from '@openai/agents';
import {
  MessageSquare,
  User,
  Bot,
  Settings,
  FunctionSquare,
  CheckCircle,
  XCircle,
  Clock,
  PlayCircle,
  AudioLines,
  Image
} from 'lucide-react';
import { useMemo, useRef, useEffect, useState } from 'react';
import clsx from 'clsx';

export type EventDisplayProps = {
  history: AgentInputItem[];
  highlightedEventId?: string;
};

type EventItemProps = {
  item: AgentInputItem;
  index: number;
  isHighlighted?: boolean;
};

function getEventIcon(item: AgentInputItem) {
  switch (item.type) {
    case 'message':
      switch (item.role) {
        case 'user':
          return <User className="w-4 h-4" />;
        case 'assistant':
          return <Bot className="w-4 h-4" />;
        case 'system':
          return <Settings className="w-4 h-4" />;
        default:
          return <MessageSquare className="w-4 h-4" />;
      }
    case 'function_call':
      return <FunctionSquare className="w-4 h-4" />;
    case 'function_call_result':
      return <CheckCircle className="w-4 h-4" />;
    default:
      return <PlayCircle className="w-4 h-4" />;
  }
}

function getEventColor(item: AgentInputItem) {
  switch (item.type) {
    case 'message':
      switch (item.role) {
        case 'user':
          return 'text-blue-600 bg-blue-50 border-blue-200';
        case 'assistant':
          return 'text-green-600 bg-green-50 border-green-200';
        case 'system':
          return 'text-purple-600 bg-purple-50 border-purple-200';
        default:
          return 'text-gray-600 bg-gray-50 border-gray-200';
      }
    case 'function_call':
      return 'text-orange-600 bg-orange-50 border-orange-200';
    case 'function_call_result':
      return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    default:
      return 'text-slate-600 bg-slate-50 border-slate-200';
  }
}

function getCounterColor(eventType: string) {
  switch (eventType) {
    case 'message':
      return 'bg-indigo-100 text-indigo-700';
    case 'function_call':
      return 'bg-orange-100 text-orange-700';
    case 'function_call_result':
      return 'bg-emerald-100 text-emerald-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

function getEventTitle(item: AgentInputItem) {
  switch (item.type) {
    case 'message':
      return `${item.role.charAt(0).toUpperCase() + item.role.slice(1)} Message`;
    case 'function_call':
      return `Function Call: ${item.name}`;
    case 'function_call_result':
      return `Function Result`;
    default:
      return `Event: ${item.type}`;
  }
}

function renderEventContent(item: AgentInputItem) {
  switch (item.type) {
    case 'message':
      if (typeof item.content === 'string') {
        return (
          <div className="bg-white rounded border p-2">
            <span className="text-xs font-medium text-gray-500">Content:</span>
            <pre className="text-xs mt-1 whitespace-pre-wrap font-mono overflow-x-auto bg-gray-50 p-2 rounded">
              {item.content}
            </pre>
          </div>
        );
      } else {
        return (
          <div className="space-y-2">
            {item.content.map((content, idx) => (
              <div key={idx} className="p-2 bg-white rounded border">
                {content.type === 'input_text' && (
                  <div>
                    <span className="text-xs font-medium text-gray-500">Input Text:</span>
                    <pre className="text-xs mt-1 whitespace-pre-wrap font-mono overflow-x-auto bg-gray-50 p-2 rounded">
                      {content.text}
                    </pre>
                  </div>
                )}
                {content.type === 'output_text' && (
                  <div>
                    <span className="text-xs font-medium text-gray-500">Output Text:</span>
                    <pre className="text-xs mt-1 whitespace-pre-wrap font-mono overflow-x-auto bg-gray-50 p-2 rounded">
                      {content.text}
                    </pre>
                  </div>
                )}
                {content.type === 'audio' && (
                  <div className="flex items-center gap-2">
                    <AudioLines className="w-4 h-4" />
                    <span className="text-xs font-medium text-gray-500">Audio:</span>
                    <pre className="text-xs whitespace-pre-wrap font-mono">
                      {content.transcript || 'No transcript available'}
                    </pre>
                  </div>
                )}
                {content.type === 'image' && (
                  <div className="flex items-center gap-2">
                    <Image className="w-4 h-4" />
                    <span className="text-xs font-medium text-gray-500">Image</span>
                  </div>
                )}
                {content.type === 'refusal' && (
                  <div className="flex items-center gap-2 text-red-600">
                    <XCircle className="w-4 h-4" />
                    <span className="text-xs font-medium">Refusal:</span>
                    <pre className="text-xs whitespace-pre-wrap font-mono">
                      {content.refusal}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      }

    case 'function_call':
      let formattedArgs;
      try {
        const parsedArgs = JSON.parse(item.arguments);
        formattedArgs = JSON.stringify(parsedArgs, null, 2);
      } catch {
        formattedArgs = item.arguments; // Fall back to raw if not valid JSON
      }

      return (
        <div className="space-y-2">
          <div className="text-sm font-medium">Function: {item.name}</div>
          {item.callId && (
            <div className="text-xs text-gray-500">Call ID: {item.callId}</div>
          )}
          <div className="bg-white rounded border p-2">
            <span className="text-xs font-medium text-gray-500">Arguments:</span>
            <pre className="text-xs mt-1 overflow-x-auto whitespace-pre-wrap font-mono bg-gray-50 p-2 rounded">
              {formattedArgs}
            </pre>
          </div>
        </div>
      );

    case 'function_call_result':
      let output;
      if (item.output.type === 'text') {
        // Try to pretty print JSON, fall back to raw text
        try {
          const parsedOutput = JSON.parse(item.output.text);
          output = JSON.stringify(parsedOutput, null, 2);
        } catch {
          output = item.output.text; // Keep as raw text if not valid JSON
        }
      } else if (item.output.type === 'image') {
        output = `[Image data: ${item.output.data?.length || 0} characters]`;
      } else {
        output = String(item.output);
      }

      return (
        <div className="space-y-2">
          {item.callId && (
            <div className="text-xs text-gray-500">Call ID: {item.callId}</div>
          )}
          <div className="bg-white rounded border p-2">
            <span className="text-xs font-medium text-gray-500">
              Output ({item.output.type}):
            </span>
            <pre className="text-xs mt-1 overflow-x-auto whitespace-pre-wrap font-mono bg-gray-50 p-2 rounded">
              {output}
            </pre>
          </div>
        </div>
      );

    default:
      return (
        <div className="bg-white rounded border p-2">
          <pre className="text-xs overflow-x-auto">
            {JSON.stringify(item, null, 2)}
          </pre>
        </div>
      );
  }
}

function EventItem({ item, index, isHighlighted }: EventItemProps) {
  const icon = getEventIcon(item);
  const colorClasses = getEventColor(item);
  const title = getEventTitle(item);

    return (
    <div
      id={`event-${item.id || (item.type === 'function_call' || item.type === 'function_call_result' ? item.callId : null) || index}`}
      data-event-id={item.id}
      data-call-id={item.type === 'function_call' || item.type === 'function_call_result' ? item.callId : undefined}
      data-index={index}
      className={clsx(
        'border rounded-lg p-3 mb-3 transition-all duration-500 hover:shadow-sm',
        colorClasses,
        {
          'ring-2 ring-blue-400 ring-opacity-75 shadow-lg scale-[1.02]': isHighlighted,
        }
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="flex-shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium truncate">{title}</h3>
          {item.id && (
            <p className="text-xs opacity-70">ID: {item.id}</p>
          )}
        </div>
        <div className="text-xs opacity-70">
          #{index + 1}
        </div>
      </div>

      <div className="mt-2">
        {renderEventContent(item)}
      </div>
    </div>
  );
}

export function EventDisplay({ history, highlightedEventId }: EventDisplayProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [userHasScrolled, setUserHasScrolled] = useState(false);
  const previousHistoryLength = useRef(history.length);

  const eventCount = useMemo(() => {
    const counts = history.reduce((acc, item) => {
      const type = item.type || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return counts;
  }, [history]);

  // Track user scrolling to disable auto-scroll
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isAtBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 5;

      // If user scrolled away from bottom, disable auto-scroll
      if (!isAtBottom) {
        setUserHasScrolled(true);
      } else {
        setUserHasScrolled(false);
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-scroll to bottom only when new events arrive and user hasn't manually scrolled
  useEffect(() => {
    const historyLengthChanged = history.length !== previousHistoryLength.current;
    previousHistoryLength.current = history.length;

    if (
      scrollContainerRef.current &&
      historyLengthChanged &&
      !userHasScrolled &&
      !highlightedEventId
    ) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [history.length, userHasScrolled, highlightedEventId]);

    // Scroll to highlighted event (takes priority over auto-scroll)
  useEffect(() => {
    if (highlightedEventId) {
      // Reset user scroll state when highlighting
      setUserHasScrolled(false);

      // Find the function_call event specifically (we want this at the top, not the result)
      let targetElement: HTMLElement | null = null;

      // First, try to find the function_call event with matching callId
      const elements = document.querySelectorAll('[data-call-id]');
      for (const el of elements) {
        const htmlEl = el as HTMLElement;
        if (htmlEl.dataset.callId === highlightedEventId) {
          // Check if this is a function_call (we prefer this over function_call_result)
          const eventText = htmlEl.textContent || '';
          if (eventText.includes('Function Call:')) {
            targetElement = htmlEl;
            break;
          } else if (!targetElement) {
            // If we haven't found a function_call yet, save this as fallback
            targetElement = htmlEl;
          }
        }
      }

      // If no callId match, try other strategies
      if (!targetElement) {
        // Strategy 1: Try direct ID match
        targetElement = document.getElementById(`event-${highlightedEventId}`);

        // Strategy 2: Search by other data attributes
        if (!targetElement) {
          const allElements = document.querySelectorAll('[data-event-id], [data-index]');
          for (const el of allElements) {
            const htmlEl = el as HTMLElement;
            if (
              htmlEl.dataset.eventId === highlightedEventId ||
              htmlEl.dataset.index === highlightedEventId
            ) {
              targetElement = htmlEl;
              break;
            }
          }
        }
      }

      if (targetElement) {
        targetElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    }
  }, [highlightedEventId]);

  return (
    <div className="h-full flex flex-col">
      {/* Header with event summary */}
      <div className="flex-shrink-0 p-4 border-b bg-white rounded-t-lg">
        <h2 className="text-lg font-semibold mb-2">Chat Event History</h2>
        <div className="flex flex-wrap gap-2 text-xs">
          {Object.entries(eventCount).map(([type, count]) => (
            <span
              key={type}
              className={`px-2 py-1 rounded-md font-medium ${getCounterColor(type)}`}
            >
              {type.replace('_', ' ')}: {count}
            </span>
          ))}
          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-md font-medium">
            Total: {history.length}
          </span>
        </div>
      </div>

      {/* Event list */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-0"
      >
        {history.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No events yet</p>
          </div>
                ) : (
          history.map((item, index) => {
            // Check if this event should be highlighted
            // Match by ID, callId (for function calls), or index
            const isHighlighted = highlightedEventId && (
              highlightedEventId === item.id ||
              (item.type === 'function_call' || item.type === 'function_call_result' ?
                highlightedEventId === item.callId : false) ||
              highlightedEventId === index.toString()
            );

            return (
              <EventItem
                key={item.id || index}
                item={item}
                index={index}
                isHighlighted={Boolean(isHighlighted)}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
