import { useState } from "react";
import { useListUsers, useCreateUser, useUpdateUser, getListUsersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { User, CreateUserBodyRole } from "@workspace/api-client-react";

export default function Users() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    fullName: "",
    password: "",
    role: "cashier" as CreateUserBodyRole,
    isActive: true
  });
  
  const { data: users, isLoading } = useListUsers();
  const createMut = useCreateUser();
  const updateMut = useUpdateUser();
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleOpenModal = (user: User | null = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        password: "", // leave empty
        role: user.role as CreateUserBodyRole,
        isActive: user.isActive
      });
    } else {
      setEditingUser(null);
      setFormData({ username: "", email: "", fullName: "", password: "", role: "cashier", isActive: true });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = () => {
    if (editingUser) {
      updateMut.mutate({
        id: editingUser.id,
        data: {
          email: formData.email,
          fullName: formData.fullName,
          role: formData.role,
          isActive: formData.isActive
        }
      }, {
        onSuccess: () => {
          toast({ title: "User updated" });
          setIsModalOpen(false);
          queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
        }
      });
    } else {
      if (!formData.password) {
        toast({ title: "Password required", variant: "destructive" });
        return;
      }
      createMut.mutate({
        data: formData
      }, {
        onSuccess: () => {
          toast({ title: "User created" });
          setIsModalOpen(false);
          queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
        }
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">User Management</h2>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="w-4 h-4 mr-2" /> Add User
        </Button>
      </div>

      <div className="border rounded-md bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Username</TableHead>
              <TableHead>Full Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-4">Loading...</TableCell></TableRow>
            ) : users?.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.username}</TableCell>
                <TableCell>{user.fullName}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell className="capitalize">{user.role}</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 text-xs rounded-full ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => handleOpenModal(user)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Edit User' : 'Add User'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Username</Label>
              <Input value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} disabled={!!editingUser} />
            </div>
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
            </div>
            {!editingUser && (
              <div className="space-y-2">
                <Label>Password</Label>
                <Input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
              </div>
            )}
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={formData.role} onValueChange={v => setFormData({...formData, role: v as CreateUserBodyRole})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="cashier">Cashier</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {editingUser && (
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.isActive ? "true" : "false"} onValueChange={v => setFormData({...formData, isActive: v === "true"})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Active</SelectItem>
                    <SelectItem value="false">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
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