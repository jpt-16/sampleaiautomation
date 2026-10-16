import test from "node:test";
import assert from "node:assert/strict";
import { isSafe } from "../lib/ai";
import { demoResponse } from "../lib/demo";
import { inquirySchema, todayISO } from "../lib/validation";

const base = {
  name: "Jane Smith",
  email: "jane@example.com",
  phone: "(555) 123-4567",
  vehicle: "2022 Audi Q5",
  service: "Ceramic Coating",
  preferred_date: todayISO(),
};

test("accepts a valid inquiry", () => {
  assert.equal(inquirySchema.safeParse(base).success, true);
});

test("rejects bad email, phone, service and past dates", () => {
  assert.equal(inquirySchema.safeParse({ ...base, email: "nope" }).success, false);
  assert.equal(inquirySchema.safeParse({ ...base, phone: "abc" }).success, false);
  assert.equal(inquirySchema.safeParse({ ...base, service: "Free Car" }).success, false);
  assert.equal(inquirySchema.safeParse({ ...base, preferred_date: "2001-01-01" }).success, false);
});

test("demo reply is personalised and passes the guardrail", () => {
  const text = demoResponse(inquirySchema.parse(base));
  assert.match(text, /Jane/);
  assert.match(text, /Audi Q5/);
  assert.equal(isSafe(text), true);
});

test("guardrail blocks prices and booking confirmations", () => {
  const pad = " Thanks for contacting us, the team will be in touch soon about your car.";
  assert.equal(isSafe("The ceramic coating is $499 for your car." + pad), false);
  assert.equal(isSafe("Your appointment is confirmed for Saturday." + pad), false);
  assert.equal(isSafe("Hi Jane, our team will follow up with pricing and availability." + pad), true);
});
