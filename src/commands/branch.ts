import { Command } from "@effect/cli"
import { Console, Effect, Option } from "effect"
import clipboard from "clipboardy";
import { LinearClient } from "../services/linear-client"
import { State } from "../services/state"

export const branch = Command.make("branch", {}, () =>
    Effect.gen(function* () {
        const linearClient = yield* LinearClient;
        const state = yield* State;
        const issue = yield* state.getIssue();
        if (Option.isNone(issue)) {
            yield* Console.log("No issue selected")
            return;
        }

        const branchName = yield* linearClient.use((client) => client.issue(issue.value.id).then((i) => i.branchName))
        clipboard.writeSync(`gt checkout ${branchName}`);
        yield* Console.log(`Copied branch name to clipboard: ${branchName}`)
    })
).pipe(
    Command.provide(LinearClient.layer)
)