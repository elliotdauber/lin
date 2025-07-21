import { Args, Command, Options } from "@effect/cli"
import { Console, Effect, Option } from "effect"
import clipboard from "clipboardy"
import { LinearClient } from "../services/linear-client"
import { State } from "../services/state"

const openResource = Args.choice<"project" | "issue">([
    ["project", "project"],
    ["issue", "issue"]
], { name: "resource" }).pipe(
    Args.withDefault("issue"),
    Args.withDescription("The resource to open. Can be 'project' or 'issue'"),
);

const copyOnly = Options.boolean("copy", {
    aliases: ["c"],
    ifPresent: true
})

const openInBrowser = (url: string, identifier: string) =>
    Effect.tryPromise(async () => {
        const { spawn } = await import("child_process")
        const platform = process.platform

        let command: string
        let args: string[]

        if (platform === "darwin") {
            command = "open"
            args = [url]
        } else if (platform === "win32") {
            command = "start"
            args = [url]
        } else {
            command = "xdg-open"
            args = [url]
        }

        return new Promise<void>((resolve, reject) => {
            const child = spawn(command, args)
            child.on("error", reject)
            child.on("close", (code) => {
                if (code === 0) resolve()
                else reject(new Error(`Command failed with code ${code}`))
            })
        })
    }).pipe(
        Effect.catchAll(() => {
            clipboard.writeSync(url)
            return Console.log(`⚠️  Could not open browser. URL copied to clipboard: ${identifier}`)
        }),
        Effect.tap(() => Console.log(`Opened ${identifier} in browser: ${url}`))
    )

const handleOpen = (resource: "project" | "issue", copy: boolean) =>
    Effect.gen(function* () {
        const linearClient = yield* LinearClient
        const state = yield* State

        let url: string
        let identifier: string

        if (resource === "issue") {
            const issue = yield* state.getIssue()
            if (Option.isNone(issue)) {
                yield* Console.error("No issue selected. Run `lin checkout issue` first.")
                return
            }
            const issueObject = yield* linearClient.use((client) => client.issue(issue.value.id))
            url = issueObject.url
            identifier = issue.value.identifier
        } else if (resource === "project") {
            const project = yield* state.getProject()
            if (Option.isNone(project)) {
                yield* Console.error("No project selected. Run `lin checkout project` first.")
                return
            }
            const projectObject = yield* linearClient.use((client) => client.project(project.value.project.id))
            url = projectObject.url
            identifier = project.value.project.name
        } else {
            yield* Console.error("Invalid resource type")
            return
        }

        if (copy) {
            clipboard.writeSync(url)
            yield* Console.log(`Copied ${resource} URL to clipboard: ${url}`)
        } else {
            yield* openInBrowser(url, identifier)
        }
    })

export const open = Command.make("open", { resource: openResource, copy: copyOnly }, ({ resource, copy }) =>
    handleOpen(resource, copy)
).pipe(
    Command.withDescription("Open current issue or project in browser or copy URL to clipboard"),
    Command.provide(LinearClient.layer)
) 