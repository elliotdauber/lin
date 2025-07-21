import { Args, Command } from "@effect/cli"
import { setStatus } from "../utils"
import { LinearClient } from "../services/linear-client";

const status = Args.text({ name: "status" });

export const set = Command.make("set", { status }, ({ status }) =>
    setStatus(status)
).pipe(
    Command.provide(LinearClient.layer)
)