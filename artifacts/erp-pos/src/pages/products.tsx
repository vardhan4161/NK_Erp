import { useState } from "react";
import { useListProducts, useCreateProduct, useUpdateProduct, useListCategories, getListProductsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatINR } from "@/lib/format";
import type { Product } from "@workspace/api-client-react";

const GST_RATES = ["0", "5", "12", "18", "28"];

export default function Products() {
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const { data: products, isLoading } = useListProducts({ search });
  const { data: categories } = useListCategories();

  const createMut = useCreateProduct();
  const updateMut = useUpdateProduct();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    categoryId: "",
    brand: "",
    model: "",
    barcode: "",
    costPrice: "",
    sellingPrice: "",
    gstRate: "18",
    reorderLevel: "5",
    unit: "pcs",
    initialStock: "0"
  });

  const handleOpenModal = (product: Product | null = null) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        categoryId: product.categoryId.toString(),
        brand: product.brand || "",
        model: product.model || "",
        barcode: product.barcode || "",
        costPrice: product.costPrice.toString(),
        sellingPrice: product.sellingPrice.toString(),
        gstRate: product.gstRate.toString(),
        reorderLevel: product.reorderLevel.toString(),
        unit: product.unit,
        initialStock: "0"
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: "", categoryId: "", brand: "", model: "", barcode: "",
        costPrice: "", sellingPrice: "", gstRate: "18", reorderLevel: "5", unit: "pcs", initialStock: "0"
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = () => {
    if (editingProduct) {
      updateMut.mutate({
        id: editingProduct.id,
        data: {
          name: formData.name,
          categoryId: Number(formData.categoryId),
          brand: formData.brand,
          model: formData.model,
          barcode: formData.barcode,
          costPrice: Number(formData.costPrice),
          sellingPrice: Number(formData.sellingPrice),
          gstRate: Number(formData.gstRate),
          reorderLevel: Number(formData.reorderLevel),
          unit: formData.unit
        }
      }, {
        onSuccess: () => {
          toast({ title: "Product update ho gaya" });
          setIsModalOpen(false);
          queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
        }
      });
    } else {
      createMut.mutate({
        data: {
          ...formData,
          categoryId: Number(formData.categoryId),
          costPrice: Number(formData.costPrice),
          sellingPrice: Number(formData.sellingPrice),
          gstRate: Number(formData.gstRate),
          reorderLevel: Number(formData.reorderLevel),
          initialStock: Number(formData.initialStock)
        }
      }, {
        onSuccess: () => {
          toast({ title: "Product ban gaya" });
          setIsModalOpen(false);
          queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
        }
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Products</h2>
        <Button onClick={() => handleOpenModal()}><Plus className="w-4 h-4 mr-2" /> Product Jodein</Button>
      </div>

      <div className="flex gap-4 mb-4">
        <div className="relative w-72">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            className="pl-9"
            placeholder="Product khojein..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="border rounded-md bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Naam</TableHead>
              <TableHead>Shreni</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead className="text-right">Lagat (₹)</TableHead>
              <TableHead className="text-right">Bikri Mulya (₹)</TableHead>
              <TableHead className="text-right">GST</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={9} className="text-center py-4">Loading...</TableCell></TableRow>
            ) : products?.map((product) => (
              <TableRow key={product.id}>
                <TableCell className="font-medium text-xs text-gray-500">{product.sku}</TableCell>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell>{product.categoryName}</TableCell>
                <TableCell className="text-gray-500">{product.brand || "—"}</TableCell>
                <TableCell className="text-right">{formatINR(product.costPrice)}</TableCell>
                <TableCell className="text-right font-semibold">{formatINR(product.sellingPrice)}</TableCell>
                <TableCell className="text-right text-gray-500">{product.gstRate}%</TableCell>
                <TableCell className="text-right">
                  <span className={`px-2 py-1 rounded-full text-xs ${product.currentStock <= product.reorderLevel ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                    {product.currentStock}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => handleOpenModal(product)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Product Badlein' : 'Naya Product Jodein'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Naam</Label>
              <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="jaise: Samsung Galaxy S24" />
            </div>
            <div className="space-y-2">
              <Label>Shreni (Category)</Label>
              <Select value={formData.categoryId} onValueChange={v => setFormData({...formData, categoryId: v})}>
                <SelectTrigger><SelectValue placeholder="Shreni chunein" /></SelectTrigger>
                <SelectContent>
                  {categories?.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Brand</Label>
              <Input value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} placeholder="jaise: Samsung, Apple" />
            </div>
            <div className="space-y-2">
              <Label>Model</Label>
              <Input value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} placeholder="Model number" />
            </div>
            <div className="space-y-2">
              <Label>Kharid Mulya / Lagat (₹)</Label>
              <Input type="number" value={formData.costPrice} onChange={e => setFormData({...formData, costPrice: e.target.value})} placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <Label>Bikri Mulya / MRP (₹)</Label>
              <Input type="number" value={formData.sellingPrice} onChange={e => setFormData({...formData, sellingPrice: e.target.value})} placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <Label>GST Dar (%)</Label>
              <Select value={formData.gstRate} onValueChange={v => setFormData({...formData, gstRate: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {GST_RATES.map(r => <SelectItem key={r} value={r}>{r}%</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Barcode / HSN</Label>
              <Input value={formData.barcode} onChange={e => setFormData({...formData, barcode: e.target.value})} placeholder="Barcode number" />
            </div>
            <div className="space-y-2">
              <Label>Reorder Level</Label>
              <Input type="number" value={formData.reorderLevel} onChange={e => setFormData({...formData, reorderLevel: e.target.value})} />
            </div>
            {!editingProduct && (
              <div className="space-y-2">
                <Label>Shuruati Stock</Label>
                <Input type="number" value={formData.initialStock} onChange={e => setFormData({...formData, initialStock: e.target.value})} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Raddh Karen</Button>
            <Button onClick={handleSubmit} disabled={createMut.isPending || updateMut.isPending}>Surakshit Karen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
