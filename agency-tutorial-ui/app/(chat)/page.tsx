"use client";

import { useState, useRef, useEffect } from "react"

import { AgentInputItem, RunToolApprovalItem, user } from "@openai/agents"
import { History } from "./components/history"
import { Approvals } from "./components/approvals";
import { EventDisplay } from "./components/event-display";


type ChatEvent = {
    type: string
    message: string
}

export default function ChatPage() {
    const [messages, setMessages] = useState<AgentInputItem[]>([]);
    const [events, setEvents] = useState<ChatEvent[]>([]);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [approvals, setApprovals] = useState<ReturnType<RunToolApprovalItem['toJSON']>[]>([]);
    const [highlightedEventId, setHighlightedEventId] = useState<string | undefined>();
    const chatScrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll chat to bottom when new messages arrive
    useEffect(() => {
        if (chatScrollRef.current) {
            chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
        }
    }, [messages]);

    // Clear highlight after 3 seconds
    useEffect(() => {
        if (highlightedEventId) {
            const timer = setTimeout(() => {
                setHighlightedEventId(undefined);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [highlightedEventId]);

    // Handle clicking on function calls in history
    const handleEventClick = (eventId: string) => {
        setHighlightedEventId(eventId);
    };


    async function makeRequest({
        message,
        decisions,
    }: {
        message?: string;
        decisions?: Map<string, "approved" | "rejected">;
    }) {
        const history = [...messages];

        if (message) {
            history.push(user(message));
        }

        setMessages([
            ...history,
            // This is just a placeholder to show on the UI to show the agent is working
            {
                type: "message",
                role: "assistant",
                content: [],
                status: "in_progress",
            },
        ]);

        // We will send the messages to the API route along with the conversation ID if we have one
        // and the decisions if we had any approvals in this turn
        const response = await fetch("/api/chat", {
            method: "POST",
            body: JSON.stringify({
                messages: history,
                conversationId,
                decisions: Object.fromEntries(decisions ?? []),
            }),
        });

        const data = await response.json();

        console.log("data", data);

        if (data.conversationId) {
            setConversationId(data.conversationId);
        }

        if (data.history) {
            setMessages(data.history);
        }

        if (data.approvals) {
            setApprovals(data.approvals);
        } else {
            setApprovals([]);
        }
    }

      const handleSend = async (message: string) => {
        await makeRequest({ message });
      };

      async function handleDone(decisions: Map<string, 'approved' | 'rejected'>) {
        await makeRequest({ decisions });
      }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);
        const message = formData.get("message") as string;

        // Clear the textarea
        const textarea = (e.target as HTMLFormElement).elements.namedItem("message") as HTMLTextAreaElement;
        textarea.value = "";

        if (!message.trim()) {
            return;
        }
        await handleSend(message);
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            const form = e.currentTarget.form
            if (form) {
                form.requestSubmit()
            }
        }
    }

    return <div className="fixed inset-0 flex flex-col p-4">
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 min-h-0">
            {/* Chat Column */}
            <div className="flex flex-col bg-gray-50 rounded-lg min-h-0">
                {/* Chat Messages - Scrollable */}
                <div ref={chatScrollRef} className="flex-1 overflow-y-auto min-h-0">
                    <History history={messages} onEventClick={handleEventClick} />
                </div>

                {/* Chat Form - Fixed at bottom */}
                <div className="flex-shrink-0 p-4 bg-white border-t rounded-b-lg">
                    <form className="w-full flex gap-4" onSubmit={handleSubmit}>
                        <textarea
                            className="flex-1 p-2 border rounded-md resize-none"
                            rows={3}
                            name="message"
                            onKeyDown={handleKeyDown}
                            placeholder="Type a message... (Press Enter to send, Shift+Enter for new line)"
                        />
                        <button className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors" type="submit">
                            Send
                        </button>
                    </form>
                    <Approvals approvals={approvals} onDone={handleDone} />
                </div>
            </div>

            {/* Events Column */}
            <div className="flex flex-col bg-gray-50 rounded-lg overflow-hidden min-h-0">
                <EventDisplay history={messages} highlightedEventId={highlightedEventId} />
            </div>
        </div>
    </div>
}
