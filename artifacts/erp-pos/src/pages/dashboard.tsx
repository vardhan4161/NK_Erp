import { useGetDashboardStats, useGetSalesByDay, useGetTopProducts, useGetCategorySales } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IndianRupee, ShoppingCart, Package, AlertTriangle, TrendingUp, CreditCard } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from "recharts";
import { formatDate, formatINR } from "@/lib/format";
import { Link } from "wouter";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: salesByDay, isLoading: salesLoading } = useGetSalesByDay({ days: 7 });
  const { data: topProducts, isLoading: topProductsLoading } = useGetTopProducts({ limit: 5 });
  const { data: categorySales, isLoading: categorySalesLoading } = useGetCategorySales({});

  if (statsLoading || salesLoading || topProductsLoading || categorySalesLoading) {
    return <div className="p-6 text-muted-foreground">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Dashboard Overview</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatINR(stats?.todayRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.todaySalesCount} sales today
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Month Revenue</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatINR(stats?.monthRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.monthSalesCount} sales this month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Month Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(stats?.monthProfit ?? 0) < 0 ? "text-red-600" : ""}`}>
              {formatINR(stats?.monthProfit)}
            </div>
            <p className="text-xs text-muted-foreground">
              Expenses: {formatINR(stats?.monthExpenses)}
            </p>
          </CardContent>
        </Card>
        <Card className={stats?.lowStockCount && stats.lowStockCount > 0 ? "border-red-200 bg-red-50/50" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${stats?.lowStockCount && stats.lowStockCount > 0 ? "text-red-500" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats?.lowStockCount && stats.lowStockCount > 0 ? "text-red-600" : ""}`}>
              {stats?.lowStockCount || 0}
            </div>
            <Link href="/inventory" className="text-xs text-blue-600 hover:underline">
              Inventory ki jaankari dekhein
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Rozana Bikri aur Munafa (Pichhle 7 Din)</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={salesByDay}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={(val) => formatDate(val)} />
                  <YAxis tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`} />
                  <RechartsTooltip
                    labelFormatter={(val) => formatDate(val)}
                    formatter={(val: number) => [formatINR(val)]}
                  />
                  <Line type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2} name="Revenue" />
                  <Line type="monotone" dataKey="profit" stroke="#16a34a" strokeWidth={2} name="Profit" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Top Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topProducts?.map((product) => (
                <div key={product.productId} className="flex items-center">
                  <div className="ml-4 space-y-1">
                    <p className="text-sm font-medium leading-none">{product.productName}</p>
                    <p className="text-sm text-muted-foreground">{product.categoryName}</p>
                  </div>
                  <div className="ml-auto text-right">
                    <div className="font-medium">{product.quantitySold} sold</div>
                    <div className="text-xs text-muted-foreground">{formatINR(product.revenue)}</div>
                  </div>
                </div>
              ))}
              {(!topProducts || topProducts.length === 0) && (
                <div className="text-center text-muted-foreground py-4">Koi bikri data nahi mila</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {categorySales && categorySales.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Category-wise Bikri</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categorySales}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="categoryName" />
                  <YAxis tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`} />
                  <RechartsTooltip formatter={(val: number) => [formatINR(val), "Revenue"]} />
                  <Bar dataKey="revenue" fill="#2563eb" radius={[4, 4, 0, 0]}>
                    {categorySales.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
