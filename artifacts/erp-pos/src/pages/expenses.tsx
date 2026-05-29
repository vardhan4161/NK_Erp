import { useState } from "react";
import { useListExpenses, useCreateExpense, useDeleteExpense, getListExpensesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDate, formatINR } from "@/lib/format";

const EXPENSE_CATEGORIES = [
  "Kiraya (Rent)", "Bijli (Electricity)", "Paani", "Internet / Phone",
  "Tankhwa (Salaries)", "Marketing / Advertising", "Transport",
  "Samachar / Stationary", "Marammat (Maintenance)", "Insurance", "Anya (Other)"
];

export default function Expenses() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    category: "",
    description: "",
    amount: "",
    expenseDate: new Date().toISOString().split('T')[0],
    paymentMethod: "",
    reference: ""
  });

  const { data: expenses, isLoading } = useListExpenses({});
  const createMut = useCreateExpense();
  const deleteMut = useDeleteExpense();

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleOpenModal = () => {
    setFormData({
      category: "",
      description: "",
      amount: "",
      expenseDate: new Date().toISOString().split('T')[0],
      paymentMethod: "",
      reference: ""
    });
    setIsModalOpen(true);
  };

  const handleSubmit = () => {
    createMut.mutate({
      data: {
        ...formData,
        amount: Number(formData.amount)
      }
    }, {
      onSuccess: () => {
        toast({ title: "Kharcha darj ho gaya" });
        setIsModalOpen(false);
        queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey() });
      }
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Kya aap yeh kharcha delete karna chahte hain?")) {
      deleteMut.mutate({ id }, {
        onSuccess: () => {
          toast({ title: "Kharcha delete ho gaya" });
          queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey() });
        }
      });
    }
  };

  const totalAmount = expenses?.reduce((sum, e) => sum + e.amount, 0) ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Kharcha (Expenses)</h2>
          {expenses && expenses.length > 0 && (
            <p className="text-sm text-muted-foreground mt-1">Kul: {formatINR(totalAmount)}</p>
          )}
        </div>
        <Button onClick={handleOpenModal}>
          <Plus className="w-4 h-4 mr-2" /> Kharcha Darj Karen
        </Button>
      </div>

      <div className="border rounded-md bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tarikh</TableHead>
              <TableHead>Prakar</TableHead>
              <TableHead>Vivaran</TableHead>
              <TableHead>Bhugtan Tarika</TableHead>
              <TableHead>Sandarbh</TableHead>
              <TableHead className="text-right">Rashi (₹)</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-4">Loading...</TableCell></TableRow>
            ) : expenses?.map((expense) => (
              <TableRow key={expense.id}>
                <TableCell>{formatDate(expense.expenseDate)}</TableCell>
                <TableCell className="font-medium">{expense.category}</TableCell>
                <TableCell className="text-gray-600">{expense.description}</TableCell>
                <TableCell>{expense.paymentMethod}</TableCell>
                <TableCell className="text-gray-500 text-sm">{expense.reference || "—"}</TableCell>
                <TableCell className="text-right font-semibold">{formatINR(expense.amount)}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleDelete(expense.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {expenses?.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center py-4">Koi kharcha nahi mila</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kharcha Darj Karen</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Prakar (Category)</Label>
              <Select value={formData.category} onValueChange={v => setFormData({...formData, category: v})}>
                <SelectTrigger><SelectValue placeholder="Prakar chunein" /></SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Vivaran (Description)</Label>
              <Input value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="jaise: April ka kiraya" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Rashi (₹)</Label>
                <Input type="number" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <Label>Tarikh</Label>
                <Input type="date" value={formData.expenseDate} onChange={e => setFormData({...formData, expenseDate: e.target.value})} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Bhugtan Tarika</Label>
              <Select value={formData.paymentMethod} onValueChange={v => setFormData({...formData, paymentMethod: v})}>
                <SelectTrigger><SelectValue placeholder="Tarika chunein" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Nakit (Cash)</SelectItem>
                  <SelectItem value="UPI">UPI (GPay / PhonePe / Paytm)</SelectItem>
                  <SelectItem value="Bank Transfer">Bank Transfer / NEFT / RTGS</SelectItem>
                  <SelectItem value="Cheque">Cheque</SelectItem>
                  <SelectItem value="Credit Card">Credit Card</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Sandarbh (Optional)</Label>
              <Input value={formData.reference} onChange={e => setFormData({...formData, reference: e.target.value})} placeholder="Receipt / Bill number" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Raddh Karen</Button>
            <Button onClick={handleSubmit} disabled={createMut.isPending}>Surakshit Karen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
