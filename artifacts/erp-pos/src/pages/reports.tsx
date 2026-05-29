import { useGetGstReport, useGetProfitLoss, useGetCategorySales } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from "recharts";
import { formatINR } from "@/lib/format";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function Reports() {
  const { data: gstReport, isLoading: gstLoading } = useGetGstReport({});
  const { data: profitLoss, isLoading: plLoading } = useGetProfitLoss({});
  const { data: categorySales, isLoading: catLoading } = useGetCategorySales({});

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Reports aur Vishleshan</h2>
      </div>

      <Tabs defaultValue="pl" className="w-full">
        <TabsList className="grid w-full grid-cols-3 md:w-[420px]">
          <TabsTrigger value="pl">Laabh-Haani</TabsTrigger>
          <TabsTrigger value="gst">GST Report</TabsTrigger>
          <TabsTrigger value="categories">Shreni-vaar</TabsTrigger>
        </TabsList>

        <TabsContent value="pl" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Laabh-Haani Vivaran (Profit & Loss)</CardTitle>
              <CardDescription>Aay, lagat aur munafe ka sankshipt vivaran</CardDescription>
            </CardHeader>
            <CardContent>
              {plLoading ? <div className="py-8 text-center">Loading...</div> : profitLoss ? (
                <div className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                      <div className="text-sm text-blue-600 font-medium">Kul Aay (Revenue)</div>
                      <div className="text-2xl font-bold text-blue-900">{formatINR(profitLoss.revenue)}</div>
                    </div>
                    <div className="p-4 bg-orange-50 rounded-lg border border-orange-100">
                      <div className="text-sm text-orange-600 font-medium">Maal ki Lagat (COGS)</div>
                      <div className="text-2xl font-bold text-orange-900">{formatINR(profitLoss.costOfGoods)}</div>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                      <div className="text-sm text-green-600 font-medium">Sthool Laabh (Gross Profit)</div>
                      <div className="text-2xl font-bold text-green-900">{formatINR(profitLoss.grossProfit)}</div>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="p-4 bg-red-50 rounded-lg border border-red-100">
                      <div className="text-sm text-red-600 font-medium">Kul Kharcha (Expenses)</div>
                      <div className="text-2xl font-bold text-red-900">{formatINR(profitLoss.totalExpenses)}</div>
                    </div>
                    <div className={`p-4 rounded-lg border shadow-sm ${profitLoss.netProfit >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                      <div className={`text-sm font-medium ${profitLoss.netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                        Shuddh Laabh / Haani (Net P&L)
                      </div>
                      <div className={`text-3xl font-bold ${profitLoss.netProfit >= 0 ? 'text-emerald-900' : 'text-red-900'}`}>
                        {formatINR(profitLoss.netProfit)}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-8 border-t pt-4">
                    <div>
                      <div className="text-sm text-gray-500">Sthool Margin</div>
                      <div className="text-lg font-semibold">{profitLoss.grossMargin.toFixed(1)}%</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Shuddh Margin</div>
                      <div className="text-lg font-semibold">{profitLoss.netMargin.toFixed(1)}%</div>
                    </div>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gst" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>GST Kar Vivaran</CardTitle>
              <CardDescription>Vasool kiye gaye kar ka vishleshan</CardDescription>
            </CardHeader>
            <CardContent>
              {gstLoading ? <div className="py-8 text-center">Loading...</div> : gstReport ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-gray-500">Kul Karobar (Taxable Sales)</div>
                    <div className="text-2xl font-bold">{formatINR(gstReport.totalSales)}</div>
                    <div className="text-xs text-gray-400">{gstReport.transactionCount} transactions</div>
                  </div>
                  <div className="p-4 border rounded-lg bg-gray-50">
                    <div className="text-sm text-gray-500">CGST (Kendriya GST)</div>
                    <div className="text-2xl font-bold">{formatINR(gstReport.totalCgst)}</div>
                  </div>
                  <div className="p-4 border rounded-lg bg-gray-50">
                    <div className="text-sm text-gray-500">SGST (Rajya GST)</div>
                    <div className="text-2xl font-bold">{formatINR(gstReport.totalSgst)}</div>
                  </div>
                  <div className="p-4 border rounded-lg bg-gray-50">
                    <div className="text-sm text-gray-500">IGST (Entarrajyiya)</div>
                    <div className="text-2xl font-bold">{formatINR(gstReport.totalIgst)}</div>
                  </div>
                  <div className="col-span-full p-4 border rounded-lg bg-primary/5 border-primary/20">
                    <div className="text-sm text-primary font-medium">Kul GST Dayitva (Tax Liability)</div>
                    <div className="text-3xl font-bold text-primary">{formatINR(gstReport.totalTax)}</div>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Shreni-vaar Bikri</CardTitle>
              <CardDescription>Pratek shreni mein kitni bikri hui</CardDescription>
            </CardHeader>
            <CardContent>
              {catLoading ? <div className="py-8 text-center">Loading...</div> : categorySales && categorySales.length > 0 ? (
                <div className="flex flex-col md:flex-row items-center gap-8">
                  <div className="w-full md:w-1/2 h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categorySales}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          fill="#8884d8"
                          paddingAngle={5}
                          dataKey="revenue"
                          nameKey="categoryName"
                        >
                          {categorySales.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip formatter={(val: number) => [formatINR(val), "Aay"]} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="w-full md:w-1/2 space-y-4">
                    {categorySales.map((cat, idx) => (
                      <div key={cat.categoryId} className="flex items-center justify-between border-b pb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                          <span className="font-medium">{cat.categoryName}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">{formatINR(cat.revenue)}</div>
                          <div className="text-xs text-gray-500">{cat.percentage.toFixed(1)}% ({cat.quantitySold} items)</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">Abhi koi bikri nahi hui</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
