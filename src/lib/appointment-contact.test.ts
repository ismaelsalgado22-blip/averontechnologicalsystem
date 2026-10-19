import { describe, it as test } from "node:test";
import { deepStrictEqual, throws } from "node:assert/strict";
import { appointmentContact, guestContact } from "./appointment-contact";

describe("agendamento sem cadastro", () => {
  test("aceita apenas nome e telefone sem documento ou cliente", () => {
    deepStrictEqual(guestContact(" Ana Silva ", " (11) 99999-0000 "), {
      contact_name: "Ana Silva", contact_phone: "(11) 99999-0000",
    });
  });
  test("exige nome", () => {
    throws(() => guestContact(" ", "11999990000"));
  });
  test("exige telefone", () => {
    throws(() => guestContact("Ana Silva", " "));
  });
  test("mantém contato do cliente cadastrado", () => {
    deepStrictEqual(appointmentContact({ clients: { name: "João", phone: "1133330000", whatsapp: "11999990000" } }),
      { name: "João", phone: "11999990000" });
  });
  test("usa contato avulso para exibição e WhatsApp", () => {
    deepStrictEqual(appointmentContact(guestContact("Ana Silva", "11999990000")),
      { name: "Ana Silva", phone: "11999990000" });
  });
});