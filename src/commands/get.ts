import { Command } from "@effect/cli"
import { Console, Effect, Option } from "effect"
import { State } from "../services/state"
import { stateToEmoji } from "../utils";

export const get = Command.make("get", {}, () =>
    Effect.gen(function* () {
        const state = yield* State;
        const maybeProject = yield* state.getProject();
        const maybeIssue = yield* state.getIssue();

        if (Option.isNone(maybeProject) && Option.isNone(maybeIssue)) {
            yield* Console.log("No project or issue selected")
            return;
        }

        yield* Console.log("");

        if (Option.isSome(maybeProject)) {
            const project = maybeProject.value.project;
            const milestone = maybeProject.value.milestone;
            yield* Console.log(`${project.name}${milestone ? ` | ${milestone.name}` : ""}`)
        }

        if (Option.isSome(maybeIssue)) {
            const issue = maybeIssue.value;
            yield* Console.log(`${stateToEmoji(issue.state)} ${issue.identifier}: ${issue.title}`)
        }

        yield* Console.log("");
    })
) 