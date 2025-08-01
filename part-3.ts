// Part 3: Adding human-in-the-loop confirmations to a tool
"use strict";
import Arcade from "@arcadeai/arcadejs";
import { getTools } from "./common/config";
import { Agent, run, type AgentInputItem, user, assistant } from "@openai/agents";
import chalk from "chalk";
import { confirm } from "./common/utils";
import ora from "ora";
import readline from "node:readline/promises";

const spinner = ora({
    discardStdin: false,
    text: "Loading tools...",
    spinner: "dots",
});

const arcade = new Arcade({
    apiKey: process.env.ARCADE_API_KEY,
    baseURL: process.env.ARCADE_BASE_URL,
});

const userId = "mateo@arcade.dev";

spinner.start();
const tools = await getTools({ arcade, toolkits: ["Gmail"], userId: userId, enforceApproval: true });
spinner.succeed(`${tools.length} tools loaded`);

const chatbot = new Agent({
    name: "chatbot",
    model: "gpt-4o",
    instructions: `
    You are a helpful assistant that can help with everyday tasks.
    You can use the following tools to help you:
    ${tools.map(tool => `- ${tool.name}`).join("\n")}
    `,
    tools: tools,
});



async function main() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    // The history of the conversation, without this the chatbot will not be able to
    // remember the conversation.
    let history: AgentInputItem[] = [];

    console.log(
        chalk.green("Welcome to the chatbot! Type 'exit' to quit.")
    );
    while (true) {
        const input = await rl.question("> ");
        if (input.toLowerCase() === "exit") {
            break;
        }
        rl.pause();
        history.push(user(input));
        let stream = await run(chatbot, history, { stream: true, maxTurns: 5 });
        stream
            .toTextStream({ compatibleWithNodeStreams: true })
            .pipe(process.stdout);
        await stream.completed;
        rl.resume();

        while (stream.interruptions?.length) {
            console.log(
                chalk.red(
                    "Human-in-the-loop: approval required for the following tool calls:"
                )
            );
            const state = stream.state;
            for (const interruption of stream.interruptions) {
                const ok = await confirm(
                    chalk.red(`Agent ${interruption.agent.name} would like to use the tool ${interruption.rawItem.name} with "${interruption.rawItem.arguments}". Do you approve?`),
                    rl
                );
                if (ok) {
                    state.approve(interruption);
                } else {
                    state.reject(interruption);
                }
            }
            rl.pause();
            stream = await run(chatbot, state, { stream: true, maxTurns: 5 });
            stream
                .toTextStream({ compatibleWithNodeStreams: true })
                .pipe(process.stdout);
            await stream.completed;

            rl.resume();
        }
        if (stream.finalOutput) {
            history.push(assistant(stream.finalOutput));
        }
        // Print a newline to separate the output from the next prompt
        console.log("\n");
        rl.resume();
    }
    console.log(chalk.red("👋 Bye..."));
    process.exit(0);
}

main().catch((err) => console.error(err));
