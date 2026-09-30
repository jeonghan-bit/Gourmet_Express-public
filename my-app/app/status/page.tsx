'use client';

import { useState } from 'react'
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';

// This would typically come from your backend
const initialOrders = [
  { id: 1, customer: "John Doe", items: ["Kung Pao Chicken", "Shrimp Fried Rice"], status: "Preparing" },
  { id: 2, customer: "Jane Smith", items: ["Vegetable Chow Mein", "Sweet and Sour Pork"], status: "Ready for Pickup" },
  { id: 3, customer: "Bob Johnson", items: ["Beef with Broccoli", "Mapo Tofu"], status: "Delivered" },
]

export default function OrderStatusPage() {
  const [orders, setOrders] = useState(initialOrders)
  const [isOwner, setIsOwner] = useState(false) // This would typically be determined by authentication

  const updateOrderStatus = (orderId: string, newStatus: string) => {
    const orderIdNum = Number(orderId);
    setOrders(orders.map(order => 
        order.id === orderIdNum ? { ...order, status: newStatus } : order
    ))
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Order Status</h1>
      <Button onClick={() => setIsOwner(!isOwner)} className="mb-4">
        Toggle Owner View (Demo Only)
      </Button>
      <div className="space-y-4">
        {orders.map((order) => (
          <div key={order.id} className="bg-white p-4 rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold mb-2">Order #{order.id}</h2>
            <p><strong>Customer:</strong> {order.customer}</p>
            <p><strong>Items:</strong> {order.items.join(", ")}</p>
            <div className="flex items-center mt-2">
              <strong className="mr-2">Status:</strong>
              {isOwner ? (
                <FormControl variant="outlined" className="w-[180px]">
                <InputLabel id={`select-label-${order.id}`}>Select status</InputLabel>
                <Select
                    labelId={`select-label-${order.id}`}
                    id={`select-${order.id}`}
                    value={order.status}
                    onChange={(event) => updateOrderStatus(order.id.toString(), event.target.value)}
                    label="Select status"
                >
                    <MenuItem value="Preparing">Preparing</MenuItem>
                    <MenuItem value="Ready for Pickup">Ready for Pickup</MenuItem>
                    <MenuItem value="Out for Delivery">Out for Delivery</MenuItem>
                    <MenuItem value="Delivered">Delivered</MenuItem>
                </Select>
                </FormControl>
              ) : (
                <span>{order.status}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}