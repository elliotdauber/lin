import { FileSystem } from "@effect/platform"
import { Context, Effect, Layer, Option, Ref, Schema } from "effect"
import { homedir } from "os";
import * as path from "path";
import { StateSchema, Issue, ProjectWithMilestone, Project, IssueWithContext } from "../schema"
import { Store } from "./kvstore";

export class State extends Context.Tag('State')<
    State,
    {
        getVersion: () => Effect.Effect<number>,
        getIssue: () => Effect.Effect<Option.Option<Issue>>,
        setIssue: (issue: Issue) => Effect.Effect<void>,
        getAllIssues: () => Effect.Effect<Option.Option<readonly IssueWithContext[]>>,
        setAllIssues: (issues: readonly IssueWithContext[]) => Effect.Effect<void>,
        getProject: () => Effect.Effect<Option.Option<ProjectWithMilestone>>,
        setProject: (project: ProjectWithMilestone) => Effect.Effect<void>,
        getAllProjects: () => Effect.Effect<Option.Option<readonly Project[]>>,
        setAllProjects: (projects: readonly Project[]) => Effect.Effect<void>
    }
>() {
    static layerWithoutDependencies = Layer.effect(this, Effect.gen(function* () {
        const store = yield* Store.init(StateSchema, { version: 1 });

        return {
            getVersion: () => store.read().pipe(
                Effect.map(state => state.version)
            ),
            getIssue: () => store.read().pipe(
                Effect.map(state => Option.fromNullable(state.issue))
            ),
            setIssue: (newIssue: Issue) => store.write({ issue: newIssue }),
            getAllIssues: () => store.read().pipe(
                Effect.map(state => Option.fromNullable(state.allIssues))
            ),
            setAllIssues: (newIssues: readonly IssueWithContext[]) => store.write({ allIssues: newIssues }),
            getProject: () => store.read().pipe(
                Effect.map(state => Option.fromNullable(state.project))
            ),
            setProject: (newProject: ProjectWithMilestone) => store.write({ project: newProject }),
            getAllProjects: () => store.read().pipe(
                Effect.map(state => Option.fromNullable(state.allProjects))
            ),
            setAllProjects: (newProjects: readonly Project[]) => store.write({ allProjects: newProjects }),
        }
    }))

    static layer = this.layerWithoutDependencies.pipe(
        Layer.provide(Store.layerFs(path.join(homedir(), '.config', 'lin'), "state.json"))
    )
} 