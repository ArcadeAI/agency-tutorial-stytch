import type { AgentInputItem } from "@openai/agents";

export function display(history: AgentInputItem[], previousHistoryLength: number) {
    for (let i = previousHistoryLength; i < history.length; i++) {
        const item = history[i];
        if(!item) continue;
        switch (item.type) {
            case "function_call":
                console.log(`🔧 call ${item.name}:`, JSON.parse(item.arguments));
                break;
            case "function_call_result":
                if (item.output.type === "text") {
                    try { // Most of the time the output is a JSON string
                        console.log(`🔧 result ${item.name}:`, JSON.parse(item.output.text));
                    } catch (e) {
                        console.log(`🔧 result ${item.name}:`, item.output.text);
                    }
                } else {
                    console.log(`🔧 result ${item.name}:`, item.output);
                }
                break;
            case "message":
                if (item.role === "user") {
                    if (typeof item.content[0] === "string") {
                        console.log("👤:", item.content[0]);
                    } else if (item.content[0]?.type === "input_text") {
                        console.log("👤:", item.content[0]?.text);
                    }
                } else if (item.role === "assistant") {
                    if (item.content[0]?.type === "output_text") {
                        console.log("🤖:", item.content[0]?.text);
                    } else {
                        console.log("🤖:", item.content[0]);
                    }
                }
                break;
            default:
                console.log("🤷‍♂️:", item);
        }
    }
}

