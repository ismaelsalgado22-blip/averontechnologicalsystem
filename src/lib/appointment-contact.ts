export type AppointmentSource = "appointments" | "guest_appointments";

export function guestContact(name: string, phone: string) {
  const contact_name = name.trim();
  const contact_phone = phone.trim();
  if (!contact_name) throw new Error("Informe o nome do contato");
  if (!contact_phone) throw new Error("Informe o telefone do contato");
  return { contact_name, contact_phone };
}

export function appointmentContact(a: {
  contact_name?: string | null;
  contact_phone?: string | null;
  clients?: { name?: string | null; phone?: string | null; whatsapp?: string | null } | null;
}) {
  return {
    name: a.contact_name || a.clients?.name || "",
    phone: a.contact_phone || a.clients?.whatsapp || a.clients?.phone || "",
  };
}