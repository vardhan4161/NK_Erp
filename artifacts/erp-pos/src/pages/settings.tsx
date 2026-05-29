import { useState } from "react";
import { useGetMe, useChangePassword } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const { data: user, isLoading } = useGetMe();
  const changePasswordMut = useChangePassword();
  const { toast } = useToast();

  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  const handlePasswordChange = () => {
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    if (!user) return;

    changePasswordMut.mutate({
      id: user.id,
      data: {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword
      }
    }, {
      onSuccess: () => {
        toast({ title: "Password updated successfully" });
        setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
      },
      onError: (err: any) => {
        toast({ title: "Failed to update password", description: err.message, variant: "destructive" });
      }
    });
  };

  if (isLoading) return <div className="p-6">Loading...</div>;

  return (
    <div className="max-w-3xl space-y-6">
      <h2 className="text-2xl font-bold">Profile Settings</h2>

      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>Your account details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Username</Label>
              <Input value={user?.username} disabled />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Input value={user?.role} disabled className="capitalize" />
            </div>
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={user?.fullName} disabled />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={user?.email} disabled />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>Update your account password</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Current Password</Label>
            <Input 
              type="password" 
              value={passwords.currentPassword} 
              onChange={e => setPasswords({...passwords, currentPassword: e.target.value})} 
            />
          </div>
          <div className="space-y-2">
            <Label>New Password</Label>
            <Input 
              type="password" 
              value={passwords.newPassword} 
              onChange={e => setPasswords({...passwords, newPassword: e.target.value})} 
            />
          </div>
          <div className="space-y-2">
            <Label>Confirm New Password</Label>
            <Input 
              type="password" 
              value={passwords.confirmPassword} 
              onChange={e => setPasswords({...passwords, confirmPassword: e.target.value})} 
            />
          </div>
          <Button 
            onClick={handlePasswordChange} 
            disabled={changePasswordMut.isPending || !passwords.newPassword || !passwords.confirmPassword}
          >
            Update Password
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}