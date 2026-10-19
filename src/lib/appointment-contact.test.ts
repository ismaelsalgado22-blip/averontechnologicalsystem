import { describe, expect, test } from "bun:test";
import { appointmentContact, guestContact } from "./appointment-contact";

describe("agendamento sem cadastro", () => {
  test("aceita apenas nome e telefone sem documento ou cliente", () => {
    expect(guestContact(" Ana Silva ", " (11) 99999-0000 ")).toEqual({
      contact_name: "Ana Silva", contact_phone: "(11) 99999-0000",
    });
  });
  test("exige nome", () => {
    expect(() => guestContact(" ", "11999990000")).toThrow();
  });
  test("exige telefone", () => {
    expect(() => guestContact("Ana Silva", " ")).toThrow();
  });
  test("mantém contato do cliente cadastrado", () => {
    expect(appointmentContact({ clients: { name: "João", phone: "1133330000", whatsapp: "11999990000" } }))
      .toEqual({ name: "João", phone: "11999990000" });
  });
  test("usa contato avulso para exibição e WhatsApp", () => {
    expect(appointmentContact(guestContact("Ana Silva", "11999990000")))
      .toEqual({ name: "Ana Silva", phone: "11999990000" });
  });
});