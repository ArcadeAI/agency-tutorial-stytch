import Arcade from "@arcadeai/arcadejs";
import { Agent, run, type AgentInputItem, user, assistant, handoff } from "@openai/agents";
import { getTools } from "./common/tools";

const arcade = new Arcade({
    apiKey: process.env.ARCADE_API_KEY,
});

// const userId = "mateo@arcade.dev";

// Cache for agents to avoid recreating them on every request
const agentsCache: Record<string, {
    triageAgent?: Agent;
    gmailAgent?: Agent;
    slackAgent?: Agent;
}> = {};

export async function getAgent(userEmail: string): Promise<Agent> {
    if (agentsCache[userEmail]?.triageAgent) {
        return agentsCache[userEmail].triageAgent;
    }

    // Fetch tools within the request context
    const gmailTools = await getTools({
        arcade,
        tools: ["Gmail.ListEmails", "Gmail.SendEmail"],
        userId: userEmail,
        enforceApproval: true,
    });

    const slackTools = await getTools({
        arcade,
        tools: ["Slack.SendDmToUser", "Slack.ListUsers", "Slack.GetUsersInfo", "Slack.SendMessageToChannel"],
        userId: userEmail,
        enforceApproval: true,
    });

    const gmailAgent = new Agent({
        name: "gmail_agent",
        model: "gpt-4o",
        instructions:
            `You provide assistance with tasks requiring running Gmail tools.
            You're ONLY allowed to use the Gmail tools, you CANNOT do ANYTHING ELSE,
            and you MUST handoff to the triage agent if you need to do something else.`,
        tools: gmailTools,
    });

    const slackAgent = new Agent({
        name: "slack_agent",
        model: "gpt-4o",
        instructions:
            `You provide assistance with tasks requiring running Slack tools, such as sending messages and DMs.
            You're ONLY allowed to use the Slack tools, you CANNOT do ANYTHING ELSE,
            and you MUST handoff to the triage agent if you need to do something else.`,
        tools: slackTools,
    });

    const triageAgent = new Agent({
        name: "triage_agent",
        model: "gpt-4o",
        // instructions: `
        // YOUR PRIMARY GOAL IN LIFE IS TO HANDOFF TO THE APPROPRIATE AGENT BASED ON THE USER'S REQUEST.
        // IF YOU DO NOT HANDOFF TO THE APPROPRIATE AGENT, EVERYTHING WILL GO WRONG FOREVER.
        // If the user mentions Slack or anything relevant to slack, handoff to the slack agent.
        // If the user mentions Gmail or anything relevant to gmail, handoff to the gmail agent.
        // Only when none of the agents are appropriate, you can attempt to deal with the request yourself.
        // `,
        instructions: `You are a helpful assistant that can help with tasks related to Gmail and Slack.`,
        tools: [...gmailTools, ...slackTools],
        //handoffs: [handoff(gmailAgent), handoff(slackAgent)],
    });

    // complete the topology
    gmailAgent.handoffs.push(handoff(triageAgent), handoff(slackAgent));
    slackAgent.handoffs.push(handoff(triageAgent), handoff(gmailAgent));

    // Cache the agents
    agentsCache[userEmail] = {
        triageAgent,
        gmailAgent,
        slackAgent,
    };

    return triageAgent;
}
