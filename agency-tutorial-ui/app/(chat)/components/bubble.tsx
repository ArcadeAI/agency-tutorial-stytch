import { UserMessageItem, AssistantMessageItem } from "@openai/agents"

type BubbleProps = {
  message: UserMessageItem | AssistantMessageItem
}

export function Bubble({ message }: BubbleProps) {
  const extractTextContent = (message: UserMessageItem | AssistantMessageItem): string => {
    // Handle UserMessageItem where content can be string or array
    if (message.role === "user") {
      if (typeof message.content === "string") {
        return message.content
      }
      // If content is array, extract text from input_text items
      return message.content
        .filter((item) => item.type === "input_text")
        .map((item) => item.text)
        .join(" ")
    }

    // Handle AssistantMessageItem where content is always an array
    if (message.role === "assistant") {
      return message.content
        .filter((item) => item.type === "output_text")
        .map((item) => item.text)
        .join(" ")
    }

    return ""
  }

  const textContent = extractTextContent(message)

  return (
    <div className={`p-3 rounded-lg max-w-[80%] ${
      message.role === "user"
        ? "bg-blue-500 text-white ml-auto"
        : "bg-gray-200 text-gray-900 mr-auto"
    }`}>
      {textContent}
    </div>
  )
}
