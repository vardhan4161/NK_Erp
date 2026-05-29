import { useState } from "react";
import { useListProducts, useCreateSale, getGetDashboardStatsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Minus, Trash2, CreditCard, Receipt, ShoppingCart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatINR } from "@/lib/format";
import type { Product, SaleItemInput, CreateSaleBodyPaymentMethod } from "@workspace/api-client-react";

interface CartItem extends Product {
  cartQuantity: number;
  discount: number;
}

export default function Pos() {
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isInterState, setIsInterState] = useState(false);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<CreateSaleBodyPaymentMethod>("CASH");
  const [amountPaid, setAmountPaid] = useState<number | string>("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const { data: products } = useListProducts({ search });
  const createSale = useCreateSale();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, cartQuantity: item.cartQuantity + 1 } : item);
      }
      return [...prev, { ...product, cartQuantity: 1, discount: 0 }];
    });
  };

  const updateQuantity = (id: number, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQ = Math.max(1, item.cartQuantity + delta);
        return { ...item, cartQuantity: newQ };
      }
      return item;
    }));
  };

  const removeFromCart = (id: number) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const calculateTotals = () => {
    let subtotal = 0;
    let totalTax = 0;

    cart.forEach(item => {
      const itemSubtotal = item.sellingPrice * item.cartQuantity - item.discount;
      subtotal += itemSubtotal;
      const tax = itemSubtotal * (item.gstRate / 100);
      totalTax += tax;
    });

    const finalSubtotal = subtotal - discountAmount;
    const grandTotal = finalSubtotal + totalTax;

    return { subtotal: finalSubtotal, totalTax, grandTotal };
  };

  const totals = calculateTotals();

  const handleCheckout = () => {
    const saleItems: SaleItemInput[] = cart.map(item => ({
      productId: item.id,
      quantity: item.cartQuantity,
      unitPrice: item.sellingPrice,
      discount: item.discount
    }));

    createSale.mutate({
      data: {
        customerName: customerName || null,
        customerPhone: customerPhone || null,
        isInterState,
        discountAmount,
        paymentMethod,
        amountPaid: Number(amountPaid) || totals.grandTotal,
        items: saleItems
      }
    }, {
      onSuccess: () => {
        toast({ title: "Bikri safaltapurvak poori hui" });
        setCart([]);
        setCustomerName("");
        setCustomerPhone("");
        setDiscountAmount(0);
        setAmountPaid("");
        setPaymentModalOpen(false);
        queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
      },
      onError: (err: any) => {
        toast({ title: "Bikri mein error", description: err.message, variant: "destructive" });
      }
    });
  };

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-8rem)] gap-4">
      {/* Products Section */}
      <div className="flex-1 flex flex-col gap-4 bg-white p-4 rounded-lg border">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            className="pl-9"
            placeholder="Naam, SKU ya barcode se product khojein..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {products?.map(product => (
              <Card
                key={product.id}
                className={`cursor-pointer hover:border-primary transition-colors ${product.currentStock <= 0 ? 'opacity-50' : ''}`}
                onClick={() => product.currentStock > 0 && addToCart(product)}
              >
                <CardContent className="p-4 flex flex-col h-full justify-between">
                  <div>
                    <h3 className="font-semibold line-clamp-2">{product.name}</h3>
                    <p className="text-sm text-gray-500 text-xs mt-1">{product.sku}</p>
                    <p className="text-xs text-gray-400">{product.brand}</p>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="font-bold text-lg">{formatINR(product.sellingPrice)}</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${product.currentStock > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {product.currentStock} bacha
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Cart Section */}
      <div className="w-full md:w-96 flex flex-col bg-white p-4 rounded-lg border">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <ShoppingCart className="w-5 h-5" /> Mौजuda Bikri
        </h2>

        <div className="flex-1 overflow-y-auto mb-4 border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="w-24 text-center">Sankhya</TableHead>
                <TableHead className="text-right">Kul</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cart.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                    Cart khali hai
                  </TableCell>
                </TableRow>
              ) : (
                cart.map(item => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      <div className="line-clamp-1">{item.name}</div>
                      <div className="text-xs text-gray-500">{formatINR(item.sellingPrice)}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-2">
                        <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.id, -1)}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="text-sm w-4 text-center">{item.cartQuantity}</span>
                        <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.id, 1)}>
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatINR((item.sellingPrice * item.cartQuantity) - item.discount)}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700" onClick={() => removeFromCart(item.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Mool Rashi (Subtotal)</span>
            <span>{formatINR(totals.subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">GST {isInterState ? '(IGST)' : '(CGST+SGST)'}</span>
            <span>{formatINR(totals.totalTax)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">
              <label className="flex items-center gap-1 cursor-pointer">
                <input type="checkbox" checked={isInterState} onChange={e => setIsInterState(e.target.checked)} className="mr-1" />
                Antarrajyiya bikri (IGST)
              </label>
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-600 shrink-0">Chhoot (₹)</span>
            <Input
              type="number"
              className="h-7 text-sm"
              value={discountAmount || ""}
              onChange={e => setDiscountAmount(Number(e.target.value) || 0)}
              placeholder="0"
            />
          </div>
          <div className="flex justify-between text-lg font-bold border-t pt-2">
            <span>Kul Rashi</span>
            <span>{formatINR(totals.grandTotal)}</span>
          </div>
          <Button
            className="w-full h-12 text-lg mt-2"
            disabled={cart.length === 0}
            onClick={() => setPaymentModalOpen(true)}
          >
            <CreditCard className="w-5 h-5 mr-2" /> Bhugtan Karen {formatINR(totals.grandTotal)}
          </Button>
        </div>
      </div>

      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bhugtan Poora Karen</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Grahak ka Naam (Vaikalpik)</Label>
                <Input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Rahul Sharma" />
              </div>
              <div className="space-y-2">
                <Label>Mobile Nambar (Vaikalpik)</Label>
                <Input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="98765 43210" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Bhugtan Tarika</Label>
              <Select value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Tarika chunein" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Nakit (Cash)</SelectItem>
                  <SelectItem value="CARD">Card</SelectItem>
                  <SelectItem value="UPI">UPI (GPay / PhonePe / Paytm)</SelectItem>
                  <SelectItem value="CREDIT">Udhaar (Credit)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-gray-50 p-3 rounded-md space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Kul Rashi:</span>
                <span className="font-bold text-base">{formatINR(totals.grandTotal)}</span>
              </div>
            </div>

            {paymentMethod === "CASH" && (
              <div className="space-y-2">
                <Label>Diya Gaya Paisa (₹)</Label>
                <Input
                  type="number"
                  value={amountPaid}
                  onChange={e => setAmountPaid(e.target.value)}
                  placeholder={totals.grandTotal.toFixed(2)}
                />
                {Number(amountPaid) > totals.grandTotal && (
                  <p className="text-sm text-green-600 font-medium">
                    Wapas karna hai: {formatINR(Number(amountPaid) - totals.grandTotal)}
                  </p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentModalOpen(false)}>Raddh Karen</Button>
            <Button onClick={handleCheckout} disabled={createSale.isPending}>
              <Receipt className="w-4 h-4 mr-2" />
              {createSale.isPending ? "Ho raha hai..." : "Bikri Poori Karen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
