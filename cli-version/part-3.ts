// Part 3: Adding human-in-the-loop confirmations to a tool
"use strict";
import Arcade from "@arcadeai/arcadejs";
import { getTools } from "./common/tools";
import { Agent, run, type AgentInputItem, user, assistant } from "@openai/agents";
import chalk from "chalk";
import { confirm } from "./common/utils";
import ora from "ora";
import readline from "node:readline/promises";
import { display } from "./common/display";

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
    let previousHistoryLength = 0;

    console.log(
        chalk.green("Welcome to the chatbot! Type 'exit' to quit.")
    );
    while (true) {
        rl.resume();
        const input = await rl.question("> ");
        if (input.toLowerCase() === "exit") {
            break;
        }
        rl.pause();

        history.push(user(input));
        previousHistoryLength = history.length;

        let response = await run(chatbot, history, { maxTurns: 5 });

        history = response.history;
        display(history, previousHistoryLength);
        previousHistoryLength = history.length;

        while (response.interruptions?.length > 0) {
            console.log(
                chalk.red(
                    "Human-in-the-loop: approval required for the following events:"
                )
            );
            const state = response.state;
            rl.resume();
            for (const interruption of response.interruptions) {
                const ok = await confirm(
                    chalk.red(`Agent ${interruption.agent.name} would like to use the tool ${interruption.rawItem.name} with "${interruption.rawItem.arguments}" Do you approve?`),
                    rl
                );
                if (ok) {
                    state.approve(interruption);
                } else {
                    state.reject(interruption);
                }
            }
            rl.pause();

            response = await run(chatbot, state, { maxTurns: 5 });

            history = response.history;
            display(history, previousHistoryLength);
            previousHistoryLength = history.length;

        }
    }
    console.log(chalk.red("👋 Bye..."));
    process.exit(0);
}

main().catch((err) => console.error(err));
