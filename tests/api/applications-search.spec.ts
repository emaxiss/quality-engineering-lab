import { randomUUID } from "node:crypto";
import { expectJson } from "@/api/assertions";
import { applicationListResponse } from "@/api/schemas";
import { buildApplication } from "@/data/application.factory";
import { expect, test } from "@/fixtures/test";

// Search is a "contains" match on what the user typed. Characters that mean something to a SQL
// LIKE pattern must be matched as themselves: "%" is not "anything", "_" is not "any character".
const characters = [
  // Known defect: "%" works as a wildcard, so the search returns every application.
  { name: "a percent sign", character: "%", defect: true },
  // Known defect: "_" matches any single character.
  { name: "an underscore", character: "_", defect: true },
  // Known defect: a backslash finds nothing, even an application that contains one.
  { name: "a backslash", character: "\\", defect: true },
  { name: "a single quote", character: "'", defect: false },
  { name: "a double quote", character: '"', defect: false },
];

test.describe("search matches special characters literally", () => {
  for (const { name, character, defect } of characters) {
    test(`a search with ${name} finds only the applications that contain it`, async ({
      applicationsEndpoint,
      applicationsApi,
    }) => {
      test.fail(defect, "known defect: search treats the character as a pattern, not as text");
      const marker = `Literal ${randomUUID().slice(0, 8)}`;
      const match = await applicationsApi.create(buildApplication({ company: `${marker}${character} Co` }));
      // Same text with an ordinary letter where the character is: a wildcard would match it.
      await applicationsApi.create(buildApplication({ company: `${marker}x Co` }));

      const { data } = await expectJson(
        await applicationsEndpoint.list({ q: `${marker}${character}` }),
        200,
        applicationListResponse,
      );

      expect(data.map((application) => application.company)).toEqual([match.company]);
    });
  }
});
