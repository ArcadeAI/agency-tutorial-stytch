import { Arcade } from "@arcadeai/arcadejs";
import { toZod, executeOrAuthorizeZodTool, type ZodTool, type ToolExecuteFunction, executeZodTool, type ToolAuthorizationResponse, isAuthorizationRequiredError, type ToolExecuteFunctionFactoryInput } from "@arcadeai/arcadejs/lib";
import type { ExecuteToolResponse, ToolDefinition } from "@arcadeai/arcadejs/resources/tools/tools";
import { setDefaultOpenAIClient, tool } from "@openai/agents";
import OpenAI from "openai";

type GetToolsProps = {
    arcade: Arcade;
    toolkits?: string[];
    tools?: string[];
    userId: string;
    limit?: number;
    enforceApproval?: boolean;
}


// In general, retrieval tools are safe to run without approval.
// However, some tools are sensitive and should be approved by a human.
// This is a list of tools that should be approved by a human because they
// may result in a "side effect" like sending an email or message to the wro
const TOOLS_WITH_APPROVAL = [
    "Gmail_SendEmail",
    "Gmail_SendDraftEmail",
    "Gmail_TrashEmail",
    "Slack_SendDmToUser",
    "Slack_SendMessageToChannel",
    "Slack_SendMessage",
];


export async function getTools({
    arcade,
    toolkits = [],
    tools = [],
    userId,
    limit = 30,
    enforceApproval = false,
}: GetToolsProps) {

    if (toolkits.length === 0 && tools.length === 0) {
        throw new Error("At least one tool or toolkit must be provided");
    }

    // Todo(Mateo): Add pagination support
    const from_toolkits = await Promise.all(toolkits.map(async (tkitName) => {
        const definitions = await arcade.tools.list({
            toolkit: tkitName,
            limit: limit
        });
        return definitions.items;
    }));

    const from_tools = await Promise.all(tools.map(async (toolName) => {
        return await arcade.tools.get(toolName);
    }));

    const all_tools = [...from_toolkits.flat(), ...from_tools];
    const unique_tools = Array.from(
        new Map(all_tools.map(tool => [tool.qualified_name, tool])).values()
    );

    const toolWithApproval = (zodTool: ZodTool<any>) => {
        // If the tool is in the list of tools that need approval, we need to
        // indicate that the tool needs approval. This will trigger an interrupt,
        // and we can approve or reject the tool call from the chatbot loop.
        return tool({
            ...zodTool,
            needsApproval: async (_ctx, _input) => {
                return TOOLS_WITH_APPROVAL.includes(zodTool.name);
            },
        });
    };

    return toZod({
        tools: unique_tools,
        client: arcade,
        userId: userId,
        executeFactory: executeOrDie,
    }).map(enforceApproval ? toolWithApproval : tool);
}

export function executeOrDie({
    zodToolSchema,
    toolDefinition,
    client,
    userId,
  }: ToolExecuteFunctionFactoryInput): ToolExecuteFunction<ExecuteToolResponse | ToolAuthorizationResponse> {
    const { name: toolName } = zodToolSchema;

    return async (input: unknown) => {
      try {
        const result = await executeZodTool({ zodToolSchema, toolDefinition, client, userId })(input);
        return result;
      } catch (error) {
        console.log("error", error);
        if (error instanceof Error && isAuthorizationRequiredError(error)) {
          const response = await client.tools.authorize({
            tool_name: toolName,
            user_id: userId,
          });

          console.log(
              "Authorization required, waiting for approval, click this url to approve: ",
              response.url
          );
          const wait_response = await client.auth.waitForCompletion(response);

          if (wait_response.status === "completed") {
              return await client.tools.execute({
                  tool_name: toolName,
                  input: input as any,
                  user_id: userId,
              });
          }
        }
        throw error;
      }
    };
  }
