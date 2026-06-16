/**
 * Plain-English Scheduler Prompt
 *
 * No TypeScript interfaces, no class signatures, no method names given.
 * The LLM is asked to design and build the whole thing from a natural-language spec.
 * Tests then inspect the generated class dynamically, adapting to whatever
 * names the model chose.
 */
export const SCHEDULER_PLAIN_ENGLISH_PROMPT = `
I need you to build me a reminder app.

Here is what it should do, described in plain English:

1. Users should be able to **create** a reminder by giving it:
   - A title (required)
   - An optional description
   - A due date and time
   - An optional repeat setting: one-time, daily, weekly, or monthly
   - Optional tags (like "work", "personal", "finance")

2. Every reminder should automatically get:
   - A unique ID
   - A "not done" status when first created
   - A timestamp for when it was created

3. Users should be able to **look up** a reminder by its ID.

4. Users should be able to **list** reminders:
   - All of them
   - Only the ones that aren't done yet and are coming up in the future (pending)
   - Only the ones that are past due and still not done (overdue)

5. Users should be able to **mark** a reminder as done. If the ID doesn't exist, throw an error.

6. Users should be able to **delete** a reminder. Return true if it existed, false if it didn't.

7. Users should be able to find reminders **due within the next N minutes**.

8. Users should be able to **reschedule** a reminder to a new time. Throw an error if the ID doesn't exist.

Please implement this as a single TypeScript class with an in-memory store.
The class should be named \`ReminderService\`.
Export it with: \`module.exports = { ReminderService };\`

Respond with only a \`\`\`typescript code block — no explanation.
`.trim();
