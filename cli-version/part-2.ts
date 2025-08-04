// Part 2: Adding tools to the chatbot
"use strict";
import Arcade from "@arcadeai/arcadejs";
import { getTools } from "./common/tools";
import { Agent, run, type AgentInputItem, user, assistant } from "@openai/agents";
import chalk from "chalk";
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
const tools = await getTools({ arcade, toolkits: ["Gmail"], userId: userId });
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

        let response = await run(chatbot, history, { stream: false, maxTurns: 5 });

        history = response.history;
        display(history, previousHistoryLength);
        previousHistoryLength = history.length;

    }
    console.log(chalk.red("👋 Bye..."));
    process.exit(0);
}

main().catch((err) => console.error(err));
