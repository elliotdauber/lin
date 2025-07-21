import { Effect, Console, Option } from "effect"
import { LinearClient } from "./services/linear-client"
import { State } from "./services/state"

export const Statuses = ["todo", "ip", "ir", "done", "tr", "dup", "bl", "cancel"] as const;
export const StatusNames = ["Todo", "In Progress", "In Review", "Done", "Triage", "Duplicate", "Backlog", "Cancelled"] as const;
export type Status = (typeof Statuses)[number]
export type StatusName = (typeof StatusNames)[number]

export const STATUS_TO_STATE: Record<Status, StatusName> = {
    "todo": "Todo",
    "ip": "In Progress",
    "ir": "In Review",
    "done": "Done",
    "tr": "Triage",
    "dup": "Duplicate",
    "bl": "Backlog",
    "cancel": "Cancelled",
}

export const STATES: Record<StatusName, string> = {
    "Triage": "0abb8ddd-ea0d-442d-949e-67dfb98c4b0d",
    "Cancelled": "fbdd20b3-3329-451b-b9a9-edc88f1dc442",
    "Duplicate": "ebbf6a6e-e53c-41a0-ad75-824db50b1809",
    "In Review": "b5d4c7f3-7c9e-4e8a-862f-d215c0f49cbf",
    "Done": "ac5dfe8f-c6ef-434b-bae7-baf8a16b801b",
    "Backlog": "9e8172e4-9f68-47e9-b993-3f8ebb778497",
    "In Progress": "8005afc1-05aa-4fb1-bc98-7e1980023b28",
    "Todo": "03a193e8-6a24-4268-9c1e-18ab6b59e06a",
}

export const STATE_TO_EMOJI: Record<StatusName, string> = {
    "Done": "✅",
    "Backlog": "🔙",
    "Todo": "🔘",
    "In Progress": "🟡",
    "In Review": "🟢",
    "Triage": "⏳",
    "Cancelled": "❌",
    "Duplicate": "❌",
}

export const isValidStatus = (status: string): status is Status => Statuses.includes(status as Status)

export const setStatus = (status: string) => Effect.gen(function* () {
    const linearClient = yield* LinearClient;
    const state = yield* State;
    const issue = yield* state.getIssue();
    if (Option.isNone(issue)) {
        yield* Console.log("No issue selected")
        return;
    }

    if (!isValidStatus(status)) {
        yield* Console.log(`Invalid status: ${status}. Must be one of ${Statuses.join(", ")}`)
        return;
    }

    yield* linearClient.use((client) => client.updateIssue(issue.value.id, { stateId: STATES[STATUS_TO_STATE[status]] }))
}) 