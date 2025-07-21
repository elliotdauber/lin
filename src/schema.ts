import { Schema } from "effect"

export const Project = Schema.Struct({
    id: Schema.String,
    name: Schema.String
});
export type Project = typeof Project.Type;

export const Issue = Schema.Struct({
    id: Schema.String,
    identifier: Schema.String,
    title: Schema.String,
    state: Schema.optional(Schema.String),
});
export type Issue = typeof Issue.Type;

export const IssueWithContext = Schema.Struct({
    issue: Issue,
    context: Schema.Struct({
        projectId: Schema.String,
        milestoneId: Schema.optional(Schema.String),
    })
});
export type IssueWithContext = typeof IssueWithContext.Type;

export const Milestone = Schema.Struct({
    id: Schema.String,
    name: Schema.String
});
export type Milestone = typeof Milestone.Type;

export const ProjectWithMilestone = Schema.Struct({
    project: Project,
    milestone: Schema.optional(Milestone)
});
export type ProjectWithMilestone = typeof ProjectWithMilestone.Type;

export const StateSchema = Schema.Struct({
    version: Schema.Literal(1),
    issue: Schema.optional(Issue),
    project: Schema.optional(ProjectWithMilestone),
    allProjects: Schema.optional(Schema.Array(Project)),
    allIssues: Schema.optional(Schema.Array(IssueWithContext))
});
export type StateSchema = typeof StateSchema.Type;

export class LinearClientError extends Schema.TaggedError<LinearClientError>()(
    'LinearClientError',
    {
        message: Schema.String,
        cause: Schema.Unknown
    }
) { } 