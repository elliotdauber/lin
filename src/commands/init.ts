import { Command } from "@effect/cli";
import { Console, Effect, Redacted } from "effect";
import * as prompts from "@inquirer/prompts";
import { Auth } from "../services/auth";
import { LinearClient } from "../services/linear-client";

export const init = Command.make("init", {}, () =>
    Effect.gen(function* () {
        const auth = yield* Auth;

        yield* Console.log("Welcome to the Linear CLI! Let's set up your API key.");
        yield* Console.log("You can get your Linear API key from: https://linear.app/settings/api");

        const apiKey = yield* Effect.tryPromise(() =>
            prompts.password({
                message: "Enter your Linear API key:",
                mask: "*"
            })
        );

        if (!apiKey || apiKey.trim() === "") {
            yield* Console.error("API key cannot be empty.");
            return;
        }

        yield* auth.setApiKey(Redacted.make(apiKey.trim()));

        // make sure it works
        yield* LinearClient.pipe(
            Effect.flatMap(client => client.use(client => client.viewer)),
            Effect.tap(viewer => Console.log(`Welcome, ${viewer.displayName}!`)),
            Effect.catchTag('LinearClientError', (e) => Console.log(`There was an issue using your API key: ${e.message}`)),
        ).pipe(
            Effect.provide(LinearClient.layer),
        )

        yield* Console.log("✅ API key saved successfully! You can now use the Linear CLI.");
    })
)