import Arcade from "@arcadeai/arcadejs";
import { Agent, run, type AgentInputItem, user, assistant, handoff } from "@openai/agents";
import { RECOMMENDED_PROMPT_PREFIX } from '@openai/agents-core/extensions';
import { getTools } from "./common/tools";
import { confirm } from "./common/utils";
import chalk from "chalk";
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
const gmailTools = await getTools({
    arcade,
    tools: ["Gmail.ListEmails", "Gmail.SendEmail"],
    userId: userId,
    enforceApproval: true,
});
const slackTools = await getTools({
    arcade,
    tools: ["Slack.SendDmToUser", "Slack.ListUsers", "Slack.GetUsersInfo", "Slack.SendMessageToChannel"],
    userId: userId,
    enforceApproval: true,
});
spinner.succeed(`${gmailTools.length + slackTools.length} tools loaded`);


const gmailAgent = new Agent({
    name: "gmail_agent",
    model: "gpt-4o",
    instructions:
        `${RECOMMENDED_PROMPT_PREFIX}
        You provide assistance with tasks requiring running Gmail tools.
        You're ONLY allowed to use the Gmail tools, you CANNOT do ANYTHING ELSE,
        and you MUST handoff to the triage agent if you need to do something else.`,
    tools: gmailTools,
});

const slackAgent = new Agent({
    name: "slack_agent",
    model: "gpt-4o",
    instructions:
        `${RECOMMENDED_PROMPT_PREFIX}
        You provide assistance with tasks requiring running Slack tools, such as sending messages and DMs.
        You're ONLY allowed to use the Slack tools, you CANNOT do ANYTHING ELSE,
        and you MUST handoff to the triage agent if you need to do something else.`,
    tools: slackTools,
});

const triageAgent = new Agent({
    name: "triage_agent",
    model: "gpt-4o",
    instructions: `
    ${RECOMMENDED_PROMPT_PREFIX}

    YOUR PRIMARY GOAL IN LIFE IS TO HANDOFF TO THE APPROPRIATE AGENT BASED ON THE USER'S REQUEST.
    IF YOU DO NOT HANDOFF TO THE APPROPRIATE AGENT, EVERYTHING WILL GO WRONG FOREVER.
    If the user mentions Slack or anything relevant to slack, handoff to the slack agent.
    If the user mentions Gmail or anything relevant to gmail, handoff to the gmail agent.
    Only when none of the agents are appropriate, you can attempt to deal with the request yourself.
    `,
    handoffs: [handoff(gmailAgent), handoff(slackAgent)],
});

// complete the topology
gmailAgent.handoffs.push(handoff(triageAgent), handoff(slackAgent));
slackAgent.handoffs.push(handoff(triageAgent), handoff(gmailAgent));

async function main() {
    // TODO(Mateo): figure out if recreating the interface is the best way
    // to handle this instead of starting and pausing
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    let history: AgentInputItem[] = [];

    console.log(
        chalk.green("Welcome to the Slack/Gmail Agent! Type 'exit' to quit.")
    );
    while (true) {
        const input = await rl.question("> ");
        if (input.toLowerCase() === "exit") {
            break;
        }
        rl.pause();
        history.push(user(input));
        console.log(chalk.blue("Running..."));
        let stream = await run(triageAgent, history, { stream: true, maxTurns: 10 });
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
            stream = await run(triageAgent, state, { stream: true, maxTurns: 10 });
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
    }
    console.log(chalk.red("👋 Bye..."));
    process.exit(0);
}

main().catch((err) => console.error(err));
