import { expect, test } from "@playwright/test";
import { parseCsv, parseCsvRecords } from "@/support/csv";

test.describe("parseCsv", () => {
  test("splits plain fields and rows", () => {
    expect(parseCsv("a,b\n1,2\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  test("keeps commas, doubled quotes and line breaks inside quoted fields", () => {
    expect(parseCsv('"x, y","say ""hi""","two\nlines"\r\n')).toEqual([["x, y", 'say "hi"', "two\nlines"]]);
  });

  test("keeps empty fields", () => {
    expect(parseCsv("a,,c")).toEqual([["a", "", "c"]]);
  });

  test("maps rows to the header", () => {
    expect(parseCsvRecords("id,company\n1,Acme\n")).toEqual([{ id: "1", company: "Acme" }]);
  });
});
