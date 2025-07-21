import { Command } from "@effect/cli"
import { NodeContext, NodeRuntime } from "@effect/platform-node"
import { Console, Effect, Option } from "effect"
import { State } from "./services/state"
import { checkout, co, get, create, branch, start, set, init } from "./commands"
import { Auth } from "./services/auth"

const lin = Command.make("lin", {}, () =>
    Effect.gen(function* () {
        const auth = yield* Auth;
        const apiKey = yield* auth.getApiKey();
        if (Option.isNone(apiKey)) {
            yield* Console.log("Welcome to the Linear CLI! Run `lin init` to get started.");
        } else {
            yield* Console.log("Welcome to the Linear CLI!");
        }
    })
)

const command = lin.pipe(
    Command.withSubcommands([init, create, get, checkout, co, branch, start, set])
)

const cli = Command.run(command, {
    name: "Linear CLI",
    version: "v1",
})

export const run = () => cli(process.argv).pipe(
    Effect.provide(State.layer),
    Effect.provide(Auth.layer),
    Effect.catchTag('LinearApiKeyNotFound', () => Console.log("Authentication required. Please run `lin init` to set your Linear API key")),
    Effect.provide(NodeContext.layer),
    NodeRuntime.runMain
)