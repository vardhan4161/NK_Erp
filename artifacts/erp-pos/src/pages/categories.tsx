import { useState } from "react";
import { useListCategories, useCreateCategory, useUpdateCategory, useDeleteCategory, getListCategoriesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Category } from "@workspace/api-client-react";

export default function Categories() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "" });
  
  const { data: categories, isLoading } = useListCategories();
  const createMut = useCreateCategory();
  const updateMut = useUpdateCategory();
  const deleteMut = useDeleteCategory();
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleOpenModal = (category: Category | null = null) => {
    if (category) {
      setEditingCategory(category);
      setFormData({ name: category.name, description: category.description || "" });
    } else {
      setEditingCategory(null);
      setFormData({ name: "", description: "" });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = () => {
    if (editingCategory) {
      updateMut.mutate({
        id: editingCategory.id,
        data: formData
      }, {
        onSuccess: () => {
          toast({ title: "Category updated" });
          setIsModalOpen(false);
          queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
        }
      });
    } else {
      createMut.mutate({
        data: formData
      }, {
        onSuccess: () => {
          toast({ title: "Category created" });
          setIsModalOpen(false);
          queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
        }
      });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this category?")) {
      deleteMut.mutate({ id }, {
        onSuccess: () => {
          toast({ title: "Category deleted" });
          queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
        },
        onError: (err: any) => {
          toast({ title: "Error deleting category", description: err.message, variant: "destructive" });
        }
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Categories</h2>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="w-4 h-4 mr-2" /> Add Category
        </Button>
      </div>

      <div className="border rounded-md bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Products</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={4} className="text-center py-4">Loading...</TableCell></TableRow>
            ) : categories?.map((category) => (
              <TableRow key={category.id}>
                <TableCell className="font-medium">{category.name}</TableCell>
                <TableCell className="text-gray-500">{category.description}</TableCell>
                <TableCell className="text-right">{category.productCount}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => handleOpenModal(category)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleDelete(category.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {categories?.length === 0 && (
              <TableRow><TableCell colSpan={4} className="text-center py-4">No categories found</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Edit Category' : 'Add Category'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createMut.isPending || updateMut.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}