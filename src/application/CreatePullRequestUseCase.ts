import { PrepareWritePlanUseCase } from "./PrepareWritePlanUseCase";
import type {
  CreatePullRequestRequest,
  CreatePullRequestResult,
  PrepareWritePlanInput,
  WritePlan,
} from "../domain/github/writeTypes";
import type { GitHubWriter } from "../infrastructure/github/GitHubWriter";

export class PrepareWritePlanApplicationUseCase {
  constructor(
    private readonly prepareWritePlanUseCase: PrepareWritePlanUseCase,
    private readonly gitHubWriter: GitHubWriter,
  ) {}

  async execute(
    input: Omit<PrepareWritePlanInput, "existingBranchNames">,
  ): Promise<WritePlan> {
    const existingBranchNames = await this.gitHubWriter.listBranchNames(
      input.facts.owner,
      input.facts.name,
    );

    return this.prepareWritePlanUseCase.execute({
      ...input,
      existingBranchNames,
    });
  }
}

export class CreatePullRequestUseCase {
  constructor(private readonly gitHubWriter: GitHubWriter) {}

  async execute(
    request: CreatePullRequestRequest,
  ): Promise<CreatePullRequestResult> {
    return this.gitHubWriter.createPullRequest(request);
  }
}
