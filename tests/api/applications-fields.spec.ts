import type { APIResponse } from "@playwright/test";
import type { ApplicationsApi } from "@/api/applications.api";
import { expectApiError, expectJson } from "@/api/assertions";
import { applicationResponse } from "@/api/schemas";
import type { ApplicationInput } from "@/api/types";
import { buildApplication } from "@/data/application.factory";
import { expect, test } from "@/fixtures/test";

const repeat = (text: string, times: number) => text.repeat(times);
const tags = (count: number) => Array.from({ length: count }, (_, i) => `tag${i}`);

// Lengths count characters as a person sees them: an emoji is one character, not two.
const longest: { name: string; input: ApplicationInput }[] = [
  { name: "a 200 character company", input: { company: repeat("C", 200) } },
  { name: "a 200 character title", input: { title: repeat("T", 200) } },
  { name: "a 200 character location", input: { location: repeat("L", 200) } },
  { name: "a company of 200 emoji", input: { company: repeat("😀", 200) } },
  { name: "10 tags", input: { tags: tags(10) } },
  { name: "a 40 character tag", input: { tags: [repeat("a", 40)] } },
  { name: "a 40 emoji tag", input: { tags: [repeat("😀", 40)] } },
];

/** A create the test expects to be refused; if the API saves it anyway, cleanup still deletes it. */
async function tryCreate(response: APIResponse, applicationsApi: ApplicationsApi): Promise<APIResponse> {
  if (response.status() === 201) applicationsApi.track(applicationResponse.parse(await response.json()).data.id);
  return response;
}

const oneOver: { name: string; input: ApplicationInput; path: string }[] = [
  { name: "a 201 character company", input: { company: repeat("C", 201) }, path: "company" },
  { name: "a 201 character title", input: { title: repeat("T", 201) }, path: "title" },
  { name: "a 201 character location", input: { location: repeat("L", 201) }, path: "location" },
  { name: "a company of 201 emoji", input: { company: repeat("😀", 201) }, path: "company" },
  { name: "11 tags", input: { tags: tags(11) }, path: "tags" },
  { name: "a 41 character tag", input: { tags: [repeat("a", 41)] }, path: "tags.0" },
];

test.describe("application field limits", () => {
  for (const { name, input } of longest) {
    test(`accepts ${name} and stores it whole`, async ({ applicationsApi }) => {
      const created = await applicationsApi.create(buildApplication(input));

      for (const [field, value] of Object.entries(input)) {
        expect(created[field as keyof typeof created], field).toEqual(value);
      }
    });
  }

  for (const { name, input, path } of oneOver) {
    test(`refuses ${name} on create and on update`, async ({ applicationsEndpoint, applicationsApi }) => {
      const create = await tryCreate(await applicationsEndpoint.create(buildApplication(input)), applicationsApi);
      const createError = await expectApiError(create, 400, "VALIDATION_ERROR");
      expect(createError.details).toContainEqual(expect.objectContaining({ path }));

      const existing = await applicationsApi.create(buildApplication());
      const update = await applicationsEndpoint.update(existing.id, input);
      const updateError = await expectApiError(update, 400, "VALIDATION_ERROR");
      expect(updateError.details).toContainEqual(expect.objectContaining({ path }));

      const { data } = await expectJson(await applicationsEndpoint.get(existing.id), 200, applicationResponse);
      expect(data, "a refused update changes nothing").toEqual(existing);
    });
  }

  test("refuses a blank company or title on create and on update", async ({
    applicationsEndpoint,
    applicationsApi,
  }) => {
    const existing = await applicationsApi.create(buildApplication());
    for (const input of [{ company: "   " }, { title: " \t " }, { title: "" }]) {
      const path = Object.keys(input)[0];
      for (const response of [
        await tryCreate(await applicationsEndpoint.create(buildApplication(input)), applicationsApi),
        await applicationsEndpoint.update(existing.id, input),
      ]) {
        const error = await expectApiError(response, 400, "VALIDATION_ERROR");
        expect(error.details, JSON.stringify(input)).toContainEqual(expect.objectContaining({ path }));
      }
    }
  });

  test("trims surrounding spaces from a company and title", async ({ applicationsEndpoint, applicationsApi }) => {
    const application = buildApplication();
    const created = await applicationsApi.create({
      company: `  ${application.company}  `,
      title: `\t${application.title} `,
    });
    expect(created.company).toBe(application.company);
    expect(created.title).toBe(application.title);

    const { data } = await expectJson(
      await applicationsEndpoint.update(created.id, { company: ` ${application.company} B ` }),
      200,
      applicationResponse,
    );
    expect(data.company).toBe(`${application.company} B`);
  });

  test("drops blank tags and keeps one of each", async ({ applicationsApi }) => {
    const created = await applicationsApi.create(buildApplication({ tags: ["", "  ", "qa", "QA", "qa"] }));

    expect(created.tags).toEqual(["qa"]);
  });

  test("refuses a minimum salary above the maximum, also against the saved one", async ({
    applicationsEndpoint,
    applicationsApi,
  }) => {
    const inverted = await tryCreate(
      await applicationsEndpoint.create(buildApplication({ salaryMin: 100_000, salaryMax: 50_000 })),
      applicationsApi,
    );
    expect((await expectApiError(inverted, 400, "VALIDATION_ERROR")).details).toContainEqual(
      expect.objectContaining({ path: "salaryMin" }),
    );

    const saved = await applicationsApi.create(buildApplication({ salaryMin: 50_000, salaryMax: 60_000 }));
    // Each update sends one side only; the check has to compare it with the side already saved.
    for (const input of [{ salaryMin: 70_000 }, { salaryMax: 40_000 }]) {
      const error = await expectApiError(await applicationsEndpoint.update(saved.id, input), 400, "VALIDATION_ERROR");
      expect(error.details, JSON.stringify(input)).toContainEqual(expect.objectContaining({ path: "salaryMin" }));
    }

    const { data } = await expectJson(
      await applicationsEndpoint.update(saved.id, { salaryMin: 60_000 }),
      200,
      applicationResponse,
    );
    expect(data, "an equal minimum and maximum is a fixed salary").toMatchObject({
      salaryMin: 60_000,
      salaryMax: 60_000,
    });
  });
});
