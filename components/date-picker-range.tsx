"use client"
import { Calendar } from "lucide-react"
import { Input } from "@/components/ui/input"

export function DatePickerRange() {
  return (
    <div className="flex space-x-2">
      <div className="relative">
        <Input placeholder="Date de début" className="pr-10" />
        <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
      </div>
      <div className="relative">
        <Input placeholder="Date de fin" className="pr-10" />
        <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
      </div>
    </div>
  )
}
