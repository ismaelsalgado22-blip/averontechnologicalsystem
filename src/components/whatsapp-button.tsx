import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { openWhatsApp } from "@/lib/format";
import { MSG, MSG_OPTIONS, type MsgVars } from "@/lib/messages";

export function WhatsAppButton({
  phone,
  vars,
  template = "livre",
  label = "WhatsApp",
  size = "sm",
  variant = "secondary",
}: {
  phone?: string | null;
  vars?: MsgVars;
  template?: keyof typeof MSG;
  label?: string;
  size?: "sm" | "default" | "icon";
  variant?: "secondary" | "default" | "ghost" | "outline";
}) {
  const [open, setOpen] = useState(false);
  const [tpl, setTpl] = useState<keyof typeof MSG>(template);
  const [text, setText] = useState(MSG[template](vars ?? {}));
  const [to, setTo] = useState(phone ?? "");

  const pick = (key: keyof typeof MSG) => {
    setTpl(key);
    setText(MSG[key](vars ?? {}));
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) {
          setTo(phone ?? "");
          setText(MSG[tpl](vars ?? {}));
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant={variant} size={size}>
          <MessageCircle className="size-4" />
          {size !== "icon" && label}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Enviar por WhatsApp</DialogTitle>
          <DialogDescription>
            Escolha um modelo, revise a mensagem e abra a conversa no WhatsApp.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {MSG_OPTIONS.map((o) => (
              <Button
                key={o.key}
                type="button"
                size="sm"
                variant={tpl === o.key ? "default" : "outline"}
                onClick={() => pick(o.key)}
              >
                {o.label}
              </Button>
            ))}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wa-phone">Número</Label>
            <Input
              id="wa-phone"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="(00) 00000-0000"
              maxLength={20}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wa-msg">Mensagem</Label>
            <Textarea
              id="wa-msg"
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 1200))}
              rows={6}
              maxLength={1200}
            />
          </div>
          <Button
            className="w-full"
            disabled={!to.replace(/\D/g, "")}
            onClick={() => {
              openWhatsApp(to, text);
              setOpen(false);
            }}
          >
            <MessageCircle className="size-4" />
            Abrir WhatsApp
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
