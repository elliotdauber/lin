import { Command } from "@effect/cli"
import { Console, Effect, Option } from "effect"
import { State } from "../services/state"

export const get = Command.make("get", {}, () =>
    Effect.gen(function* () {
        const state = yield* State;
        const project = yield* state.getProject();
        const issue = yield* state.getIssue();

        if (Option.isNone(project)) {
            yield* Console.log("No project selected")
        } else {
            yield* Console.log(`Current project: ${project.value.project.name}`)
            if (project.value.milestone) {
                yield* Console.log(`Current milestone: ${project.value.milestone.name}`)
            } else {
                yield* Console.log("No milestone selected")
            }
            if (Option.isSome(issue)) {
                yield* Console.log(`Current issue: ${issue.value.title}`)
            } else {
                yield* Console.log("No issue selected")
            }
        }
    })
) 