import type { RunToolApprovalItem } from "@openai/agents";
import { Button } from "./ui/button";
import { useEffect, useState } from "react";
import { Shield, Check, X, AlertTriangle } from "lucide-react";
import clsx from "clsx";

type Item = ReturnType<RunToolApprovalItem["toJSON"]>;

// Inline approval message component for chat
export function InlineApprovalMessage({
    approval,
    onApprove,
    onReject,
    decision,
    disabled = false,
}: {
    approval: Item;
    onApprove: () => void;
    onReject: () => void;
    decision: "approved" | "rejected" | undefined;
    disabled?: boolean;
}) {
    if (approval.rawItem?.type !== "function_call") {
        return null;
    }

    const isDecided = decision !== undefined;

        return (
        <div className="w-full py-3">
            <div className={clsx(
                "w-full px-4 py-4 rounded-lg border transition-all duration-200",
                {
                    "bg-amber-50 border-amber-300 text-amber-900": !isDecided,
                    "bg-emerald-50 border-emerald-300 text-emerald-900": decision === "approved",
                    "bg-rose-50 border-rose-300 text-rose-900": decision === "rejected",
                }
            )}>
                <div className="flex items-center gap-3 mb-3">
                    <div className={clsx("flex-shrink-0 p-2 rounded-full", {
                        "bg-amber-200": !isDecided,
                        "bg-emerald-200": decision === "approved",
                        "bg-rose-200": decision === "rejected",
                    })}>
                        {!isDecided && <AlertTriangle className="w-5 h-5 text-amber-700" />}
                        {decision === "approved" && <Check className="w-5 h-5 text-emerald-700" />}
                        {decision === "rejected" && <X className="w-5 h-5 text-rose-700" />}
                    </div>
                    <div className="flex items-center gap-2">
                        <Shield className="w-5 h-5" />
                        <span className="text-lg font-semibold">
                            {!isDecided ? "Tool Approval Required" :
                             decision === "approved" ? "Tool Approved" : "Tool Rejected"}
                        </span>
                    </div>
                </div>

                <div className="mb-4 bg-white bg-opacity-50 rounded-md p-3">
                    <div className="text-sm font-medium mb-2 text-gray-700">
                        Tool: <code className="bg-gray-200 text-gray-800 px-2 py-1 rounded text-sm font-mono">
                            {approval.rawItem?.name}
                        </code>
                    </div>
                    <details className="text-sm">
                        <summary className="cursor-pointer hover:opacity-75 mb-2 font-medium text-gray-600">
                            View Arguments →
                        </summary>
                        <pre className="bg-gray-100 text-gray-800 p-3 rounded text-xs overflow-x-auto font-mono border">
                            {JSON.stringify(JSON.parse(approval.rawItem?.arguments || "{}"), null, 2)}
                        </pre>
                    </details>
                </div>

                {!isDecided && (
                    <div className="flex gap-3">
                        <button
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white font-medium rounded-md hover:bg-emerald-700 transition-colors shadow-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
                            onClick={onApprove}
                            disabled={disabled}
                        >
                            <Check className="w-4 h-4" />
                            Approve Tool
                        </button>
                        <button
                            className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white font-medium rounded-md hover:bg-rose-700 transition-colors shadow-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
                            onClick={onReject}
                            disabled={disabled}
                        >
                            <X className="w-4 h-4" />
                            Reject Tool
                        </button>
                    </div>
                )}

                {decision === "approved" && (
                    <div className="flex items-center gap-2 text-emerald-800 font-medium">
                        <Check className="w-4 h-4" />
                        You approved this tool call
                    </div>
                )}

                {decision === "rejected" && (
                    <div className="flex items-center gap-2 text-rose-800 font-medium">
                        <X className="w-4 h-4" />
                        You rejected this tool call
                    </div>
                )}
            </div>
        </div>
    );
}

/**
 * New inline approvals component that renders approval messages in the chat
 * and automatically proceeds when all decisions are made
 */
export function InlineApprovals({
    approvals,
    onDone,
    isProcessing = false,
}: {
    approvals: ReturnType<RunToolApprovalItem["toJSON"]>[];
    onDone: (decisions: Map<string, "approved" | "rejected">) => void;
    isProcessing?: boolean;
}) {
    const [decisions, setDecisions] = useState<
        Map<string, "approved" | "rejected">
    >(new Map());

    useEffect(() => {
        setDecisions(new Map());
    }, [approvals]);

    // Auto-proceed when all decisions are made
    useEffect(() => {
        if (approvals.length > 0 && decisions.size === approvals.length && !isProcessing) {
            // Small delay to show the final decision
            const timer = setTimeout(() => {
                onDone(decisions);
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [decisions, approvals.length, isProcessing]); // Added isProcessing to prevent multiple calls

    function handleApprove(approval: Item) {
        if (approval.rawItem?.type !== "function_call") return;

        setDecisions((prev) => {
            const newDecisions = new Map(prev);
            const callId = approval.rawItem?.type === "function_call" ? approval.rawItem.callId : "";
            newDecisions.set(callId ?? "", "approved");
            return newDecisions;
        });
    }

    function handleReject(approval: Item) {
        if (approval.rawItem?.type !== "function_call") return;

        setDecisions((prev) => {
            const newDecisions = new Map(prev);
            const callId = approval.rawItem?.type === "function_call" ? approval.rawItem.callId : "";
            newDecisions.set(callId ?? "", "rejected");
            return newDecisions;
        });
    }

    if (approvals.length === 0) {
        return null;
    }

    return (
        <div className="space-y-2">
            {approvals.map((approval, index) =>
                approval.rawItem?.type === "function_call" ? (
                    <InlineApprovalMessage
                        key={approval.rawItem?.callId || approval.rawItem?.id || index}
                        approval={approval}
                        decision={decisions.get(
                            approval.rawItem?.type === "function_call" ? approval.rawItem.callId ?? "" : ""
                        )}
                        onApprove={() => handleApprove(approval)}
                        onReject={() => handleReject(approval)}
                        disabled={isProcessing}
                    />
                ) : null
            )}
        </div>
    );
}

// Keep the old component name for backward compatibility but make it use the new inline version
export function Approvals(props: {
    approvals: ReturnType<RunToolApprovalItem["toJSON"]>[];
    onDone: (decisions: Map<string, "approved" | "rejected">) => void;
}) {
    return <InlineApprovals {...props} />;
}
