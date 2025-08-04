// Part 1: A simple chatbot
"use strict";
import { Agent, run, type AgentInputItem, user, assistant } from "@openai/agents";
import chalk from "chalk";
import readline from "node:readline/promises";
import { display } from "./common/display";


const chatbot = new Agent({
    name: "chatbot",
    model: "gpt-4o",
    instructions: `
    You are a helpful assistant that can help with everyday tasks.
    `,
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
