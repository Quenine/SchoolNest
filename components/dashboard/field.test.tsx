import React from "react";
import {describe,expect,it} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {RequiredLabel,TextAreaField} from "./field";
describe("required field accessibility",()=>{it("renders visible and screen-reader markers only when required",()=>{const required=renderToStaticMarkup(<><RequiredLabel label="Name" required/><TextAreaField label="Notes" name="notes" required/></>);expect(required).toContain('(required)');expect(required).toContain('aria-required="true"');const optional=renderToStaticMarkup(<RequiredLabel label="Optional"/>);expect(optional).not.toContain('(required)');});});

