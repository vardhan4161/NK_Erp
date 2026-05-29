import { useState } from "react";
import { useListSales, useGetSale, useReturnSale, getListSalesQueryKey, getGetSaleQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Search, Eye, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDateTime, formatDateTimeFull, formatINR } from "@/lib/format";

const STATUS_LABELS: Record<string, string> = {
  COMPLETED: "Poori",
  RETURNED: "Wapas",
  PARTIAL_RETURN: "Aashik Wapas",
};

export default function Sales() {
  const [search, setSearch] = useState("");
  const [selectedSaleId, setSelectedSaleId] = useState<number | null>(null);

  const { data: sales, isLoading } = useListSales({ search });
  const { data: saleDetail, isLoading: detailLoading } = useGetSale(selectedSaleId || 0, { query: { enabled: !!selectedSaleId, queryKey: getGetSaleQueryKey(selectedSaleId || 0) } });

  const returnMut = useReturnSale();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleReturn = (saleId: number) => {
    if (!saleDetail) return;
    const itemIds = saleDetail.items.map(i => i.id);
    returnMut.mutate({
      id: saleId,
      data: {
        reason: "Grahak ne wapas kiya",
        itemIds
      }
    }, {
      onSuccess: () => {
        toast({ title: "Bikri safaltapurvak wapas ho gayi" });
        queryClient.invalidateQueries({ queryKey: getGetSaleQueryKey(saleId) });
        queryClient.invalidateQueries({ queryKey: getListSalesQueryKey() });
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Bikri Itihaas (Sales History)</h2>
      </div>

      <div className="flex gap-4 mb-4">
        <div className="relative w-72">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            className="pl-9"
            placeholder="Invoice ya grahak ke naam se khojein..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="border rounded-md bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead>Tarikh</TableHead>
              <TableHead>Grahak</TableHead>
              <TableHead>Bhugtan</TableHead>
              <TableHead className="text-right">Kul Rashi</TableHead>
              <TableHead>Sthiti</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-4">Loading...</TableCell></TableRow>
            ) : sales?.map((sale) => (
              <TableRow key={sale.id} className="cursor-pointer hover:bg-gray-50" onClick={() => setSelectedSaleId(sale.id)}>
                <TableCell className="font-medium text-primary">{sale.invoiceNumber}</TableCell>
                <TableCell>{formatDateTime(sale.createdAt)}</TableCell>
                <TableCell>{sale.customerName || 'Walk-in Grahak'}</TableCell>
                <TableCell>{sale.paymentMethod}</TableCell>
                <TableCell className="text-right font-semibold">{formatINR(sale.grandTotal)}</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    sale.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                    sale.status === 'RETURNED' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {STATUS_LABELS[sale.status] ?? sale.status}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedSaleId(sale.id); }}>
                    <Eye className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {sales?.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center py-4">Koi bikri nahi mili</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!selectedSaleId} onOpenChange={(open) => !open && setSelectedSaleId(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Bikri Vivaran — {saleDetail?.sale.invoiceNumber}</DialogTitle>
          </DialogHeader>

          {detailLoading ? (
            <div className="py-8 text-center">Vivaran load ho raha hai...</div>
          ) : saleDetail ? (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4 text-sm bg-gray-50 p-4 rounded-md">
                <div>
                  <span className="text-gray-500">Tarikh:</span>
                  <div className="font-medium">{formatDateTimeFull(saleDetail.sale.createdAt)}</div>
                </div>
                <div>
                  <span className="text-gray-500">Grahak:</span>
                  <div className="font-medium">{saleDetail.sale.customerName || 'Walk-in Grahak'}</div>
                  {saleDetail.sale.customerPhone && <div className="text-gray-500">{saleDetail.sale.customerPhone}</div>}
                </div>
                <div>
                  <span className="text-gray-500">Sthiti:</span>
                  <div>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      saleDetail.sale.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {STATUS_LABELS[saleDetail.sale.status] ?? saleDetail.sale.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Maal</TableHead>
                      <TableHead className="text-center">Sankhya</TableHead>
                      <TableHead className="text-right">Mulya</TableHead>
                      <TableHead className="text-right">GST</TableHead>
                      <TableHead className="text-right">Kul</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {saleDetail.items.map(item => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="font-medium">{item.productName}</div>
                          <div className="text-xs text-gray-500">{item.productSku}</div>
                        </TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell className="text-right">{formatINR(item.unitPrice)}</TableCell>
                        <TableCell className="text-right">{formatINR(item.gstAmount)}</TableCell>
                        <TableCell className="text-right font-medium">{formatINR(item.totalPrice)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-end">
                <div className="w-72 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Mool Rashi:</span>
                    <span>{formatINR(saleDetail.sale.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Chhoot:</span>
                    <span>-{formatINR(saleDetail.sale.discountAmount)}</span>
                  </div>
                  {saleDetail.sale.cgst > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">CGST:</span>
                      <span>{formatINR(saleDetail.sale.cgst)}</span>
                    </div>
                  )}
                  {saleDetail.sale.sgst > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">SGST:</span>
                      <span>{formatINR(saleDetail.sale.sgst)}</span>
                    </div>
                  )}
                  {saleDetail.sale.igst > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">IGST:</span>
                      <span>{formatINR(saleDetail.sale.igst)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>Kul Rashi:</span>
                    <span>{formatINR(saleDetail.sale.grandTotal)}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <DialogFooter className="flex justify-between items-center sm:justify-between">
            {saleDetail?.sale.status === 'COMPLETED' ? (
              <Button variant="destructive" onClick={() => handleReturn(saleDetail.sale.id)} disabled={returnMut.isPending}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Wapsi Karen (Return)
              </Button>
            ) : <div />}
            <Button variant="outline" onClick={() => setSelectedSaleId(null)}>Band Karen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
