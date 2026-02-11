import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { FileUp, FileText } from "lucide-react";

interface Employee {
  id: string;
  name: string;
}

interface JustificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: Employee[];
  onSuccess: () => void;
  initialData?: any; // Recebe os dados para edição
}

export const JustificationModal = ({
  open,
  onOpenChange,
  employees,
  onSuccess,
  initialData,
}: JustificationModalProps) => {
  const [loading, setLoading] = useState(false);
  const [employeeId, setEmployeeId] = useState("");
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  const [isExcused, setIsExcused] = useState(true);
  const [file, setFile] = useState<File | null>(null);

  // Efeito para preencher o formulário ao abrir em modo de edição
  // ... imports e estados

  // Efeito para preencher o formulário ao abrir em modo de edição
  useEffect(() => {
    if (open) {
      if (initialData) {
        setEmployeeId(initialData.employee_id);
        // AJUSTE AQUI: Garante que pegamos apenas YYYY-MM-DD
        // Isso evita bugs de fuso horário se o banco retornar Timestamp
        setDate(initialData.date ? initialData.date.substring(0, 10) : "");

        setReason(initialData.reason);
        setIsExcused(initialData.is_excused);
        setFile(null);
      } else {
        resetForm();
      }
    }
  }, [open, initialData]);

  // ... restante do código

  const handleUpload = async (filePath: string) => {
    if (!file) return null;
    const { data, error } = await supabase.storage
      .from("justifications")
      .upload(filePath, file);
    if (error) throw error;
    return data.path;
  };

  const handleSubmit = async () => {
    if (!employeeId || !date || !reason) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }

    setLoading(true);
    try {
      let documentUrl = initialData?.document_url || null; // Mantém URL antiga se não houver novo arquivo

      if (file) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${employeeId}/${fileName}`;
        await handleUpload(filePath);

        const {
          data: { publicUrl },
        } = supabase.storage.from("justifications").getPublicUrl(filePath);
        documentUrl = publicUrl;
      }

      if (initialData) {
        // MODO EDIÇÃO
        const { error } = await (supabase as any)
          .from("justifications")
          .update({
            employee_id: employeeId,
            date,
            reason,
            is_excused: isExcused,
            document_url: documentUrl,
          })
          .eq("id", initialData.id);

        if (error) throw error;
        toast.success("Justificativa atualizada!");
      } else {
        // MODO CRIAÇÃO
        const { error } = await (supabase as any)
          .from("justifications")
          .insert({
            employee_id: employeeId,
            date,
            reason,
            is_excused: isExcused,
            document_url: documentUrl,
          });

        if (error) throw error;
        toast.success("Justificativa registrada!");
      }

      resetForm();
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar justificativa.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmployeeId("");
    setDate("");
    setReason("");
    setIsExcused(true);
    setFile(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-display">
            {initialData
              ? "Editar Justificativa"
              : "Justificar Falta / Atestado"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Funcionário</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o funcionário" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Data da Falta</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Motivo / Descrição</Label>
            <Textarea
              placeholder="Ex: Atestado médico de 2 dias, consulta odontológica..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <div className="flex items-center space-x-2 py-2">
            <Checkbox
              id="excused"
              checked={isExcused}
              onCheckedChange={(checked) => setIsExcused(!!checked)}
            />
            <Label
              htmlFor="excused"
              className="text-sm font-medium leading-none cursor-pointer"
            >
              Abonar falta (Horas não serão descontadas)
            </Label>
          </div>

          <div className="space-y-2">
            <Label>
              Anexar Documento {initialData?.document_url && "(Substituir)"}
            </Label>
            {initialData?.document_url && !file && (
              <div className="text-xs text-blue-600 mb-2 flex items-center">
                <FileText className="w-3 h-3 mr-1" /> Documento atual anexado
              </div>
            )}
            <div className="flex items-center gap-2">
              <Input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="cursor-pointer"
                accept=".pdf,.jpg,.jpeg,.png"
              />
              <FileUp className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-[10px] text-muted-foreground">
              PDF, JPG ou PNG (Máx 5MB)
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="gradient-primary text-white"
          >
            {loading
              ? "Salvando..."
              : initialData
                ? "Atualizar"
                : "Salvar Justificativa"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
