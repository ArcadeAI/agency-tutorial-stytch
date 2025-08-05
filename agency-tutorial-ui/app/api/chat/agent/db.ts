/**
 * This is just a super simple in-memory database for the demo.
 * In a real application, you would use a proper database that persists the data.
 */

export class Database<Value> {
    #database: Map<string, Value>;

    constructor() {
        this.#database = new Map();
    }

    static Key(userId: string, conversationID: string): string {
        return userId + '__' + conversationID;
    }

    async get(userId: string, conversationID: string) {
        return this.#database.get(Database.Key(userId, conversationID));
    }

    async set(userId: string, conversationID: string, value: Value) {
        this.#database.set(Database.Key(userId, conversationID), value);
    }
}

let database: Database<string> | undefined;

export function db() {
    if (!database) {
        database = new Database<string>();
    }
    return database;
}
