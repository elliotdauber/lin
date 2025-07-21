import { Args, Command } from "@effect/cli";
import { Console, Effect, Option } from "effect";
import { State } from "../services/state";

const devCommand = Args.choice<"clear-issues" | "print">([
    ["clear-issues", "clear-issues"],
    ["print", "print"],
], { name: "command" });

export const dev = Command.make("dev", {
    command: devCommand,
}, ({ command }) => Effect.gen(function* () {
    if (command === "clear-issues") {
        const state = yield* State;
        yield* state.setAllIssues(Option.none());
    } else if (command === "print") {
        const state = yield* State;
        yield* state.stringify().pipe(Effect.flatMap(Console.log))
    }
})).pipe(
    Command.withDescription("Dev commands (danger: dev/debug only)"),
)