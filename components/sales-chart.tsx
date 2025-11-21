"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

export function SalesChart({
  data,
}: {
  data: any[];
  loading: boolean;
  error: any;
}) {
  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          Évolution des ventes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <LineChart
            style={{
              width: "100%",
              maxWidth: "700px",
              height: "100%",
              maxHeight: "70vh",
              aspectRatio: 1.618,
            }}
            responsive
            data={data}
            margin={{
              top: 5,
              right: 0,
              left: 0,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" angle={-45} textAnchor="end" />
            <YAxis width="auto" />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="sales"
              stroke="#8884d8"
              activeDot={{ r: 8 }}
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="orders"
              stroke="#82ca9d"
              activeDot={{ r: 6 }}
              strokeWidth={2}
            />
          </LineChart>
        </div>
      </CardContent>
    </Card>
  );
}
