import { Args, Command } from "@effect/cli"
import { Console, Effect, Option } from "effect"
import { LinearClient } from "../services/linear-client"
import { State } from "../services/state"
import { STATES } from "../utils"

const title = Args.text({ name: "title" });

export const create = Command.make("create", { title }, ({ title }) =>
    Effect.gen(function* () {
        const linearClient = yield* LinearClient;
        const state = yield* State;
        const project = yield* state.getProject();
        if (Option.isNone(project)) {
            yield* Console.error("No project selected")
            return;
        }

        const projectObject = yield* linearClient.use((client) => client.project(project.value.project.id));
        const team = yield* Effect.tryPromise(() => (projectObject).teams().then((t) => t.nodes[0]));
        if (!team) {
            yield* Console.error("Team not found")
            return;
        }

        const me = yield* linearClient.use((client) => client.viewer);

        yield* Console.log(`Creating issue in ${project.value.project.name} with milestone ${project.value.milestone?.name}`)

        const issue = yield* linearClient.use((client) => client.createIssue({
            teamId: team.id,
            projectId: project.value.project.id,
            title,
            assigneeId: (me as any).id,
            stateId: STATES["Todo"],
            projectMilestoneId: project.value.milestone?.id
        }));

        if (!(issue as any).issueId) {
            yield* Console.error("Issue not created successfully")
            return;
        }

        yield* state.setIssue({
            id: (issue as any).issueId,
            title,
        });

        yield* Console.log(`Issue created and checked out: ${title}`)
    })
).pipe(
    Command.provide(LinearClient.layer)
) 