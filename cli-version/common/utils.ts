import readline from "node:readline/promises";

// Prompt user for yes/no confirmation
export async function confirm(question: string, rl?: readline.Interface): Promise<boolean> {
    let shouldClose = false;
    let interface_ = rl;

    if (!interface_) {
        interface_ = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        shouldClose = true;
    }

    const answer = await interface_.question(`${question} (y/n): `);

    if (shouldClose) {
        interface_.close();
    }

    return ["y", "yes"].includes(answer.trim().toLowerCase());
}
