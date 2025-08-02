"use client";

import { useState } from "react"

import { AgentInputItem, RunToolApprovalItem, user } from "@openai/agents"
import { History } from "./components/history"
import { Approvals } from "./components/approvals";


type ChatEvent = {
    type: string
    message: string
}

export default function ChatPage() {
    const [messages, setMessages] = useState<AgentInputItem[]>([]);
    const [events, setEvents] = useState<ChatEvent[]>([]);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [approvals, setApprovals] = useState<ReturnType<RunToolApprovalItem['toJSON']>[]>([]);


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

    return <div className="w-full h-svh grid grid-cols-1 md:grid-cols-2 p-20">
        <div className="flex flex-col">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <History history={messages} />
                {/* {messages.map((message, index) => (
                    <Bubble key={index} message={message} />
                ))} */}
            </div>
            <form className="w-full flex gap-4" onSubmit={handleSubmit}>
                <textarea
                    className="w-full"
                    rows={3}
                    name="message"
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message... (Press Enter to send, Shift+Enter for new line)"
                />
                <button className="bg-blue-500 text-white p-2 rounded-md" type="submit">Send</button>
            </form>
            <Approvals approvals={approvals} onDone={handleDone} />

        </div>
        <div className="flex flex-col">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="text-sm text-gray-500">
                    <p>Assistant Events</p>
                </div>
                <div className="flex gap-4">
                    {events.map((event, index) => (
                        <div key={index}><span>{event.type}</span><span>{event.message}</span></div>
                    ))}
                </div>
            </div>
        </div>
    </div>
}
