"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/dashboard/components/ui/card";
import { data } from "../app/types/topProduit";

import {
  BarChart,
  Bar,
  Rectangle,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

// const data = [
//   { name: "Dell XPS 13", value: 45 },
//   { name: "iPhone 14 Pro", value: 38 },
//   { name: "Galaxy S23", value: 32 },
//   { name: "iPad Air M1", value: 28 },
//   { name: "iPad Pro", value: 25 },
// ];

export function TopProductsChart({ data: data }: { data: data[] }) {
  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Top produits</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80 flex flex-col justify-center space-y-6">
          <BarChart
            style={{
              width: "100%",
              maxWidth: "700px",
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
            <XAxis
              dataKey="name"
              stroke="#8884d8"
              angle={-30}
              textAnchor="end"
            />
            <YAxis />
            <Tooltip wrapperStyle={{ width: 100, backgroundColor: "#ccc" }} />
            <Legend
              width={100}
              wrapperStyle={{
                top: 40,
                right: 20,
                backgroundColor: "#f5f5f5",
                border: "1px solid #d5d5d5",
                borderRadius: 3,
                lineHeight: "40px",
              }}
            />
            <CartesianGrid stroke="#ccc" strokeDasharray="3 3" />
            <Bar dataKey="value" fill="#8884d8" barSize={30} />
          </BarChart>
        </div>
      </CardContent>
    </Card>
  );
}
