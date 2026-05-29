import { useState } from "react";
import { useListStockMovements, useCreateStockMovement, useGetLowStockProducts, useListProducts, getListStockMovementsQueryKey, getGetLowStockProductsQueryKey, getListProductsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Plus, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDateTime } from "@/lib/format";
import type { CreateStockMovementBodyMovementType } from "@workspace/api-client-react";

const MOVEMENT_LABELS: Record<string, string> = {
  PURCHASE: "Kharid",
  SALE: "Bikri",
  RETURN: "Wapsi",
  ADJUSTMENT: "Sudhar",
};

export default function Inventory() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<{
    productId: string;
    movementType: CreateStockMovementBodyMovementType | "";
    quantity: string;
    reference: string;
    notes: string;
  }>({
    productId: "",
    movementType: "",
    quantity: "",
    reference: "",
    notes: ""
  });

  const { data: movements, isLoading } = useListStockMovements({});
  const { data: products } = useListProducts({});
  const { data: lowStockProducts } = useGetLowStockProducts({});

  const createMut = useCreateStockMovement();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleSubmit = () => {
    if (!formData.productId || !formData.movementType || !formData.quantity) return;

    createMut.mutate({
      data: {
        productId: Number(formData.productId),
        movementType: formData.movementType as CreateStockMovementBodyMovementType,
        quantity: Number(formData.quantity),
        reference: formData.reference,
        notes: formData.notes
      }
    }, {
      onSuccess: () => {
        toast({ title: "Stock badlav darj ho gaya" });
        setIsModalOpen(false);
        setFormData({ productId: "", movementType: "", quantity: "", reference: "", notes: "" });
        queryClient.invalidateQueries({ queryKey: getListStockMovementsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetLowStockProductsQueryKey() });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Stock Prabandhan (Inventory)</h2>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Stock Darj Karen
        </Button>
      </div>

      {lowStockProducts && lowStockProducts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-semibold flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5" /> Kam Stock Chetavani ({lowStockProducts.length} products)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {lowStockProducts.map(p => (
              <div key={p.id} className="bg-white p-3 rounded shadow-sm border border-red-100 flex justify-between items-center">
                <div>
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-gray-500">{p.sku} · {p.brand}</div>
                </div>
                <div className="text-right">
                  <div className="text-red-600 font-bold">{p.currentStock} bacha</div>
                  <div className="text-xs text-gray-500">Min: {p.reorderLevel}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="border rounded-md bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tarikh</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Prakar</TableHead>
              <TableHead className="text-right">Sankhya</TableHead>
              <TableHead className="text-right">Pehle</TableHead>
              <TableHead className="text-right">Baad</TableHead>
              <TableHead>Sandarbh</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-4">Loading...</TableCell></TableRow>
            ) : movements?.map((m) => (
              <TableRow key={m.id}>
                <TableCell>{formatDateTime(m.createdAt)}</TableCell>
                <TableCell>
                  <div className="font-medium">{m.productName}</div>
                  <div className="text-xs text-gray-500">{m.productSku}</div>
                </TableCell>
                <TableCell>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    m.movementType === 'PURCHASE' ? 'bg-blue-100 text-blue-800' :
                    m.movementType === 'SALE' ? 'bg-green-100 text-green-800' :
                    m.movementType === 'RETURN' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {MOVEMENT_LABELS[m.movementType] ?? m.movementType}
                  </span>
                </TableCell>
                <TableCell className="text-right font-medium">
                  {m.movementType === 'SALE' ? '-' : '+'}{Math.abs(m.quantity)}
                </TableCell>
                <TableCell className="text-right text-gray-500">{m.previousStock}</TableCell>
                <TableCell className="text-right font-medium">{m.newStock}</TableCell>
                <TableCell className="text-sm text-gray-500">{m.reference || "—"}</TableCell>
              </TableRow>
            ))}
            {movements?.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center py-4">Koi stock badlav nahi mila</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Stock Badlav Darj Karen</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Product</Label>
              <Select value={formData.productId} onValueChange={v => setFormData({...formData, productId: v})}>
                <SelectTrigger><SelectValue placeholder="Product chunein" /></SelectTrigger>
                <SelectContent>
                  {products?.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.name} ({p.sku}) — {p.currentStock} bacha</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Badlav Prakar</Label>
              <Select value={formData.movementType} onValueChange={v => setFormData({...formData, movementType: v as any})}>
                <SelectTrigger><SelectValue placeholder="Prakar chunein" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PURCHASE">Kharid (Stock Badhaao)</SelectItem>
                  <SelectItem value="RETURN">Wapsi (Stock Badhaao)</SelectItem>
                  <SelectItem value="ADJUSTMENT">Sudhar (Sahi karo)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Sankhya (Quantity)</Label>
              <Input type="number" value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} placeholder="jaise: 10" />
            </div>
            <div className="space-y-2">
              <Label>Sandarbh (Optional)</Label>
              <Input value={formData.reference} onChange={e => setFormData({...formData, reference: e.target.value})} placeholder="PO number / Bill number" />
            </div>
            <div className="space-y-2">
              <Label>Tippani (Optional)</Label>
              <Input value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Koi vishesh jaankari" />
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
