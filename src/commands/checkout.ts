import { Args, Command } from "@effect/cli"
import { Console, Effect, Option } from "effect"
import * as prompts from "@inquirer/prompts";
import { Searcher } from "fast-fuzzy";
import { LinearClient } from "../services/linear-client"
import { State } from "../services/state"
import { Project, Issue } from "../schema"
import { STATE_TO_EMOJI } from "../utils"

const checkoutProject = Effect.gen(function* () {
    const linearClient = yield* LinearClient;
    const state = yield* State;
    const projects = yield* state.getAllProjects().pipe(
        Effect.flatMap(Option.match({
            onNone: () => Effect.gen(function* () {
                yield* Console.log(`Fetching projects...`)
                let projects: readonly Project[] = [];
                let cursor: string | undefined = undefined;
                const pageSize = 50;

                while (true) {
                    const res = yield* linearClient.use(async (client) => await client.projects({ first: pageSize, after: cursor }));
                    projects = projects.concat(res.nodes);
                    if (!res.pageInfo.hasNextPage) break;
                    cursor = res.pageInfo.endCursor;
                }

                yield* state.setAllProjects(projects);
                return projects;
            }),
            onSome: Effect.succeed,
        }))

    )

    const fuzzySearch = new Searcher(projects.map(p => p.name));

    const answer = yield* Effect.tryPromise(() =>
        prompts.search<string>({
            message: "Select a project:",
            source: async (term) => {
                if (!term) return projects.map((p) => p.name);

                const results = fuzzySearch.search(term);
                return results.map((name) => name);
            },
        })
    );

    const project = projects.find(p => p.name === answer);
    if (!project) {
        yield* Console.log("Project not found")
        return;
    }

    yield* state.setProject({ project, milestone: undefined })
})

const checkoutMilestone = Effect.gen(function* () {
    const linearClient = yield* LinearClient;
    const state = yield* State;
    const project = yield* state.getProject();
    if (Option.isNone(project)) {
        yield* Console.log("No project selected")
        return;
    }

    const projectObject = yield* linearClient.use((client) => client.project(project.value.project.id));
    const milestones = yield* Effect.tryPromise(() => projectObject.projectMilestones());

    const fuzzySearch = new Searcher(milestones.nodes.map((m) => m.name));

    const answer = yield* Effect.tryPromise(() =>
        prompts.search<string>({
            message: "Select a milestone:",
            source: async (term) => {
                if (!term) return milestones.nodes.map((m) => m.name);
                const results = fuzzySearch.search(term);
                return results.map((name) => name);
            }
        })
    );

    const milestone = milestones.nodes.find((m) => m.name === answer);
    if (!milestone) {
        yield* Console.log("Milestone not found")
        return;
    }

    yield* state.setProject({ ...project.value, milestone })
})

const checkoutIssue = Effect.gen(function* () {
    const linearClient = yield* LinearClient;
    const state = yield* State;
    const project = yield* state.getProject();
    if (Option.isNone(project)) {
        yield* Console.log("No project selected");
        return;
    }

    yield* Console.log(`Fetching issues...`);

    const me = yield* linearClient.use((client) => client.viewer);

    const issues = yield* linearClient.use((client) => client.issues({
        filter: {
            project: { id: { eq: project.value.project.id } },
            projectMilestone: project.value.milestone ? { id: { eq: project.value.milestone.id } } : undefined,
            state: { type: { nin: ["canceled", "duplicate", "triage", "backlog", "completed"] } },
            assignee: { id: { eq: me.id } },
        },
    }));

    const issueNameToObject = new Map<string, Issue & { state: string | undefined }>();
    for (const issue of issues.nodes) {
        const statePromise = issue.state;
        const state = statePromise ? yield* Effect.tryPromise(() => statePromise.then((state) => state.name)) : undefined;
        const emoji = state ? STATE_TO_EMOJI[state as keyof typeof STATE_TO_EMOJI] || "❓" : "❓"
        const title = `${emoji} ${issue.identifier}: ${issue.title}`
        issueNameToObject.set(title, { ...issue, state });
    }

    const fuzzySearch = new Searcher(Array.from(issueNameToObject.keys()));

    const answer = yield* Effect.tryPromise(() =>
        prompts.search<string>({
            message: "Select an issue:",
            source: async (term) => {
                const results = term ? fuzzySearch.search(term) : Array.from(issueNameToObject.keys());
                const priority = [
                    "Completed",
                    "In Review",
                    "In Progress",
                    "Todo",
                    "Triage",
                    "Backlog",
                ]
                return results.toSorted((a, b) => {
                    const itemA = issueNameToObject.get(a);
                    const itemB = issueNameToObject.get(b);
                    if (!itemA || !itemB) return 0;

                    const aIndex = priority.indexOf(itemA.state ?? '');
                    const bIndex = priority.indexOf(itemB.state ?? '');
                    return aIndex - bIndex;
                });
            }
        })
    );

    const issue = issueNameToObject.get(answer);

    if (!issue) {
        yield* Console.log("Issue not found")
        return;
    }

    yield* state.setIssue(issue)
})

const checkoutResource = Args.choice<"project" | "milestone" | "issue">([
    ["project", "project"],
    ["milestone", "milestone"],
    ["issue", "issue"]
], { name: "resource" }).pipe(
    Args.withDefault("issue"),
    Args.withDescription("The resource to checkout. Can be 'project', 'milestone', or 'issue'"),
);

const handleCheckout = (resource: "project" | "milestone" | "issue") => Effect.gen(function* () {
    if (resource === "project") {
        yield* checkoutProject;
    } else if (resource === "milestone") {
        yield* checkoutMilestone;
    } else if (resource === 'issue') {
        yield* checkoutIssue;
    }
})

export const checkout = Command.make("checkout", { resource: checkoutResource }, ({ resource }) =>
    handleCheckout(resource)
).pipe(
    Command.withDescription("Check out a project, milestone, or issue. Can use 'co' as an alias."),
    Command.provide(LinearClient.layer)
)

export const co = Command.make("co", { resource: checkoutResource }, ({ resource }) =>
    handleCheckout(resource)
).pipe(
    Command.withDescription("Check out a project, milestone, or issue. Alias for 'checkout'"),
    Command.provide(LinearClient.layer)
)