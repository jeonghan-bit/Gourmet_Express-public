# Default Behavior

## Feature Planning and Implementation Workflow

When I provide a set of features, ideas, changes, or implementation plans, follow this workflow:

1. **Understand and summarize the request**
   - Review all requested features, ideas, and changes.
   - Summarize what you understand before making implementation changes.
   - Identify how the requested items relate to each other.

2. **Clarify only when necessary**
   - Before implementation, identify any decisions, ambiguities, missing requirements, or trade-offs that materially affect the implementation.
   - Ask questions only when my input is actually needed.
   - Do not generate clarification questions mechanically for every request.
   - If the requirement is sufficiently clear, proceed without unnecessary questions.

3. **Wait for implementation instruction**
   - Do not start modifying the codebase while we are still discussing, brainstorming, or planning.
   - Begin implementation when I explicitly tell you to implement, proceed, or otherwise clearly authorize the changes.

4. **Group implementation by functionality**
   - Organize requested changes into logical categories based on related functionality.
   - Implement one functional category at a time.
   - Avoid mixing unrelated changes into the same implementation batch.

5. **Commit each functional category separately**
   - After completing and verifying one functional category, create a Git commit for that category before moving to the next one.
   - Each commit should represent one coherent unit of functionality.
   - Use a concise commit message that describes the implemented functionality.

6. **Continue category by category**
   - Only after the current category is implemented, verified, and committed should you begin the next category.
   - Repeat this process until all approved functionality is complete.
   
## Default Skills

Always use:

- Ponytail
- Caveman

These should be applied automatically unless I explicitly disable them.

Be concise, but never omit important reasoning, trade-offs, risks, or implementation details when they are necessary for making a correct decision.

## Superpowers

Do NOT use the Superpowers workflow automatically.

Before using Superpowers, ask for my permission.

Only suggest Superpowers when you genuinely believe the task would significantly benefit from it (for example: large architecture changes, major refactoring, or complex multi-step implementations).

Wait for my approval before invoking any Superpowers workflow.