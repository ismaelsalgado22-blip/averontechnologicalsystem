import { describe, it } from "node:test";
import { deepStrictEqual, equal, rejects } from "node:assert/strict";
import { cepDigits, formatCep, lookupCep, mergePostalAddress } from "./postal-address";

describe("preenchimento automático pelo CEP", () => {
  it("aceita CEP digitado ou colado com máscara", () => {
    equal(cepDigits("01001-000"), "01001000");
    equal(formatCep("01001000"), "01001-000");
  });
  it("preenche endereço, bairro, cidade e UF sem alterar número ou complemento", () => {
    deepStrictEqual(mergePostalAddress({ address: "Antigo", district: "Antigo", city: "Antiga", state: "RJ", number: "42", complement: "Sala 2" },
      { address: "Praça da Sé", district: "Sé", city: "São Paulo", state: "SP" }),
      { address: "Praça da Sé", district: "Sé", city: "São Paulo", state: "SP", number: "42", complement: "Sala 2" });
  });
  it("preserva logradouro e bairro manuais em CEP geral de cidade", () => {
    deepStrictEqual(mergePostalAddress({ address: "Rua Manual", district: "Centro", city: "", state: "" },
      { address: "", district: "", city: "Cidade", state: "SP" }),
      { address: "Rua Manual", district: "Centro", city: "Cidade", state: "SP" });
  });
  it("não consulta CEP incompleto", async () => {
    await rejects(lookupCep("01001"), /8 dígitos/);
  });
});