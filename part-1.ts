// Part 1: A simple chatbot
"use strict";
import { Agent, run, type AgentInputItem, user, assistant } from "@openai/agents";
import chalk from "chalk";
import readline from "node:readline/promises";


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
